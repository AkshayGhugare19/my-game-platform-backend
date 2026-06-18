import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import {
  successResponse,
  errorResponse,
} from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listMissions,
  getMission,
  joinMission,
  claimMission,
  cancelMission,
} from "../service/mission.engine.ts";

export const getMyMissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listMissions(req.user!.id, req.user!.email);
    successResponse(res, 200, "Missions", data);
  } catch {
    errorResponse(res, 500, "Failed to load missions");
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getMission(req.user!.id, req.user!.email, req.params.id);
    successResponse(res, 200, "Mission", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load mission");
  }
};

export const join = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await joinMission(req.user!.id, req.user!.email, req.params.id);
    successResponse(res, 200, "Mission joined", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to join mission");
  }
};

export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimMission(
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    successResponse(res, 200, "Mission reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim mission");
  }
};

export const cancel = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await cancelMission(req.user!.id, req.user!.email, req.params.id);
    successResponse(res, 200, "Mission cancelled", null);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to cancel mission");
  }
};
