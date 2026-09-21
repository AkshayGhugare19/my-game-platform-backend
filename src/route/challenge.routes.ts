import { Router } from "express";
import {
  getMyChallenges,
  getOne,
  join,
  cancel,
  getProgress,
  claim,
} from "../modules/challenge/controller/challenge.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyChallenges);
router.get("/:id", auth, getOne);
router.post("/:id/join", auth, join);
router.post("/:id/cancel", auth, cancel);
router.get("/:id/progress", auth, getProgress);
router.post("/:id/claim", auth, claim);

export default router;
