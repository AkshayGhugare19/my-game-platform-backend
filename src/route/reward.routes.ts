import { Router } from "express";
import {
  getMyRewards,
  getCatalog,
  claim,
} from "../modules/reward/controller/reward.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyRewards);
router.get("/catalog", auth, getCatalog);
router.post("/:id/claim", auth, claim);

export default router;
