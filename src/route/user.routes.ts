import { Router } from "express";
import { paginateUsers } from "../modules/user/controller/user.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { role } from "../middlewares/role.middleware.ts";

const router = Router();

router.get("/paginate", auth, role("ADMIN"), paginateUsers);

export default router;
