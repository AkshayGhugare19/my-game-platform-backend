import { Op } from "sequelize";
import RewardPurchase from "./reward-purchase.model.ts";
import type { RewardPurchaseAttributes } from "./reward-purchase.model.ts";

/** A booster row is "live" while ACTIVE and not past its expiry. */
const liveBoosterWhere = (userId: string, now: Date) => ({
  user_id: userId,
  category: "booster" as const,
  status: "ACTIVE" as const,
  [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
});

class RewardPurchaseRepository {
  create(data: Partial<RewardPurchaseAttributes>): Promise<RewardPurchase> {
    return RewardPurchase.create(data as RewardPurchase["_creationAttributes"]);
  }

  listByUser(userId: string): Promise<RewardPurchase[]> {
    return RewardPurchase.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });
  }

  /** Paginated purchase history for one user (newest first). */
  paginateByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ rows: RewardPurchase[]; count: number }> {
    return RewardPurchase.findAndCountAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });
  }

  /** Flip any ACTIVE boosters that have passed their expiry to EXPIRED. */
  async expireStale(userId: string, now: Date): Promise<void> {
    await RewardPurchase.update(
      { status: "EXPIRED" },
      {
        where: {
          user_id: userId,
          category: "booster",
          status: "ACTIVE",
          expires_at: { [Op.ne]: null, [Op.lte]: now },
        },
      }
    );
  }

  activeBoosters(userId: string, now: Date): Promise<RewardPurchase[]> {
    return RewardPurchase.findAll({
      where: liveBoosterWhere(userId, now),
      order: [["created_at", "DESC"]],
    });
  }
}

export default new RewardPurchaseRepository();
