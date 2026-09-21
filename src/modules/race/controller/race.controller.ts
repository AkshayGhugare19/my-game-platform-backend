import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import {
  successResponse,
  errorResponse,
} from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listRaces,
  getRace,
  joinRace,
  getRaceProgress,
  getRaceLeaderboard,
  recordRaceScore,
  claimRace,
} from "../service/race.service.ts";

export const getMyRaces = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listRaces(req.user!.email);
    successResponse(res, 200, "Races", data);
  } catch {
    errorResponse(res, 500, "Failed to load races");
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getRace(req.user!.email, req.params.id);
    successResponse(res, 200, "Race", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load race");
  }
};

export const join = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await joinRace(req.user!.email, req.params.id);
    successResponse(res, 200, "Race joined", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to join race");
  }
};

export const getProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getRaceProgress(req.user!.email, req.params.id);
    successResponse(res, 200, "Race progress", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load race progress");
  }
};

export const getLeaderboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { size } = req.query as { size?: string };
    const data = await getRaceLeaderboard(
      req.params.id,
      req.user!.email,
      size !== undefined ? Number(size) : undefined
    );
    successResponse(res, 200, "Race leaderboard", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load race leaderboard");
  }
};

export const submitScore = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { points, game } = req.body ?? {};
    const data = await recordRaceScore(
      req.user!.email,
      req.params.id,
      Number(points),
      typeof game === "string" ? game : null
    );
    successResponse(res, 200, "Score recorded", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to record score");
  }
};

export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimRace(req.user!.email, req.params.id);
    successResponse(res, 200, "Race prize claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim race prize");
  }
};
