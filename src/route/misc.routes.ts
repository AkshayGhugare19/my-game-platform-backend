import { Router } from "express";
import type { Request, Response } from "express";
import { successResponse, errorResponse } from "../utils/responseHandler.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { role } from "../middlewares/role.middleware.ts";
import type { AuthRequest } from "../types/request.type.ts";
import AchievementRepository from "../modules/achievement/model/achievement.repository.ts";
import UserAchievementRepository from "../modules/achievement/model/user-achievement.repository.ts";
import AuditLogRepository from "../modules/audit/model/audit-log.repository.ts";

/* ── Achievements ───────────────────────────────────────────────── */
const achievements = Router();
/**
 * @swagger
 * /api/achievements:
 *   get: { summary: My achievements, tags: [Achievements], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/achievements/catalog:
 *   get: { summary: Achievement catalog, tags: [Achievements], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
achievements.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    successResponse(
      res,
      200,
      "My achievements",
      await UserAchievementRepository.listByUser(req.user!.id)
    );
  } catch {
    errorResponse(res, 500, "Failed to load achievements");
  }
});
achievements.get("/catalog", auth, async (_req: Request, res: Response) => {
  try {
    successResponse(res, 200, "Catalog", await AchievementRepository.findAll());
  } catch {
    errorResponse(res, 500, "Failed to load catalog");
  }
});

/* ── Audit log (admin) ──────────────────────────────────────────── */
const auditR = Router();
/**
 * @swagger
 * /api/audit:
 *   get: { summary: Audit log (admin), tags: [Audit], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 403: { description: Forbidden } } }
 */
auditR.get("/", auth, role("ADMIN"), async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    successResponse(
      res,
      200,
      "Audit log",
      await AuditLogRepository.paginate(page, limit)
    );
  } catch {
    errorResponse(res, 500, "Failed to load audit log");
  }
});

export { achievements as achievementsRouter, auditR as auditRouter };
