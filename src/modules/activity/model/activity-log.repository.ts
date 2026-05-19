import { BaseRepository } from "../../../core/models/base.repository.ts";
import ActivityLog from "./activity-log.model.ts";

class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor() {
    super(ActivityLog);
  }

  byIdempotencyKey(key: string): Promise<ActivityLog | null> {
    return this.findOne({ idempotency_key: key });
  }

  listByUser(userId: string, page: number, limit: number) {
    return this.paginate(page, limit, { user_id: userId });
  }
}

export default new ActivityLogRepository();
