import type { Response } from "express";

export const successResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null
): Response =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errors: unknown = null
): Response =>
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
