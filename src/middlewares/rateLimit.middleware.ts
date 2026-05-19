import rateLimit from "express-rate-limit";
import type { AuthRequest } from "../types/request.type.ts";

/**
 * In-memory limiter (single-instance). Keyed by authenticated user when
 * available, else IP — stops XP farming and credential brute-force
 * (see SECURITY.md). For multi-instance, put a shared store behind this.
 */
export const rateLimiter = (
  _name: string,
  opts: { windowMs: number; max: number }
) =>
  rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      (req as AuthRequest).user?.id || req.ip || "anonymous",
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        message: "Too many requests, please slow down",
        errors: null,
        timestamp: new Date().toISOString(),
      }),
  });
