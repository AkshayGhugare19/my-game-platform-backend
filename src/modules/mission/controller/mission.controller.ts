import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listUserMissions,
  claimMission,
} from "../service/mission.engine.ts";
import MissionRepository from "../model/mission.repository.ts";
import { readPageParams, paginateArray } from "../../../utils/pagination.ts";

export const getMyMissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page, limit } = readPageParams(req.query);
    const all = await listUserMissions(req.user!.id);
    successResponse(res, 200, "Missions", paginateArray(all, page, limit));
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
