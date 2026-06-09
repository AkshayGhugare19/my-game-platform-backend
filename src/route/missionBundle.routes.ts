import { Router } from "express";
import {
  getMyBundles,
  getOne,
} from "../modules/missionBundle/controller/missionBundle.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyBundles);
router.get("/:id", auth, getOne);

export default router;
