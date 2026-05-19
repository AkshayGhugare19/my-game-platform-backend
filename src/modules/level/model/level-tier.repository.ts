import { Op } from "sequelize";
import { BaseRepository } from "../../../core/models/base.repository.ts";
import LevelTier from "./level-tier.model.ts";

class LevelTierRepository extends BaseRepository<LevelTier> {
  constructor() {
    super(LevelTier);
  }

  /** Highest level whose min_xp <= xp. */
  highestForXp(xp: number): Promise<LevelTier | null> {
    return LevelTier.findOne({
      where: { min_xp: { [Op.lte]: xp } },
      order: [["level", "DESC"]],
    });
  }

  tierAt(level: number): Promise<LevelTier | null> {
    return this.findByPk(level);
  }

  nextTier(level: number): Promise<LevelTier | null> {
    return LevelTier.findOne({
      where: { level: { [Op.gt]: level } },
      order: [["level", "ASC"]],
    });
  }

  allOrdered(): Promise<LevelTier[]> {
    return this.findAll({ order: [["level", "ASC"]] });
  }
}

export default new LevelTierRepository();
