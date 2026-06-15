import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { readPageParams } from "../../../utils/pagination.ts";
import {
  getProducts,
  buyProduct,
  getHistory,
  getBoosters,
} from "../service/reward-shop.service.ts";

const fail = (res: Response, e: unknown, fallback: string) =>
  e instanceof AppError
    ? errorResponse(res, e.statusCode, e.message)
    : errorResponse(res, 500, fallback);

const requireEmail = async (userId: string): Promise<string> => {
  const user = await UserRepository.findByPk(userId);
  if (!user?.email) throw new AppError("User account has no email", 400);
  return user.email;
};

export const listProducts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const email = await requireEmail(req.user!.id);
    const { page, limit } = readPageParams(req.query, 12);
    const data = await getProducts(email, page, limit);
    successResponse(res, 200, "Reward shop products", data);
  } catch (e) {
    fail(res, e, "Failed to load reward shop");
  }
};

export const buy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = await requireEmail(req.user!.id);
    const { productId, quantity } = req.body as {
      productId?: string;
      quantity?: number;
    };
    if (!productId) throw new AppError("productId is required", 400);
    const data = await buyProduct(req.user!.id, email, productId, quantity ?? 1);
    successResponse(res, 200, "Purchase successful", data);
  } catch (e) {
    fail(res, e, "Failed to complete purchase");
  }
};

export const history = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const email = await requireEmail(req.user!.id);
    const { page, limit } = readPageParams(req.query);
    const data = await getHistory(email, page, limit);
    successResponse(res, 200, "Shop history", data);
  } catch (e) {
    fail(res, e, "Failed to load shop history");
  }
};

export const boosters = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const email = await requireEmail(req.user!.id);
    const { page, limit } = readPageParams(req.query, 12);
    const data = await getBoosters(email, page, limit);
    successResponse(res, 200, "My boosters", data);
  } catch (e) {
    fail(res, e, "Failed to load boosters");
  }
};
