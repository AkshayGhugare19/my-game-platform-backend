/**
 * Shared OpenAPI helpers for the per-module `*.docs.ts` files.
 *
 * The goal is to keep route files free of JSDoc swagger noise. Each
 * module exports a `tag` + `paths` object built with these helpers,
 * and `docs/index.ts` merges them into one spec consumed by
 * `config/swagger.ts`.
 */

export type JsonSchema = Record<string, unknown>;
export type ParameterObject = Record<string, unknown>;
export type ResponseObject = Record<string, unknown>;
export type OperationObject = Record<string, unknown>;
export type PathItemObject = Record<string, OperationObject>;
export type PathsObject = Record<string, PathItemObject>;

/** Bearer JWT security requirement. */
export const bearer = () => [{ bearerAuth: [] }];

/** Object schema with optional `required` field list. */
export const obj = (
  properties: Record<string, JsonSchema>,
  required?: string[]
): JsonSchema => ({
  type: "object",
  properties,
  ...(required && required.length ? { required } : {}),
});

/** Array schema wrapping an item schema. */
export const arr = (items: JsonSchema): JsonSchema => ({
  type: "array",
  items,
});

/** application/json request body. */
export const jsonBody = (schema: JsonSchema, example?: unknown) => ({
  required: true,
  content: {
    "application/json": {
      schema,
      ...(example !== undefined ? { example } : {}),
    },
  },
});

/** Path parameter (always required). */
export const pathParam = (
  name: string,
  schema: JsonSchema = { type: "string" }
): ParameterObject => ({
  in: "path",
  name,
  required: true,
  schema,
});

/** Query parameter (optional unless required: true is passed). */
export const queryParam = (
  name: string,
  schema: JsonSchema = { type: "string" },
  opts: { required?: boolean; description?: string } = {}
): ParameterObject => ({
  in: "query",
  name,
  required: !!opts.required,
  schema,
  ...(opts.description ? { description: opts.description } : {}),
});

const response = (description: string): ResponseObject => ({ description });

export const ok = (description = "OK") => response(description);
export const created = (description = "Created") => response(description);
export const noContent = (description = "No content") => response(description);
export const badRequest = (description = "Bad request") => response(description);
export const unauthorized = (description = "Unauthorized") => response(description);
export const forbidden = (description = "Forbidden") => response(description);
export const notFound = (description = "Not found") => response(description);
export const conflict = (description = "Conflict") => response(description);
export const tooManyRequests = (description = "Too many requests") =>
  response(description);
export const validationError = (description = "Validation error") =>
  response(description);

/**
 * Operation builder. Pass it the bits you want; it just returns the object
 * unchanged. Exists mostly so callsites read like `op({ ... })`, mirroring
 * the OpenAPI nesting and making it grep-friendly.
 */
export const op = (operation: OperationObject): OperationObject => operation;
