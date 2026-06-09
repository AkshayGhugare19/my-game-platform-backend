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
// Per-mission actions on the bundle track — declared before "/:id" so the
// literal "missions" segment isn't captured as a bundle id.
router.post("/missions/:id/join", auth, joinMission);
router.post("/missions/:id/claim", auth, claimMission);
router.post("/missions/:id/cancel", auth, cancelMission);
router.get("/:id", auth, getOne);

export default router;
