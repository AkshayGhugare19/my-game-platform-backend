import {
  bearer,
  ok,
  op,
  PathsObject,
  queryParam,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Profile";

export const profileTag = {
  name: TAG,
  description: "Gamification profile (XP / level / rank / coins via Hamara Engage)",
};

export const profilePaths: PathsObject = {
  "/api/profile": {
    get: op({
      tags: [TAG],
      summary: "My gamification profile (XP/level/rank/coins via Hamara Engage)",
      security: bearer(),
      responses: {
        "200": ok(),
        "401": unauthorized(),
      },
    }),
  },
  "/api/profile/xp/history": {
    get: op({
      tags: [TAG],
      summary: "My paginated XP history",
      security: bearer(),
      parameters: [
        queryParam("page", { type: "integer", minimum: 1, default: 1 }),
        queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 10 }),
      ],
      responses: {
        "200": ok(),
        "401": unauthorized(),
      },
    }),
  },
};
