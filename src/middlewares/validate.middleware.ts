import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

export const validate =
  (schema: ObjectSchema, property: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
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
