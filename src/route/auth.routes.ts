import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  resetPassword,
  me,
} from "../modules/auth/controller/auth.controller.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { rateLimiter } from "../middlewares/rateLimit.middleware.ts";
import { audit } from "../middlewares/audit.middleware.ts";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
} from "../validations/auth.validation.ts";

const router = Router();
const tight = rateLimiter("auth", { windowMs: 15 * 60_000, max: 20 });

router.post(
  "/register",
  tight,
  validate(registerSchema),
  audit("REGISTER", "user"),
  register
);
router.post("/login", tight, validate(loginSchema), login);
router.post("/refresh", tight, validate(refreshSchema), refresh);
router.post("/logout", validate(refreshSchema), logout);
router.post(
  "/reset-password",
  tight,
  validate(resetPasswordSchema),
  audit("RESET_PASSWORD", "user"),
  resetPassword
);
router.get("/me", auth, me);

export default router;
