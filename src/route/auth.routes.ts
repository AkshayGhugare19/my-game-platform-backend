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

/**
 * @swagger
 * tags: [{ name: Auth }]
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (auto-onboards a gamification profile)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example: { first_name: John, last_name: Doe, email: john@example.com, mobile: "9876543210", password: secret123 }
 *     responses: { 201: { description: Registered }, 409: { description: Duplicate }, 422: { description: Validation } }
 */
router.post(
  "/register",
  tight,
  validate(registerSchema),
  audit("REGISTER", "user"),
  register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login → access + refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content: { application/json: { example: { email: admin@test.com, password: "123456" } } }
 *     responses: { 200: { description: OK }, 401: { description: Invalid credentials } }
 */
router.post("/login", tight, validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate refresh token (reuse detection)
 *     tags: [Auth]
 *     responses: { 200: { description: New token pair }, 401: { description: Invalid/revoked } }
 */
router.post("/refresh", tight, validate(refreshSchema), refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post: { summary: Revoke a refresh token, tags: [Auth], responses: { 200: { description: OK } } }
 */
router.post("/logout", validate(refreshSchema), logout);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post: { summary: Reset password, tags: [Auth], responses: { 200: { description: OK } } }
 */
router.post(
  "/reset-password",
  tight,
  validate(resetPasswordSchema),
  audit("RESET_PASSWORD", "user"),
  resetPassword
);

/**
 * @swagger
 * /api/auth/me:
 *   get: { summary: Current user + gamification profile, tags: [Auth], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get("/me", auth, me);

export default router;
