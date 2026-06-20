import { Router } from "express";
import {
  list,
  unreadCount,
  read,
  click,
  unsubscribe,
} from "../modules/inbox/controller/inbox.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, list);
router.get("/unread-count", auth, unreadCount);
router.post("/unsubscribe", auth, unsubscribe);
router.patch("/:id/read", auth, read);
router.patch("/:id/click", auth, click);

export default router;
