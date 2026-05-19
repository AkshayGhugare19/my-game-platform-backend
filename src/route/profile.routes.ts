import { Router } from "express";
import {
  getMyProfile,
  getMyXpHistory,
} from "../modules/profile/controller/profile.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags: [{ name: Profile }]
 * /api/profile:
 *   get: { summary: My gamification profile (XP/level/rank/coins via Hamara Engage), tags: [Profile], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 401: { description: Unauthorized } } }
 * /api/profile/xp/history:
 *   get: { summary: My paginated XP history, tags: [Profile], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 401: { description: Unauthorized } } }
 */
router.get("/", auth, getMyProfile);
router.get("/xp/history", auth, getMyXpHistory);

export default router;
