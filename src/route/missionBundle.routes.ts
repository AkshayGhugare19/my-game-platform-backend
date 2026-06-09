import { Router } from "express";
import {
  getMyBundles,
  getOne,
  joinMission,
  claimMission,
  cancelMission,
} from "../modules/missionBundle/controller/missionBundle.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyBundles);
// Per-mission actions, scoped to a bundle's own track (bundleId + missionId).
// Declared before "/:id" so these multi-segment paths take precedence.
router.post("/:bundleId/missions/:missionId/join", auth, joinMission);
router.post("/:bundleId/missions/:missionId/claim", auth, claimMission);
router.post("/:bundleId/missions/:missionId/cancel", auth, cancelMission);
router.get("/:id", auth, getOne);

export default router;
