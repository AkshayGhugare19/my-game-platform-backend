import type { Response, NextFunction, RequestHandler } from "express";
import type { AuthRequest } from "../types/request.type.ts";

export type RoleHandler = RequestHandler & { __requiredRoles?: string[] };

export const role = (...roles: string[]): RoleHandler => {
  const handler: RoleHandler = (req, res, next): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions",
      });
      return;
    }
    next();
  };
  handler.__requiredRoles = roles;
  return handler;
};
