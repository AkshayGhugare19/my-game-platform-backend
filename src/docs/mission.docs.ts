import {
  bearer,
  conflict,
  ok,
  op,
  pathParam,
  PathsObject,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Missions";

export const missionTag = {
  name: TAG,
  description: "Player missions & catalog",
};

export const missionPaths: PathsObject = {
  "/api/missions": {
    get: op({
      tags: [TAG],
      summary: "My missions with progress",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/missions/catalog": {
    get: op({
      tags: [TAG],
      summary: "Active mission catalog",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/missions/{id}/claim": {
    post: op({
      tags: [TAG],
      summary: "Claim a completed mission",
      security: bearer(),
      parameters: [pathParam("id")],
      responses: {
        "200": ok("Claimed"),
        "401": unauthorized(),
        "409": conflict("Not completed"),
      },
    }),
  },
};
