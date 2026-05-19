import { Response } from "express";
import { AuthRequest } from "../../../types/request.type";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import { getBoard, myPositions } from "../service/leaderboard.service";

const board =
  (which: "global" | "weekly" | "monthly") =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const data = await getBoard(which, limit, offset, req.user!.id);
      successResponse(res, 200, `${which} leaderboard`, data);
    } catch {
      errorResponse(res, 500, "Failed to load leaderboard");
    }
  };

export const getGlobal = board("global");
export const getWeekly = board("weekly");
export const getMonthly = board("monthly");

export const getMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await myPositions(req.user!.id);
    successResponse(res, 200, "My leaderboard positions", data);
  } catch {
    errorResponse(res, 500, "Failed to load positions");
  }
};
