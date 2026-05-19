import { Request, Response } from "express";
import { Op } from "sequelize";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import UserRepository from "../model/user.repository";

export const paginateUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const data = await UserRepository.paginate(page, limit, {
      role: { [Op.ne]: "ADMIN" },
    });
    successResponse(res, 200, "Users", data);
  } catch {
    errorResponse(res, 500, "Failed to load users");
  }
};
