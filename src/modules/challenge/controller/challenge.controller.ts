import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import {
  successResponse,
  errorResponse,
} from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  listChallenges,
  getChallenge,
  joinChallenge,
  cancelChallenge,
  getChallengeProgress,
  claimChallenge,
} from "../service/challenge.service.ts";

export const getMyChallenges = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await listChallenges(req.user!.email);
    successResponse(res, 200, "Challenges", data);
  } catch {
    errorResponse(res, 500, "Failed to load challenges");
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getChallenge(req.user!.email, req.params.id);
    successResponse(res, 200, "Challenge", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load challenge");
  }
};

export const join = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await joinChallenge(
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    successResponse(res, 200, "Challenge joined", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to join challenge");
  }
};

export const cancel = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await cancelChallenge(req.user!.email, req.params.id);
    successResponse(res, 200, "Challenge cancelled", null);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to cancel challenge");
  }
};

export const getProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getChallengeProgress(req.user!.email, req.params.id);
    successResponse(res, 200, "Challenge progress", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to load challenge progress");
  }
};

export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await claimChallenge(req.user!.id, req.user!.email, req.params.id);
    successResponse(res, 200, "Challenge reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim challenge");
  }
};
