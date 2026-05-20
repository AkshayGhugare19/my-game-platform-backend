import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { AuthRequest } from "../types/request.type.ts";
import { verifyAccessToken } from "../utils/tokens.ts";

export type AuthHandler = RequestHandler & { __requiresAuth?: boolean };

export const auth: AuthHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthRequest;
  const header = authReq.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const decoded = verifyAccessToken(header.split(" ")[1]);
    authReq.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

auth.__requiresAuth = true;
