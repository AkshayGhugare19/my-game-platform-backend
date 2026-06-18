import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import {
  successResponse,
  errorResponse,
} from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listBundles,
  getBundle,
  joinBundleMission,
  claimBundleMission,
  cancelBundleMission,
} from "../service/missionBundle.engine.ts";

export const getMyBundles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listBundles(req.user!.id, req.user!.email);
    successResponse(res, 200, "Mission bundles", data);
  } catch {
    errorResponse(res, 500, "Failed to load mission bundles");
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getBundle(req.user!.id, req.user!.email, req.params.id);
    successResponse(res, 200, "Mission bundle", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load mission bundle");
  }
};

/* Per-mission actions on a bundle's track (bundleId + missionId in the path). */

export const joinMission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await joinBundleMission(
      req.user!.id,
      req.user!.email,
      req.params.bundleId,
      req.params.missionId
    );
    successResponse(res, 200, "Mission joined", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to join mission");
  }
};

export const claimMission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimBundleMission(
      req.user!.id,
      req.user!.email,
      req.params.bundleId,
      req.params.missionId
    );
    successResponse(res, 200, "Mission reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim mission");
  }
};

export const cancelMission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await cancelBundleMission(
      req.user!.id,
      req.user!.email,
      req.params.bundleId,
      req.params.missionId
    );
    successResponse(res, 200, "Mission cancelled", null);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to cancel mission");
  }
};
