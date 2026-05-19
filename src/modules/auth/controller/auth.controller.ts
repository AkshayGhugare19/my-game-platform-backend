import { Request, Response } from "express";
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  resetPasswordService,
} from "../service/auth.service";
import UserRepository from "../../user/model/user.repository";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import { AppError } from "../../../utils/AppError";
import { AuthRequest } from "../../../types/request.type";

const meta = (req: Request) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

const fail = (res: Response, e: unknown, fallback: string) =>
  e instanceof AppError
    ? errorResponse(res, e.statusCode, e.message)
    : errorResponse(res, 500, fallback);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await registerService(req.body);
    successResponse(res, 201, "Registered & onboarded successfully", data);
  } catch (e) {
    fail(res, e, "Failed to register user");
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await loginService(
      req.body.email,
      req.body.password,
      meta(req)
    );
    successResponse(res, 200, "Login successful", data);
  } catch (e) {
    fail(res, e, "Failed to login");
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await refreshService(req.body.refreshToken, meta(req));
    successResponse(res, 200, "Token refreshed", data);
  } catch (e) {
    fail(res, e, "Failed to refresh token");
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    await logoutService(req.body.refreshToken);
    successResponse(res, 200, "Logged out");
  } catch (e) {
    fail(res, e, "Failed to logout");
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await resetPasswordService(
      req.body.email,
      req.body.token,
      req.body.new_password
    );
    successResponse(res, 200, "Password reset successful", data);
  } catch (e) {
    fail(res, e, "Failed to reset password");
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserRepository.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);
    successResponse(res, 200, "Current user", user);
  } catch (e) {
    fail(res, e, "Failed to load profile");
  }
};
