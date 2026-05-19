import { BaseRepository } from "../../../core/models/base.repository.ts";
import UserAchievement from "./user-achievement.model.ts";

class UserAchievementRepository extends BaseRepository<UserAchievement> {
  constructor() {
    super(UserAchievement);
  }

  exists(
    userId: string,
    achievementId: string
  ): Promise<UserAchievement | null> {
    return this.findOne({ user_id: userId, achievement_id: achievementId });
  }

  listByUser(userId: string): Promise<UserAchievement[]> {
    return this.findWhere({ user_id: userId });
  }
}

export default new UserAchievementRepository();
