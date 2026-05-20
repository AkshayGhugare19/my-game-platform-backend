import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ObjectSchema } from "joi";

export type ValidatingHandler = RequestHandler & {
  __joiBody?: ObjectSchema;
  __joiProperty?: "body" | "query" | "params";
};

export const validate = (
  schema: ObjectSchema,
  property: "body" | "query" | "params" = "body"
): ValidatingHandler => {
  const handler: ValidatingHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const formattedErrors: Record<string, string> = {};
      error.details.forEach((err) => {
        formattedErrors[err.path[0] as string] = err.message;
      });
      res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
      return;
    }

    req[property] = value;
    next();
  };

  handler.__joiBody = schema;
  handler.__joiProperty = property;
  return handler;
};
