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

  /** A user's row for a gamru mission, regardless of period. */
  findForMission(
    userId: string,
    missionId: string
  ): Promise<UserMission | null> {
    return this.findOne({ user_id: userId, mission_id: missionId });
  }

  listByUser(userId: string): Promise<UserMission[]> {
    return this.findWhere({ user_id: userId });
  }

  /** Every mission the user currently has running. */
  listInProgress(userId: string): Promise<UserMission[]> {
    return this.findWhere({ user_id: userId, status: "IN_PROGRESS" });
  }

  /** The user's running mission in a given exclusivity bucket, if any. */
  listActiveInCategory(
    userId: string,
    category: string
  ): Promise<UserMission[]> {
    return this.findWhere({
      user_id: userId,
      category,
      status: "IN_PROGRESS",
    });
  }
}

export default new UserMissionRepository();
