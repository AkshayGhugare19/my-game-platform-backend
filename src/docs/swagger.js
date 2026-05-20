const j2s = require("joi-to-swagger");
const def = (mod) => mod.default || mod;

const ROUTE_GROUPS = [
  { prefix: "/api/auth", tag: "Auth", router: def(require("../route/auth.routes")) },
  { prefix: "/api/users", tag: "Users", router: def(require("../route/user.routes")) },
  { prefix: "/api/profile", tag: "Profile", router: def(require("../route/profile.routes")) },
  { prefix: "/api/activity", tag: "Activity", router: def(require("../route/activity.routes")) },
  { prefix: "/api/missions", tag: "Missions", router: def(require("../route/mission.routes")) },
  { prefix: "/api/rewards", tag: "Rewards", router: def(require("../route/reward.routes")) },
  { prefix: "/api/leaderboard", tag: "Leaderboard", router: def(require("../route/leaderboard.routes")) },
  { prefix: "/api/notifications", tag: "Notifications", router: def(require("../route/notification.routes")) },
  { prefix: "/api/levels", tag: "Config", router: require("../route/config.routes").levelsRouter },
  { prefix: "/api/ranks", tag: "Config", router: require("../route/config.routes").ranksRouter },
  { prefix: "/api/xp", tag: "Config", router: require("../route/config.routes").xpRouter },
  { prefix: "/api/achievements", tag: "Achievements", router: require("../route/misc.routes").achievementsRouter },
  { prefix: "/api/audit", tag: "Audit", router: require("../route/misc.routes").auditRouter },
];

function expressPathToOpenApi(p) {
  const converted = p.replace(/:(\w+)/g, "{$1}");
  return converted.length > 1 ? converted.replace(/\/$/, "") : converted;
}

function pathParameters(routePath) {
  return [...routePath.matchAll(/:(\w+)/g)].map(([, name]) => ({
    in: "path",
    name,
    required: true,
    schema:
      name === "id"
        ? { type: "string", format: "uuid" }
        : { type: "string" },
  }));
}

function queryParametersFromJoi(joiSchema) {
  const { swagger } = j2s(joiSchema);
  const required = new Set(swagger.required || []);
  return Object.entries(swagger.properties || {}).map(([name, schema]) => ({
    in: "query",
    name,
    required: required.has(name),
    schema,
  }));
}

function inspectRoute(route) {
  let joiBody = null;
  let joiQuery = null;
  let requiredRoles = null;
  let requiresAuth = false;
  for (const layer of route.stack) {
    const fn = layer.handle;
    if (!fn) continue;
    if (fn.__joiBody) {
      if (fn.__joiProperty === "query") joiQuery = fn.__joiBody;
      else joiBody = fn.__joiBody;
    }
    if (fn.__requiredRoles) requiredRoles = fn.__requiredRoles;
    if (fn.__requiresAuth) requiresAuth = true;
  }
  return { joiBody, joiQuery, requiredRoles, requiresAuth };
}


const VERB_BY_METHOD = {
  get: "Get",
  post: "Create",
  put: "Update",
  patch: "Update",
  delete: "Delete",
};

// Tries to produce a readable summary from method + path. e.g.
//   GET    /me                    → "Get me"
//   GET    /                      → "List Missions"      (uses tag)
//   POST   /:id/claim             → "Claim mission"
//   DELETE /:id                   → "Delete config"
function autoSummary(method, routePath, tag) {
  const segments = routePath
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith(":"));
  const singular = tag.toLowerCase().replace(/s$/, "");
  if (segments.length === 0) {
    if (method === "get" && !routePath.includes(":")) return `List ${tag}`;
    return `${VERB_BY_METHOD[method]} ${singular}`;
  }
  const action = segments[segments.length - 1].replace(/-/g, " ");
  if (segments.length === 1 && !routePath.includes(":")) {
    return `${VERB_BY_METHOD[method]} ${action}`;
  }
  return `${action.charAt(0).toUpperCase() + action.slice(1)} ${singular}`;
}


