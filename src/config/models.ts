/**
 * Imports every model once so Sequelize registers them before
 * associations / sync / server boot. Called from server.ts and syncDb.ts.
 */
import "../modules/user/model/user.model";
import "../modules/auth/model/refresh-token.model";
import "../modules/level/model/level-tier.model";
import "../modules/rank/model/rank-tier.model";
import "../modules/xp/model/xp-rule.model";
import "../modules/xp/model/xp-history.model";
import "../modules/activity/model/activity-log.model";
import "../modules/mission/model/mission.model";
import "../modules/mission/model/user-mission.model";
import "../modules/reward/model/reward.model";
import "../modules/reward/model/user-reward.model";
import "../modules/achievement/model/achievement.model";
import "../modules/achievement/model/user-achievement.model";
import "../modules/notification/model/notification.model";
import "../modules/audit/model/audit-log.model";

export const registerModels = (): void => {
  /* side-effect imports above register all models */
};
