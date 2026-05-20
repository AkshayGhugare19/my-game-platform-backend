import { bearer, ok, op, PathsObject, unauthorized } from "./_helpers.ts";

const TAG = "Achievements";

export const achievementTag = {
  name: TAG,
  description: "Player achievements",
};

export const achievementPaths: PathsObject = {
  "/api/achievements": {
    get: op({
      tags: [TAG],
      summary: "My achievements",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/achievements/catalog": {
    get: op({
      tags: [TAG],
      summary: "Achievement catalog",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
};
