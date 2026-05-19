import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  logger.error("Unhandled error", { name: err?.name, message: err?.message });

  if (err?.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null,
      timestamp: new Date().toISOString(),
    });
  }

  if (err?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "Duplicate value",
      errors: { [err.errors?.[0]?.path]: err.errors?.[0]?.message },
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: null,
    timestamp: new Date().toISOString(),
  });
};