function buildOperation({
  method,
  routePath,
  tag,
  joiBody,
  joiQuery,
  requiredRoles,
  requiresAuth,
  override,
}) {
  const op = {
    tags: [tag],
    summary: override?.summary || autoSummary(method, routePath, tag),
    parameters: pathParameters(routePath),
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
          },
        },
      },
    },
  };

  if (override?.description) op.description = override.description;

  if (joiQuery) op.parameters.push(...queryParametersFromJoi(joiQuery));
  if (override?.queryParameters) op.parameters.push(...override.queryParameters);

  if (requiresAuth) {
    op.security = [{ bearerAuth: [] }];
    op.responses[401] = { $ref: "#/components/responses/Unauthorized" };
  }

  if (requiredRoles) {
    op.responses[403] = { $ref: "#/components/responses/Forbidden" };
  }

  if (op.parameters.some((p) => p.in === "path")) {
    op.responses[404] = { $ref: "#/components/responses/NotFound" };
  }

  if (joiBody && ["post", "put", "patch"].includes(method)) {
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: j2s(joiBody).swagger } },
    };
    op.responses[422] = { $ref: "#/components/responses/ValidationError" };
  }

  if (override?.responseSchema) {
    op.responses[200] = {
      description: override.responseDescription || "OK",
      content: {
        "application/json": {
          schema: {
            allOf: [
              { $ref: "#/components/schemas/ApiResponse" },
              { type: "object", properties: { data: override.responseSchema } },
            ],
          },
        },
      },
    };
  }

  if (override?.responses) Object.assign(op.responses, override.responses);

  return op;
}


function buildPaths() {
  const paths = {};
  const tagSet = new Set();

  for (const { prefix, tag, router } of ROUTE_GROUPS) {
    tagSet.add(tag);
    const overrides = router.docs || {};

    for (const layer of router.stack) {
      if (!layer.route) continue;
      const route = layer.route;
      const meta = inspectRoute(route);
      const fullPath = expressPathToOpenApi(prefix + route.path);
      paths[fullPath] = paths[fullPath] || {};

      const methods = Object.keys(route.methods).filter((m) => route.methods[m]);
      for (const method of methods) {
        const overrideKey = `${method.toUpperCase()} ${route.path}`;
        const override = overrides[overrideKey];
        paths[fullPath][method] = buildOperation({
          method,
          routePath: route.path,
          tag,
          ...meta,
          override,
        });
      }
    }
  }

  return { paths, tags: [...tagSet].map((name) => ({ name })) };
}

function buildServers() {
  const servers = [];
  const publicUrl = process.env.PUBLIC_API_URL;
  const renderUrl = process.env.RENDER_EXTERNAL_URL;

  if (publicUrl) {
    servers.push({
      url: publicUrl.replace(/\/$/, ""),
      description: "Configured",
    });
  } else if (renderUrl) {
    servers.push({
      url: renderUrl.replace(/\/$/, ""),
      description: "Render",
    });
  }
  const port = process.env.PORT || "5001";
  servers.push({ url: `http://localhost:${port}`, description: "Local dev" });
  return servers;
}

const { paths, tags } = buildPaths();

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Gamify Engage API",
    version: "1.0.0",
    description:
      "Gamification platform — auth, XP, levels, ranks, missions, rewards, leaderboards, realtime notifications. " +
      "Authentication uses a Bearer JWT in the `Authorization` header (obtain it from `POST /api/auth/login`). " +
      "This spec is auto-derived from the Express routers — see src/docs/swagger.js.",
  },
  servers: buildServers(),
  tags,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token from POST /api/auth/login",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {},
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errors: {},
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Malformed request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      ValidationError: {
        description: "Validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      Unauthorized: {
        description: "Missing or invalid JWT",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      Forbidden: {
        description: "Authenticated but lacking the required role",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
  },
  paths,
};

module.exports = { spec };
