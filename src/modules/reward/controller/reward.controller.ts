import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import RewardRepository from "../model/reward.repository.ts";
import UserRewardRepository from "../model/user-reward.repository.ts";
import { claimReward as claimLocalReward } from "../service/reward.engine.ts";
import UserRepository from "../../user/model/user.repository.ts";
import WalletRepository from "../../wallet/model/wallet.repository.ts";
import { gamru, gamruUserProfileData } from "../../../utils/gamruService.ts";
import { readPageParams, paginateArray } from "../../../utils/pagination.ts";
import {
  listUserBonusRows,
  pendingBonusCount,
} from "../../bonus/service/bonus.engine.ts";

/** Trailing number in a reward label, e.g. "Weekend Race prize — 500" → 500. */
const parseTrailingAmount = (label?: string | null): number => {
  if (!label) return 0;
  const m = String(label).match(/(-?\d+(?:\.\d+)?)\s*$/);
  return m ? Number(m[1]) : 0;
};

interface GamruRewardRow {
  id?: string;
  status?: string;
  granted_date?: string | null;
  gamification_source?: string | null;
  reward_type?: string | null;
  reward?: string | null;
  is_manual?: boolean;
  created_at?: string;
  [k: string]: unknown;
}

export const getMyRewards = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = (req.query.status as string) || undefined;
    const { page, limit } = readPageParams(req.query);
    // Gamru is the source of truth for mission/level/manual rewards.
    // Fall back to the local table if gamru is unreachable so the page
    // still renders something instead of an empty state on a transient blip.
    // Local bonus grants surface in the SAME Rewards list (ahead of GAMRU rows)
    // and light the Claim button — the frontend routes their claim by `is_bonus`.
    const bonusRows = await listUserBonusRows(req.user!.id, status);

    const user = await UserRepository.findByPk(req.user!.id);
    if (user?.email) {
      const gamru = await gamruUserProfileData(user.email);
      const rows = (gamru.body?.gamification?.rewards ?? []) as GamruRewardRow[];
      const filtered = status
        ? rows.filter(
            (r) => String(r.status ?? "").toUpperCase() === status.toUpperCase()
          )
        : rows;
      const merged = [...bonusRows, ...filtered];
      successResponse(res, 200, "My rewards", paginateArray(merged, page, limit));
      return;
    }
    const data = await UserRewardRepository.listByUser(req.user!.id, status);
    const merged = [...bonusRows, ...data];
    successResponse(res, 200, "My rewards", paginateArray(merged, page, limit));
  } catch {
    errorResponse(res, 500, "Failed to load rewards");
  }
};

export const getCatalog = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await RewardRepository.catalog();
    successResponse(res, 200, "Reward catalog", data);
  } catch {
    errorResponse(res, 500, "Failed to load catalog");
  }
};

/**
 * Claim a gamru-owned reward by id. We must look the gamru player up by
 * the authenticated user's email (gamru is the source of truth — there's
 * no local mirror to claim against), then proxy the claim through. If
 * gamru is unreachable or doesn't know the player we degrade to the
 * legacy local user_rewards path so the button still does something.
 */
export const claim = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await UserRepository.findByPk(req.user!.id);
    const gamruProfile = user?.email
      ? await gamruUserProfileData(user.email)
      : null;
    const gamruPlayerId = gamruProfile?.ok ? gamruProfile.body?.id : null;

    if (gamruPlayerId) {
      const result = await gamru.players.claimReward(
        gamruPlayerId,
        req.params.id
      );
      if (!result.ok) {
        const body = result.body as { message?: string } | undefined;
        const message = body?.message || result.error || "Failed to claim reward";
        errorResponse(res, result.status ?? 502, message);
        return;
      }
      const body = result.body as { data?: unknown; message?: string } | undefined;
      // A tournament-prize reward credits the local games wallet (GAMRU's ledger
      // and the games wallet are separate stores). GAMRU only lets the claim
      // succeed on the IN_PROGRESS→GRANTED transition, so this runs at most once.
      const data = body?.data as
        | { reward?: GamruRewardRow; player?: unknown }
        | undefined;
      const claimedReward = data?.reward;
      let balance: number | undefined;
      if (claimedReward?.gamification_source === "tournaments") {
        const amount = parseTrailingAmount(claimedReward.reward);
        if (amount > 0) {
          const wallet = await WalletRepository.findOrCreateByUserId(req.user!.id);
          // A tournament prize is Real Money — credit RM and keep the
          // invariant balance = real_money + bonus_money.
          wallet.real_money =
            Math.round((Number(wallet.real_money ?? 0) + amount) * 100) / 100;
          wallet.balance =
            Math.round(
              (Number(wallet.real_money ?? 0) + Number(wallet.bonus_money ?? 0)) *
                100
            ) / 100;
          await wallet.save();
          balance = wallet.balance;
        }
      }
      successResponse(res, 200, body?.message || "Reward claimed", {
        ...(data ?? {}),
        ...(balance !== undefined ? { balance } : {}),
      });
      return;
    }

    const data = await claimLocalReward(req.user!.id, req.params.id);
    successResponse(res, 200, "Reward claimed", data);
  } catch (e) {
    if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
    else errorResponse(res, 500, "Failed to claim reward");
  }
};

/** Count of rewards still waiting to be claimed — drives the sidebar badge. */
export const getPendingCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const bonusPending = await pendingBonusCount(req.user!.id);
    const user = await UserRepository.findByPk(req.user!.id);
    if (user?.email) {
      const gamru = await gamruUserProfileData(user.email);
      const rows = (gamru.body?.gamification?.rewards ?? []) as GamruRewardRow[];
      const count = rows.filter(
        (r) => String(r.status ?? "").toUpperCase() === "IN_PROGRESS"
      ).length;
      successResponse(res, 200, "Pending rewards", { count: count + bonusPending });
      return;
    }
    const rows = await UserRewardRepository.listByUser(req.user!.id, "GRANTED");
    successResponse(res, 200, "Pending rewards", {
      count: rows.length + bonusPending,
    });
  } catch {
    successResponse(res, 200, "Pending rewards", { count: 0 });
  }
};
