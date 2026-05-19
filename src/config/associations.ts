import User from "../modules/user/model/user.model.ts";
import RefreshToken from "../modules/auth/model/refresh-token.model.ts";
import XpHistory from "../modules/xp/model/xp-history.model.ts";
import ActivityLog from "../modules/activity/model/activity-log.model.ts";
import Mission from "../modules/mission/model/mission.model.ts";
import UserMission from "../modules/mission/model/user-mission.model.ts";
import Reward from "../modules/reward/model/reward.model.ts";
import UserReward from "../modules/reward/model/user-reward.model.ts";
import Achievement from "../modules/achievement/model/achievement.model.ts";
import UserAchievement from "../modules/achievement/model/user-achievement.model.ts";
import Notification from "../modules/notification/model/notification.model.ts";

// Associations register globally on the shared Sequelize models, so this
// must run exactly once. It is invoked from both app.ts and server.ts
// (and syncDb.ts); guard against the duplicate call which otherwise throws
// "You have used the alias <x> in two separate associations".
let associationsInitialized = false;

export const initAssociations = (): void => {
  if (associationsInitialized) return;
  associationsInitialized = true;

  // User → auth / profile
  User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // XP / activity history
  User.hasMany(XpHistory, { foreignKey: "user_id", as: "xpHistory" });
  XpHistory.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(ActivityLog, { foreignKey: "user_id", as: "activity" });
  ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // Missions
  Mission.hasMany(UserMission, { foreignKey: "mission_id", as: "userMissions" });
  UserMission.belongsTo(Mission, { foreignKey: "mission_id", as: "mission" });
  User.hasMany(UserMission, { foreignKey: "user_id", as: "missions" });
  UserMission.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // Rewards
  Reward.hasMany(UserReward, { foreignKey: "reward_id", as: "userRewards" });
  UserReward.belongsTo(Reward, { foreignKey: "reward_id", as: "reward" });
  User.hasMany(UserReward, { foreignKey: "user_id", as: "rewards" });
  UserReward.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // Achievements
  Achievement.hasMany(UserAchievement, {
    foreignKey: "achievement_id",
    as: "userAchievements",
  });
  UserAchievement.belongsTo(Achievement, {
    foreignKey: "achievement_id",
    as: "achievement",
  });
  User.hasMany(UserAchievement, { foreignKey: "user_id", as: "achievements" });
  UserAchievement.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // Notifications
  User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // eslint-disable-next-line no-console
  console.log("✅ Associations initialized");
};
