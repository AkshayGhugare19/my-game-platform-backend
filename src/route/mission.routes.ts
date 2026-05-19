import { Router } from "express";
import {
  getMyMissions,
  getCatalog,
  claim,
} from "../modules/mission/controller/mission.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/missions:
 *   get: { summary: My missions with progress, tags: [Missions], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/missions/catalog:
 *   get: { summary: Active mission catalog, tags: [Missions], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/missions/{id}/claim:
 *   post: { summary: Claim a completed mission, tags: [Missions], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 409: { description: Not completed } } }
 */
router.get("/", auth, getMyMissions);
router.get("/catalog", auth, getCatalog);
router.post("/:id/claim", auth, claim);

export default router;
