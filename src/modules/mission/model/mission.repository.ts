import { Op } from "sequelize";
import { BaseRepository } from "../../../core/models/base.repository";
import Mission from "./mission.model";

class MissionRepository extends BaseRepository<Mission> {
  constructor() {
    super(Mission);
  }

  activeByMetric(metric: string): Promise<Mission[]> {
    return this.findWhere({ metric, active: true });
  }

  activeCatalog(): Promise<Mission[]> {
    const now = new Date();
    return this.findWhere({
      active: true,
      [Op.and]: [
        { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }] },
        { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gte]: now } }] },
      ],
    });
  }
}

export default new MissionRepository();
