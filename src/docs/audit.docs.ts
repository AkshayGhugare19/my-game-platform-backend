import {
  bearer,
  forbidden,
  ok,
  op,
  PathsObject,
  queryParam,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Audit";

export const auditTag = {
  name: TAG,
  description: "Admin audit log",
};

export const auditPaths: PathsObject = {
  "/api/audit": {
    get: op({
      tags: [TAG],
      summary: "Audit log (admin)",
      security: bearer(),
      parameters: [
        queryParam("page", { type: "integer", minimum: 1, default: 1 }),
        queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
      ],
      responses: {
        "200": ok(),
        "401": unauthorized(),
        "403": forbidden(),
      },
    }),
  },
};
