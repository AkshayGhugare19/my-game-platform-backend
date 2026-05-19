import { Response } from "express";
import { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import RewardRepository from "../model/reward.repository.ts";
import UserRewardRepository from "../model/user-reward.repository.ts";
import { claimReward } from "../service/reward.engine.ts";

export const getMyRewards = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = (req.query.status as string) || undefined;
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
