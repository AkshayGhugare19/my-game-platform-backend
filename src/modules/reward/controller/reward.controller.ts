import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import RewardRepository from "../model/reward.repository.ts";
import UserRewardRepository from "../model/user-reward.repository.ts";
import { claimReward } from "../service/reward.engine.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { gamruUserProfileData } from "../../../utils/gamruService.ts";

interface GamruRewardRow {
  id?: string;
  status?: string;
  granted_date?: string | null;
  gamification_source?: string | null;
  reward_type?: string | null;
  reward?: string | null;
  is_manual?: boolean;
  created_at?: string;
  [k: string]: unknown;
}

export const getMyRewards = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = (req.query.status as string) || undefined;
    // Gamru is the source of truth for mission/level/manual rewards.
    // Fall back to the local table if gamru is unreachable so the page
    // still renders something instead of an empty state on a transient blip.
    const user = await UserRepository.findByPk(req.user!.id);
    if (user?.email) {
      const gamru = await gamruUserProfileData(user.email);
      const rows = (gamru.body?.gamification?.rewards ?? []) as GamruRewardRow[];
      const filtered = status
        ? rows.filter(
            (r) => String(r.status ?? "").toUpperCase() === status.toUpperCase()
          )
        : rows;
      successResponse(res, 200, "My rewards", filtered);
      return;
    }
    const data = await UserRewardRepository.listByUser(req.user!.id, status);
    successResponse(res, 200, "My rewards", data);
  } catch {
    errorResponse(res, 500, "Failed to load rewards");
  }
};

export const getCatalog = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await RewardRepository.catalog();
    successResponse(res, 200, "Reward catalog", data);
  } catch {
    errorResponse(res, 500, "Failed to load catalog");
  }
};

export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimReward(req.user!.id, req.params.id);
    successResponse(res, 200, "Reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim reward");
  }
};
