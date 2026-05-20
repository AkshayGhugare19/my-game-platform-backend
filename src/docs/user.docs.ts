import {
  bearer,
  forbidden,
  ok,
  op,
  PathsObject,
  queryParam,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Users";

export const userTag = {
  name: TAG,
  description: "User administration",
};

export const userPaths: PathsObject = {
  "/api/users/paginate": {
    get: op({
      tags: [TAG],
      summary: "Paginated users (admin)",
      security: bearer(),
      parameters: [
        queryParam("page", { type: "integer", minimum: 1, default: 1 }),
        queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 10 }),
      ],
      responses: {
        "200": ok(),
        "401": unauthorized(),
        "403": forbidden(),
      },
    }),
  },
};
