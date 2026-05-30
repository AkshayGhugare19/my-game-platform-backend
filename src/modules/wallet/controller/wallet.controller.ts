import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import { getWallet, deposit } from "../service/wallet.service.ts";

const fail = (res: Response, e: unknown, fallback: string) =>
  e instanceof AppError
    ? errorResponse(res, e.statusCode, e.message)
    : errorResponse(res, 500, fallback);

/** GET /api/wallet — current user's wallet balance. */
export const getMyWallet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getWallet(req.user!.id);
    successResponse(res, 200, "Wallet", data);
  } catch (e) {
    fail(res, e, "Failed to load wallet");
  }
};

/** POST /api/wallet/deposit — credit the wallet and mirror to Gamru. */
export const depositToMyWallet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const amount = Number((req.body as { amount?: unknown }).amount);
    const data = await deposit(req.user!.id, req.user!.email, amount);
    successResponse(res, 200, "Deposit successful", data);
  } catch (e) {
    fail(res, e, "Failed to process deposit");
  }
};
