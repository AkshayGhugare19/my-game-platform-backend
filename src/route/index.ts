import { Router } from "express";

import authRoutes from "./auth.routes.ts";
import activityRoutes from "./activity.routes.ts";
import missionRoutes from "./mission.routes.ts";
import rewardRoutes from "./reward.routes.ts";
import leaderboardRoutes from "./leaderboard.routes.ts";
import notificationRoutes from "./notification.routes.ts";
import userRoutes from "./user.routes.ts";
import profileRoutes from "./profile.routes.ts";
import { levelsRouter, ranksRouter, xpRouter } from "./config.routes.ts";
import { achievementsRouter, auditRouter } from "./misc.routes.ts";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) =>
  res.json({ success: true, message: "Server is running" })
);

apiRouter.use("/auth", authRoutes);
apiRouter.use("/activity", activityRoutes);
apiRouter.use("/missions", missionRoutes);
apiRouter.use("/rewards", rewardRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/levels", levelsRouter);
apiRouter.use("/ranks", ranksRouter);
apiRouter.use("/xp", xpRouter);
apiRouter.use("/achievements", achievementsRouter);
apiRouter.use("/audit", auditRouter);

export default apiRouter;
