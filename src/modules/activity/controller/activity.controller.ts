import { Response } from "express";
import { AuthRequest } from "../../../types/request.type";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import { AppError } from "../../../utils/AppError";
import { recordActivity, gameHistory } from "../service/activity.service";

export const postActivity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await recordActivity({
      userId: req.user!.id,
      type: req.body.type,
      gameId: req.body.gameId,
      amount: req.body.amount,
      idempotencyKey: req.body.idempotencyKey,
      meta: req.body.meta,
    });
    successResponse(res, 201, "Activity recorded", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to record activity");
  }
};

export const getGameHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const data = await gameHistory(req.user!.id, page, limit);
    successResponse(res, 200, "Game history", data);
  } catch {
    errorResponse(res, 500, "Failed to load game history");
  }
};
