import { Router } from "express";
import {
  postActivity,
  getGameHistory,
} from "../modules/activity/controller/activity.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { rateLimiter } from "../middlewares/rateLimit.middleware.ts";
import {
  recordActivitySchema,
  paginationSchema,
} from "../validations/activity.validation.ts";

const router = Router();

/**
 * @swagger
 * /api/activity:
 *   post:
 *     summary: Record an activity — drives XP → level → rank → missions → rewards
 *     tags: [Activity]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example: { type: GAME_PLAY, gameId: slot-1, idempotencyKey: play-abc-001 }
 *     responses: { 201: { description: Activity recorded + engine summary }, 429: { description: Rate limited } }
 */
router.post( "/", rateLimiter("activity", { windowMs: 60_000, max: 120 }), auth, validate(recordActivitySchema), postActivity );

/**
 * @swagger
 * /api/activity/game-history:
 *   get: { summary: Paginated activity history, tags: [Activity], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get( "/game-history",  auth,  validate(paginationSchema, "query"), getGameHistory );

export default router;
