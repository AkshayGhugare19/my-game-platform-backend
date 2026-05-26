import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import { getProfile, getXpHistory } from "../service/profile.service.ts";

const fail = (res: Response, e: unknown, fallback: string) =>
  e instanceof AppError
    ? errorResponse(res, e.statusCode, e.message)
    : errorResponse(res, 500, fallback);

/** GET /api/profile — current user's gamification profile (from Gamru). */
export const getMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getProfile(req.user!.email);
    successResponse(res, 200, "Gamification profile", data);
  } catch (e) {
    fail(res, e, "Failed to load profile");
  }
};

/** GET /api/profile/xp/history — paginated XP ledger (from Gamru). */
export const getMyXpHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 15), 100);
    const data = await getXpHistory(req.user!.email, page, limit);
    successResponse(res, 200, "XP history", data);
  } catch (e) {
    fail(res, e, "Failed to load XP history");
  }
};
