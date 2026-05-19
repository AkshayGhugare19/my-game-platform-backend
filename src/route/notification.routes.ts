import { Router } from "express";
import {
  list,
  count,
  readOne,
  readAll,
} from "../modules/notification/controller/notification.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get: { summary: List notifications, tags: [Notifications], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/notifications/unread-count:
 *   get: { summary: Unread badge count, tags: [Notifications], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get("/", auth, list);
router.get("/unread-count", auth, count);
router.patch("/read-all", auth, readAll);
router.patch("/:id/read", auth, readOne);

export default router;
