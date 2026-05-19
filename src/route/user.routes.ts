import { Router } from "express";
import { paginateUsers } from "../modules/user/controller/user.controller";
import { auth } from "../middlewares/auth.middleware";
import { role } from "../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /api/users/paginate:
 *   get: { summary: Paginated users (admin), tags: [Users], security: [{ bearerAuth: [] }], responses: { 200: { description: OK }, 403: { description: Forbidden } } }
 */
router.get("/paginate", auth, role("ADMIN"), paginateUsers);

export default router;
