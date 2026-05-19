import NotificationRepository from "../model/notification.repository.ts";
import { NotificationType } from "../model/notification.model.ts";
import { emitToUser } from "../../../realtime/socket.ts";
import { logger } from "../../../utils/logger.ts";

/**
 * Persists a notification AND pushes it live. Persisting first means an
 * offline user still receives it on next `GET /notifications` (REALTIME.md).
 */
export const pushNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body = "",
  data: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const n = await NotificationRepository.create({
      user_id: userId,
      type,
      title,
      body,
      data,
    });
    emitToUser(userId, "notification:new", {
      id: n.id,
      type,
      title,
      body,
      data,
      created_at: n.created_at,
    });
  } catch (e) {
    logger.error("notification push failed", {
      userId,
      error: (e as Error).message,
    });
  }
};

export const listNotifications = (
  userId: string,
  page: number,
  limit: number,
  unreadOnly: boolean
) => NotificationRepository.listByUser(userId, page, limit, unreadOnly);

export const unreadCount = (userId: string) =>
  NotificationRepository.unreadCount(userId);

export const markRead = (userId: string, id: string) =>
  NotificationRepository.markRead(userId, id);

export const markAllRead = (userId: string) =>
  NotificationRepository.markAllRead(userId);
