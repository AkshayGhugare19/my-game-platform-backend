import { bearer, ok, op, PathsObject, unauthorized } from "./_helpers.ts";

const TAG = "Leaderboard";

export const leaderboardTag = {
  name: TAG,
  description: "Global / weekly / monthly leaderboards",
};

export const leaderboardPaths: PathsObject = {
  "/api/leaderboard/global": {
    get: op({
      tags: [TAG],
      summary: "Global leaderboard (includes my rank)",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/leaderboard/weekly": {
    get: op({
      tags: [TAG],
      summary: "Weekly leaderboard",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/leaderboard/monthly": {
    get: op({
      tags: [TAG],
      summary: "Monthly leaderboard",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/leaderboard/me": {
    get: op({
      tags: [TAG],
      summary: "My positions across boards",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
};
