import { BaseRepository } from "../../../core/models/base.repository.ts";
import Reward from "./reward.model.ts";

class RewardRepository extends BaseRepository<Reward> {
  constructor() {
    super(Reward);
  }

  activeByRank(rankCode: string): Promise<Reward[]> {
    return this.findWhere({ required_rank: rankCode, active: true });
  }

  byCode(code: string): Promise<Reward | null> {
    return this.findOne({ code });
  }

  catalog(): Promise<Reward[]> {
    return this.findWhere({ active: true });
  }
}

export default new RewardRepository();
