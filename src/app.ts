import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import env from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./route/auth.routes";
import activityRoutes from "./route/activity.routes";
import missionRoutes from "./route/mission.routes";
import rewardRoutes from "./route/reward.routes";
import leaderboardRoutes from "./route/leaderboard.routes";
import notificationRoutes from "./route/notification.routes";
import userRoutes from "./route/user.routes";
import profileRoutes from "./route/profile.routes";
import {
  levelsRouter,
  ranksRouter,
  xpRouter,
} from "./route/config.routes";
import {
  achievementsRouter,
  auditRouter,
} from "./route/misc.routes";

const app = express();

// ─── Security & utils ──────────────────────────────────────────────
app.use(helmet());
// If CORS_ORIGINS is set, use it as an allow-list; otherwise reflect the
// request origin (allows any site, still compatible with credentials).
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
    credentials: true,
  })
);
app.use(morgan(env.isProd ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health ────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "Server is running" })
);

// ─── Swagger ───────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/levels", levelsRouter);
app.use("/api/ranks", ranksRouter);
app.use("/api/xp", xpRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/audit", auditRouter);

// ─── 404 + global error handler ────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use(errorHandler);

export default app;
