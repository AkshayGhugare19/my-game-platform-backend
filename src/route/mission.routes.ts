import { Router } from "express";
import {
  getMyMissions,
  getCatalog,
  claim,
} from "../modules/mission/controller/mission.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyMissions);
router.get("/catalog", auth, getCatalog);
router.post("/:id/claim", auth, claim);

export default router;
