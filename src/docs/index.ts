/**
 * Central swagger registry — imports the per-module `*.docs.ts` files and
 * merges them into a single OpenAPI spec consumed by `config/swagger.ts`.
 *
 * To document a new module: add `<module>.docs.ts`, then register its tag
 * + paths here. Routes stay free of JSDoc swagger comments.
 */

import { authTag, authPaths } from "./auth.docs.ts";
import { activityTag, activityPaths } from "./activity.docs.ts";
import { profileTag, profilePaths } from "./profile.docs.ts";
import { missionTag, missionPaths } from "./mission.docs.ts";
import { rewardTag, rewardPaths } from "./reward.docs.ts";
import { leaderboardTag, leaderboardPaths } from "./leaderboard.docs.ts";
import { notificationTag, notificationPaths } from "./notification.docs.ts";
import { userTag, userPaths } from "./user.docs.ts";
import { configTag, configPaths } from "./config.docs.ts";
import { achievementTag, achievementPaths } from "./achievement.docs.ts";
import { auditTag, auditPaths } from "./audit.docs.ts";

export const allTags = [
  authTag,
  userTag,
  profileTag,
  activityTag,
  missionTag,
  rewardTag,
  leaderboardTag,
  notificationTag,
  configTag,
  achievementTag,
  auditTag,
];

export const allPaths = {
  ...authPaths,
  ...userPaths,
  ...profilePaths,
  ...activityPaths,
  ...missionPaths,
  ...rewardPaths,
  ...leaderboardPaths,
  ...notificationPaths,
  ...configPaths,
  ...achievementPaths,
  ...auditPaths,
};
