import { Op } from "sequelize";
import { BaseRepository } from "../../../core/models/base.repository.ts";
import UserReward from "./user-reward.model.ts";

class UserRewardRepository extends BaseRepository<UserReward> {
  constructor() {
    super(UserReward);
  }

  exists(userId: string, rewardId: string): Promise<UserReward | null> {
    return this.findOne({ user_id: userId, reward_id: rewardId });
  }

  listByUser(userId: string, status?: string) {
    return this.findWhere(
      status ? { user_id: userId, status } : { user_id: userId }
    );
  }

  expiredGranted(now: Date): Promise<UserReward[]> {
    return this.findWhere({
      status: "GRANTED",
      expires_at: { [Op.ne]: null, [Op.lt]: now },
    });
  }
}

export default new UserRewardRepository();
