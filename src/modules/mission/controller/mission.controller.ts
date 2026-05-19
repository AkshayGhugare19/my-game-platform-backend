import { Response } from "express";
import { AuthRequest } from "../../../types/request.type";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import { AppError } from "../../../utils/AppError";
import {
  listUserMissions,
  claimMission,
} from "../service/mission.engine";
import MissionRepository from "../model/mission.repository";

export const getMyMissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listUserMissions(req.user!.id);
    successResponse(res, 200, "Missions", data);
  } catch {
    errorResponse(res, 500, "Failed to load missions");
  }
};

export const getCatalog = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await MissionRepository.activeCatalog();
    successResponse(res, 200, "Mission catalog", data);
  } catch {
    errorResponse(res, 500, "Failed to load catalog");
  }
};

export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimMission(req.user!.id, req.params.id);
    successResponse(res, 200, "Mission reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim mission");
  }
};
