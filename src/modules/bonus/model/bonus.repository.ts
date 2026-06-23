import { BaseRepository } from "../../../core/models/base.repository.ts";
import Bonus from "./bonus.model.ts";

class BonusRepository extends BaseRepository<Bonus> {
  constructor() {
    super(Bonus);
  }

  /** A bonus definition that exists AND is ACTIVE — used by the grant path. */
  activeById(id: string): Promise<Bonus | null> {
    return this.findOne({ id, status: "ACTIVE" });
  }

  /** All ACTIVE bonuses (the live catalog). */
  catalog(): Promise<Bonus[]> {
    return this.findWhere({ status: "ACTIVE" });
  }
}

export default new BonusRepository();
