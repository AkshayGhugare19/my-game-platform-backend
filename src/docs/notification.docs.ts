import {
  bearer,
  ok,
  op,
  pathParam,
  PathsObject,
  unauthorized,
} from "./_helpers.ts";

const TAG = "Notifications";

export const notificationTag = {
  name: TAG,
  description: "Realtime notifications",
};

export const notificationPaths: PathsObject = {
  "/api/notifications": {
    get: op({
      tags: [TAG],
      summary: "List notifications",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/notifications/unread-count": {
    get: op({
      tags: [TAG],
      summary: "Unread badge count",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/notifications/read-all": {
    patch: op({
      tags: [TAG],
      summary: "Mark all notifications as read",
      security: bearer(),
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
  "/api/notifications/{id}/read": {
    patch: op({
      tags: [TAG],
      summary: "Mark a notification as read",
      security: bearer(),
      parameters: [pathParam("id")],
      responses: { "200": ok(), "401": unauthorized() },
    }),
  },
};
