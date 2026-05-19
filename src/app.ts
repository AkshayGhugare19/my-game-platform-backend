import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import env from "./config/env.ts";
import { swaggerSpec } from "./config/swagger.ts";
import { errorHandler } from "./middlewares/error.middleware.ts";

import authRoutes from "./route/auth.routes.ts";
import activityRoutes from "./route/activity.routes.ts";
import missionRoutes from "./route/mission.routes.ts";
import rewardRoutes from "./route/reward.routes.ts";
import leaderboardRoutes from "./route/leaderboard.routes.ts";
import notificationRoutes from "./route/notification.routes.ts";
import userRoutes from "./route/user.routes.ts";
import profileRoutes from "./route/profile.routes.ts";
import {
  levelsRouter,
  ranksRouter,
  xpRouter,
} from "./route/config.routes.ts";
import {
  achievementsRouter,
  auditRouter,
} from "./route/misc.routes.ts";
import { initAssociations } from "./config/associations.ts";

dotenv.config();

const app = express();

// ─── Security & utils ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initAssociations();


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
