import { Op, fn, col, where as sqWhere, literal } from "sequelize";
import { BaseRepository } from "../../../core/models/base.repository.ts";
import XpHistory from "./xp-history.model.ts";

class XpHistoryRepository extends BaseRepository<XpHistory> {
  constructor() {
    super(XpHistory);
  }

  existsByIdempotencyKey(key: string): Promise<XpHistory | null> {
    return this.findOne({ idempotency_key: key });
  }

  /** XP already awarded today for a rule (for daily_cap enforcement, UTC day). */
  async sumTodayByRule(userId: string, ruleCode: string): Promise<number> {
    const row = (await XpHistory.findOne({
      attributes: [[fn("COALESCE", fn("SUM", col("xp_amount")), 0), "total"]],
      where: {
        user_id: userId,
        rule_code: ruleCode,
        [Op.and]: sqWhere(
          fn("date", col("created_at")),
          literal("CURRENT_DATE")
        ),
      },
      raw: true,
    })) as unknown as { total: string } | null;
    return Number(row?.total ?? 0);
  }

  listByUser(userId: string, page: number, limit: number) {
    return this.paginate(page, limit, { user_id: userId });
  }
}

export default new XpHistoryRepository();
