import { Op } from "sequelize";
import { BaseRepository } from "../../../core/models/base.repository.ts";
import RankTier from "./rank-tier.model.ts";

class RankTierRepository extends BaseRepository<RankTier> {
  constructor() {
    super(RankTier);
  }

  allOrdered(): Promise<RankTier[]> {
    return this.findAll({ order: [["order", "ASC"]] });
  }

  /** Highest-order rank the (level, xp) qualifies for. */
  highestQualifying(level: number, xp: number): Promise<RankTier | null> {
    return RankTier.findOne({
      where: { min_level: { [Op.lte]: level }, min_xp: { [Op.lte]: xp } },
      order: [["order", "DESC"]],
    });
  }

  byCode(code: string): Promise<RankTier | null> {
    return this.findByPk(code);
  }
}

export default new RankTierRepository();
