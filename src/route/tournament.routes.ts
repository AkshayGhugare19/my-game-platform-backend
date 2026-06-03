import { Router } from "express";
import {
  getMyTournaments,
  getHistory,
  getOne,
  submitScore,
} from "../modules/tournament/controller/tournament.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyTournaments);
// `/history` must precede `/:id` so it isn't captured as an id.
router.get("/history", auth, getHistory);
router.get("/:id", auth, getOne);
router.post("/:id/score", auth, submitScore);

export default router;
