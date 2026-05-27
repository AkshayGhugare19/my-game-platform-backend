import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from "../service/notification.service.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { gamruUserProfileData } from "../../../utils/gamruService.ts";

interface GamruRewardRow {
  id?: string;
  status?: string;
  granted_date?: string | null;
  gamification_source?: string | null;
  reward_type?: string | null;
  reward?: string | null;
  created_at?: string;
}

/**
 * Fetch IN_PROGRESS gamru rewards for this user and shape them as
 * notification rows so the bell dropdown surfaces unclaimed rewards
 * alongside real notifications. These are virtual (not in our DB),
 * so they're always `read_at: null` and ids carry a `reward:` prefix
 * to avoid colliding with notification UUIDs.
 */
const pendingRewardNotifications = async (
  email: string
): Promise<
  Array<{
    id: string;
    type: "REWARD_UNLOCKED";
    title: string;
    body: string;
    data: Record<string, unknown>;
    read_at: null;
    created_at: string;
  }>
> => {
  try {
    const gamru = await gamruUserProfileData(email);
    const rows = (gamru.body?.gamification?.rewards ?? []) as GamruRewardRow[];
    return rows
      .filter((r) => String(r.status ?? "").toUpperCase() === "IN_PROGRESS")
      .map((r) => ({
        id: `reward:${r.id ?? ""}`,
        type: "REWARD_UNLOCKED" as const,
        title: `Reward unlocked: ${r.reward_type ?? "reward"} 🎁`,
        body: r.reward
          ? `${r.reward} — claim it from your Rewards page.`
          : "Claim it from your Rewards page.",
        data: {
          rewardId: r.id,
          reward_type: r.reward_type,
          reward: r.reward,
          source: r.gamification_source,
        },
        read_at: null,
        created_at: r.created_at ?? r.granted_date ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
};

export const list = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const unread = req.query.unread === "true";
    const data = await listNotifications(req.user!.id, page, limit, unread);

    const user = await UserRepository.findByPk(req.user!.id);
    const pending = user?.email
      ? await pendingRewardNotifications(user.email)
      : [];

    // Pending rewards are always "unread" — keep them on top, then the
    // real notifications, so the bell dropdown leads with what the user
    // can act on. Pagination total grows by however many pending we found.
    const merged = [...pending, ...data.data];
    const payload = {
      data: merged,
      pagination: {
        ...data.pagination,
        total: data.pagination.total + pending.length,
      },
    };
    successResponse(res, 200, "Notifications", payload);
  } catch {
    errorResponse(res, 500, "Failed to load notifications");
  }
};

export const count = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [base, user] = await Promise.all([
      unreadCount(req.user!.id),
      UserRepository.findByPk(req.user!.id),
    ]);
    const pending = user?.email
      ? await pendingRewardNotifications(user.email)
      : [];
    successResponse(res, 200, "Unread count", {
      count: base + pending.length,
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
