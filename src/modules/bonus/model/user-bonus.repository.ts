import { BaseRepository } from "../../../core/models/base.repository.ts";
import UserBonus from "./user-bonus.model.ts";
import type { UserBonusSource } from "./user-bonus.model.ts";

class UserBonusRepository extends BaseRepository<UserBonus> {
  constructor() {
    super(UserBonus);
  }

  /** Idempotency pre-check: has this exact (bonus, source) already been granted? */
  existsGrant(
    userId: string,
    bonusId: string,
    sourceType: UserBonusSource,
    sourceId: string
  ): Promise<UserBonus | null> {
    return this.findOne({
      user_id: userId,
      bonus_id: bonusId,
      source_type: sourceType,
      source_id: sourceId,
    });
  }

  listByUser(userId: string, status?: string): Promise<UserBonus[]> {
    return this.findWhere(
      status ? { user_id: userId, status } : { user_id: userId }
    );
  }

  pendingCount(userId: string): Promise<number> {
    return this.count({ user_id: userId, status: "PENDING" });
  }
}

export default new UserBonusRepository();
