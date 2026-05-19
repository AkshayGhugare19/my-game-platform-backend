import { Response } from "express";
import { AuthRequest } from "../../../types/request.type";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from "../service/notification.service";

export const list = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const unread = req.query.unread === "true";
    const data = await listNotifications(req.user!.id, page, limit, unread);
    successResponse(res, 200, "Notifications", data);
  } catch {
    errorResponse(res, 500, "Failed to load notifications");
  }
};

export const count = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    successResponse(res, 200, "Unread count", {
      count: await unreadCount(req.user!.id),
    });
  } catch {
    errorResponse(res, 500, "Failed to load count");
  }
};

export const readOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await markRead(req.user!.id, req.params.id);
    successResponse(res, 200, "Marked read");
  } catch {
    errorResponse(res, 500, "Failed to mark read");
  }
};

export const readAll = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await markAllRead(req.user!.id);
    successResponse(res, 200, "All marked read");
  } catch {
    errorResponse(res, 500, "Failed to mark all read");
  }
};
