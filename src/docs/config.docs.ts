import {
  bearer,
  forbidden,
  jsonBody,
  notFound,
  obj,
  ok,
  op,
  pathParam,
  PathsObject,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Config";

export const configTag = {
  name: TAG,
  description: "Levels, ranks, XP rules & admin grants",
};

export const configPaths: PathsObject = {
  "/api/levels": {
    get: op({
      tags: [TAG],
      summary: "List configured levels",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/ranks": {
    get: op({
      tags: [TAG],
      summary: "List configured ranks",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/xp/rules": {
    get: op({
      tags: [TAG],
      summary: "List XP rules (admin)",
      security: bearer(),
      responses: {
        "200": ok(),
        "401": unauthorized(),
        "403": forbidden(),
      },
    }),
    post: op({
      tags: [TAG],
      summary: "Create or update an XP rule (admin)",
      security: bearer(),
      requestBody: jsonBody(
        obj({
          id: { type: "string", format: "uuid" },
          activityType: { type: "string", example: "GAME_PLAY" },
          xp: { type: "integer", minimum: 0, example: 10 },
          coins: { type: "integer", minimum: 0, example: 5 },
          meta: { type: "object", additionalProperties: true },
        })
      ),
      responses: {
        "200": ok("Upserted"),
        "401": unauthorized(),
        "403": forbidden(),
      },
    }),
  },
  "/api/xp/rules/{id}": {
    delete: op({
      tags: [TAG],
      summary: "Delete an XP rule (admin)",
      security: bearer(),
      parameters: [pathParam("id")],
      responses: {
        "200": ok("Deleted"),
        "401": unauthorized(),
        "403": forbidden(),
        "404": notFound("XP rule not found"),
      },
    }),
  },
  "/api/xp/admin/grant": {
    post: op({
      tags: [TAG],
      summary: "Manually grant XP to a player (admin)",
      security: bearer(),
      requestBody: jsonBody(
        obj(
          {
            userId: { type: "string", format: "uuid" },
            xp: { type: "integer", minimum: 1, example: 100 },
            reason: { type: "string", example: "Compensation" },
          },
          ["userId", "xp"]
        )
      ),
      responses: {
        "200": ok("XP granted"),
        "401": unauthorized(),
        "403": forbidden(),
      },
    }),
  },
};
