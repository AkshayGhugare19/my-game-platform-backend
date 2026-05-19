import { BaseRepository } from "../../../core/models/base.repository.ts";
import Achievement from "./achievement.model.ts";

class AchievementRepository extends BaseRepository<Achievement> {
  constructor() {
    super(Achievement);
  }

  byCode(code: string): Promise<Achievement | null> {
    return this.findOne({ code });
  }
}

export default new AchievementRepository();
