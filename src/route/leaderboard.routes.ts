import { Router } from "express";
import {
  getGlobal,
  getWeekly,
  getMonthly,
  getMe,
} from "../modules/leaderboard/controller/leaderboard.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/global", auth, getGlobal);
router.get("/weekly", auth, getWeekly);
router.get("/monthly", auth, getMonthly);
router.get("/me", auth, getMe);

export default router;
