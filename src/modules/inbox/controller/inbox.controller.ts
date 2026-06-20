import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { gamru } from "../../../utils/gamruService.ts";

/**
 * On-site INBOX — the read side of GAMRU's campaign delivery channel. GAMRU is
 * the source of truth: each row is a campaign message it delivered to this
 * player. We resolve the player by the logged-in user's email and proxy to
 * `/api/inbox/*` over the client-auth key. GAMRU may be down, so every handler
 * degrades to an empty inbox rather than breaking the page.
 */

const emailOf = async (userId: string): Promise<string | null> => {
  const user = await UserRepository.findByPk(userId);
  return user?.email ?? null;
};

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = await emailOf(req.user!.id);
    if (!email) {
      successResponse(res, 200, "Inbox", {
        unread_count: 0,
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      return;
    }
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const unread_only = req.query.unread === "true";
    const result = await gamru.integration.campaigns.inbox.list(email, { page, limit, unread_only });

    if (!result.ok || !result.body) {
      successResponse(res, 200, "Inbox", {
        unread_count: 0,
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
      return;
    }
    successResponse(res, 200, "Inbox", result.body);
  } catch {
    errorResponse(res, 500, "Failed to load inbox");
  }
};

export const unreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const email = await emailOf(req.user!.id);
    const result = email
      ? await gamru.integration.campaigns.inbox.list(email, { page: 1, limit: 1 })
      : null;
    successResponse(res, 200, "Unread count", {
      count: result?.ok ? result.body?.unread_count ?? 0 : 0,
    });
  } catch {
    successResponse(res, 200, "Unread count", { count: 0 });
  }
};

export const read = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = await emailOf(req.user!.id);
    if (!email) {
      errorResponse(res, 400, "No email on account");
      return;
    }
    const result = await gamru.integration.campaigns.inbox.read(req.params.id, email);
    if (!result.ok) {
      errorResponse(res, 502, result.error || "Failed to mark read");
      return;
    }
    successResponse(res, 200, "Marked read", result.body);
  } catch {
    errorResponse(res, 500, "Failed to mark read");
  }
};

export const click = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = await emailOf(req.user!.id);
    if (!email) {
      errorResponse(res, 400, "No email on account");
      return;
    }
    const result = await gamru.integration.campaigns.inbox.click(req.params.id, email);
    if (!result.ok) {
      errorResponse(res, 502, result.error || "Failed to record click");
      return;
    }
    successResponse(res, 200, "Click recorded", result.body);
  } catch {
    errorResponse(res, 500, "Failed to record click");
  }
};

export const unsubscribe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const email = await emailOf(req.user!.id);
    if (!email) {
      errorResponse(res, 400, "No email on account");
      return;
    }
    const channel = String(req.body?.channel ?? "ON_SITE");
    const reason = req.body?.reason as string | undefined;
    const result = await gamru.integration.campaigns.inbox.unsubscribe(email, channel, reason);
    if (!result.ok) {
      errorResponse(res, 502, result.error || "Failed to unsubscribe");
      return;
    }
    successResponse(res, 200, "Unsubscribed", result.body);
  } catch {
    errorResponse(res, 500, "Failed to unsubscribe");
  }
};
