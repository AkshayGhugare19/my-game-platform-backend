import {
  bearer,
  conflict,
  ok,
  op,
  pathParam,
  PathsObject,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Rewards";

export const rewardTag = {
  name: TAG,
  description: "Player reward ledger & catalog",
};

export const rewardPaths: PathsObject = {
  "/api/rewards": {
    get: op({
      tags: [TAG],
      summary: "My reward ledger",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/rewards/catalog": {
    get: op({
      tags: [TAG],
      summary: "Reward catalog",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/rewards/{id}/claim": {
    post: op({
      tags: [TAG],
      summary: "Claim a granted reward",
      security: bearer(),
      parameters: [pathParam("id")],
      responses: {
        "200": ok("Claimed"),
        "401": unauthorized(),
        "409": conflict("Not claimable"),
      },
    }),
  },
};
