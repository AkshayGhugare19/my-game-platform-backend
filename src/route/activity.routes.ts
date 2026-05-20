import { Router } from "express";
import {
  postActivity,
  getGameHistory,
} from "../modules/activity/controller/activity.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { rateLimiter } from "../middlewares/rateLimit.middleware.ts";
import {
  recordActivitySchema,
  paginationSchema,
} from "../validations/activity.validation.ts";

const router = Router();

router.post(
  "/",
  rateLimiter("activity", { windowMs: 60_000, max: 120 }),
  auth,
  validate(recordActivitySchema),
  postActivity
);
router.get(
  "/game-history",
  auth,
  validate(paginationSchema, "query"),
  getGameHistory
);

export default router;
