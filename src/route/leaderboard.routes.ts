import { Router } from "express";
import {
  getGlobal,
  getWeekly,
  getMonthly,
  getMe,
} from "../modules/leaderboard/controller/leaderboard.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/leaderboard/global:
 *   get: { summary: Global leaderboard (includes my rank), tags: [Leaderboard], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/leaderboard/weekly:
 *   get: { summary: Weekly leaderboard, tags: [Leaderboard], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/leaderboard/monthly:
 *   get: { summary: Monthly leaderboard, tags: [Leaderboard], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/leaderboard/me:
 *   get: { summary: My positions across boards, tags: [Leaderboard], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get("/global", auth, getGlobal);
router.get("/weekly", auth, getWeekly);
router.get("/monthly", auth, getMonthly);
router.get("/me", auth, getMe);

export default router;
