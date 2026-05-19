/**
 * Imports every model once so Sequelize registers them before
 * associations / sync / server boot. Called from server.ts and syncDb.ts.
 */
import "../modules/user/model/user.model.ts";
import "../modules/auth/model/refresh-token.model.ts";
import "../modules/level/model/level-tier.model.ts";
import "../modules/rank/model/rank-tier.model.ts";
import "../modules/xp/model/xp-rule.model.ts";
import "../modules/xp/model/xp-history.model.ts";
import "../modules/activity/model/activity-log.model.ts";
import "../modules/mission/model/mission.model.ts";
import "../modules/mission/model/user-mission.model.ts";
import "../modules/reward/model/reward.model.ts";
import "../modules/reward/model/user-reward.model.ts";
import "../modules/achievement/model/achievement.model.ts";
import "../modules/achievement/model/user-achievement.model.ts";
import "../modules/notification/model/notification.model.ts";
import "../modules/audit/model/audit-log.model.ts";

export const registerModels = (): void => {
  /* side-effect imports above register all models */
};
