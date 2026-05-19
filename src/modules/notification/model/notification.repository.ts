import { BaseRepository } from "../../../core/models/base.repository";
import Notification from "./notification.model";

class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(Notification);
  }

  unreadCount(userId: string): Promise<number> {
    return this.count({ user_id: userId, read_at: null });
  }

  listByUser(
    userId: string,
    page: number,
    limit: number,
    unreadOnly = false
  ) {
    return this.paginate(
      page,
      limit,
      unreadOnly
        ? { user_id: userId, read_at: null }
        : { user_id: userId }
    );
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.updateWhere(
      { read_at: new Date() },
      { id, user_id: userId, read_at: null }
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.updateWhere(
      { read_at: new Date() },
      { user_id: userId, read_at: null }
    );
  }
}

export default new NotificationRepository();
