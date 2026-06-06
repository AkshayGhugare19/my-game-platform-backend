import { Router } from "express";
import {
  getMyMissions,
  getOne,
  join,
  claim,
  cancel,
} from "../modules/mission/controller/mission.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyMissions);
router.get("/:id", auth, getOne);
router.post("/:id/join", auth, join);
router.post("/:id/claim", auth, claim);
router.post("/:id/cancel", auth, cancel);

export default router;
