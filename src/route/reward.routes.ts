import { Router } from "express";
import {
  getMyRewards,
  getCatalog,
  claim,
} from "../modules/reward/controller/reward.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/rewards:
 *   get: { summary: My reward ledger, tags: [Rewards], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/rewards/catalog:
 *   get: { summary: Reward catalog, tags: [Rewards], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/rewards/{id}/claim:
 *   post: { summary: Claim a granted reward, tags: [Rewards], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 409: { description: Not claimable } } }
 */
router.get("/", auth, getMyRewards);
router.get("/catalog", auth, getCatalog);
router.post("/:id/claim", auth, claim);

export default router;
