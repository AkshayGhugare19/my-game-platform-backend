import { Router } from "express";
import {
  list,
  count,
  readOne,
  readAll,
} from "../modules/notification/controller/notification.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, list);
router.get("/unread-count", auth, count);
router.patch("/read-all", auth, readAll);
router.patch("/:id/read", auth, readOne);

export default router;
