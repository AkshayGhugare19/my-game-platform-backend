import {
  bearer,
  created,
  jsonBody,
  obj,
  ok,
  op,
  PathsObject,
  queryParam,
  tooManyRequests,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Activity";

export const activityTag = {
  name: TAG,
  description: "Player activity ingestion (drives XP → level → rank → missions → rewards)",
};

export const activityPaths: PathsObject = {
  "/api/activity": {
    post: op({
      tags: [TAG],
      summary: "Record an activity — drives XP → level → rank → missions → rewards",
      security: bearer(),
      requestBody: jsonBody(
        obj(
          {
            type: {
              type: "string",
              enum: ["GAME_PLAY", "BET_PLACE", "LOGIN"],
              example: "GAME_PLAY",
            },
            gameId: { type: "string", nullable: true, example: "slot-1" },
            amount: { type: "number", minimum: 0 },
            idempotencyKey: { type: "string", example: "play-abc-001" },
            meta: { type: "object", additionalProperties: true },
          },
          ["type", "idempotencyKey"]
        )
      ),
      responses: {
        "201": created("Activity recorded + engine summary"),
        "401": unauthorized(),
        "429": tooManyRequests(),
      },
    }),
  },
  "/api/activity/game-history": {
    get: op({
      tags: [TAG],
      summary: "Paginated activity history",
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
