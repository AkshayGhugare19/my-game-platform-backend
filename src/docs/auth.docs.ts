import {
  bearer,
  conflict,
  created,
  jsonBody,
  obj,
  ok,
  op,
  PathsObject,
  tooManyRequests,
  unauthorized,
  validationError,
} from "./_helpers.ts";

const TAG = "Auth";

export const authTag = {
  name: TAG,
  description: "Authentication & session management",
};

export const authPaths: PathsObject = {
  "/api/auth/register": {
    post: op({
      tags: [TAG],
      summary: "Register a new user (auto-onboards a gamification profile)",
      requestBody: jsonBody(
        obj(
          {
            first_name: { type: "string", example: "John" },
            last_name: { type: "string", example: "Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            mobile: { type: "string", example: "9876543210" },
            password: { type: "string", format: "password", example: "secret123" },
          },
          ["first_name", "last_name", "email", "mobile", "password"]
        )
      ),
      responses: {
        "201": created("Registered"),
        "409": conflict("Duplicate user"),
        "422": validationError(),
        "429": tooManyRequests(),
      },
    }),
  },
  "/api/auth/login": {
    post: op({
      tags: [TAG],
      summary: "Login → access + refresh tokens",
      requestBody: jsonBody(
        obj(
          {
            email: { type: "string", format: "email", example: "admin@test.com" },
            password: { type: "string", format: "password", example: "123456" },
          },
          ["email", "password"]
        )
      ),
      responses: {
        "200": ok("Token pair issued"),
        "401": unauthorized("Invalid credentials"),
        "429": tooManyRequests(),
      },
    }),
  },
  "/api/auth/refresh": {
    post: op({
      tags: [TAG],
      summary: "Rotate refresh token (reuse detection)",
      requestBody: jsonBody(
        obj({ refreshToken: { type: "string" } }, ["refreshToken"])
      ),
      responses: {
        "200": ok("New token pair"),
        "401": unauthorized("Invalid or revoked refresh token"),
      },
    }),
  },
  "/api/auth/logout": {
    post: op({
      tags: [TAG],
      summary: "Revoke a refresh token",
      requestBody: jsonBody(
        obj({ refreshToken: { type: "string" } }, ["refreshToken"])
      ),
      responses: { "200": ok() },
    }),
  },
  "/api/auth/reset-password": {
    post: op({
      tags: [TAG],
      summary: "Reset password",
      requestBody: jsonBody(
        obj(
          {
            email: { type: "string", format: "email" },
            token: { type: "string", nullable: true },
            new_password: { type: "string", format: "password" },
          },
          ["email", "new_password"]
        )
      ),
      responses: {
        "200": ok("Password updated"),
        "422": validationError(),
        "429": tooManyRequests(),
      },
    }),
  },
  "/api/auth/me": {
    get: op({
      tags: [TAG],
      summary: "Current user + gamification profile",
      security: bearer(),
      responses: {
        "200": ok(),
        "401": unauthorized(),
      },
    }),
  },
};
