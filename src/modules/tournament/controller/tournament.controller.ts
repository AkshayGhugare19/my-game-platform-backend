import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import {
  successResponse,
  errorResponse,
} from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listTournaments,
  getTournament,
  recordScore,
  getTournamentHistory,
  claimTournament,
} from "../service/tournament.service.ts";

export const getMyTournaments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listTournaments(req.user!.id, req.user!.email);
    successResponse(res, 200, "Tournaments", data);
  } catch {
    errorResponse(res, 500, "Failed to load tournaments");
  }
};

export const getHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getTournamentHistory(req.user!.id);
    successResponse(res, 200, "Tournament history", data);
  } catch {
    errorResponse(res, 500, "Failed to load tournament history");
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getTournament(
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    successResponse(res, 200, "Tournament", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load tournament");
  }
};

export const submitScore = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { points, game } = req.body ?? {};
    const data = await recordScore(
      req.user!.id,
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
    const data = await claimTournament(
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    successResponse(res, 200, "Tournament prize claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim tournament prize");
  }
};
