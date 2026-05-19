import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/request.type.ts";
import { recordAudit } from "../modules/audit/service/audit.service.ts";

/**
 * Records an audit row for mutating routes after a successful response.
 * Non-blocking: audit failure must never break the request.
 */
export const audit =
  (action: string, entity: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        void recordAudit({
          actorId: req.user?.id ?? null,
          action,
          entity,
          entityId: String(req.params.id ?? req.body?.id ?? ""),
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          after: req.body ?? null,
        });
      }
    });
    next();
  };
