import { Router } from "express";
import {
  getMyProfile,
  getMyXpHistory,
} from "../modules/profile/controller/profile.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyProfile);
router.get("/xp/history", auth, getMyXpHistory);

export default router;
