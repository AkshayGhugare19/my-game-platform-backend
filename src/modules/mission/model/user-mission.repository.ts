import { BaseRepository } from "../../../core/models/base.repository.ts";
import UserMission from "./user-mission.model.ts";

class UserMissionRepository extends BaseRepository<UserMission> {
  constructor() {
    super(UserMission);
  }

  find(
    userId: string,
    missionId: string,
    periodKey: string
  ): Promise<UserMission | null> {
    return this.findOne({
      user_id: userId,
      mission_id: missionId,
      period_key: periodKey,
    });
  }

  listByUser(userId: string): Promise<UserMission[]> {
    return this.findWhere({ user_id: userId });
  }
}

export default new UserMissionRepository();
