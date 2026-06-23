import type { Response } from "express";
import type { AuthRequest } from "../../../types/request.type.ts";
import { successResponse, errorResponse } from "../../../utils/responseHandler.ts";
import { AppError } from "../../../utils/AppError.ts";
import { readPageParams } from "../../../utils/pagination.ts";
import {
  createBonus,
  updateBonus,
  getBonus,
  listBonuses,
  deleteBonus,
  catalogBonuses,
} from "../service/bonus.service.ts";
import {
  listUserBonusRows,
  claimBonus,
} from "../service/bonus.engine.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { gamru } from "../../../utils/gamruService.ts";
import { logger } from "../../../utils/logger.ts";

const fail = (res: Response, e: unknown, fallback: string): void => {
  if (e instanceof AppError) errorResponse(res, e.statusCode, e.message);
  else errorResponse(res, 500, fallback);
};

/* ── Admin CRUD ─────────────────────────────────────────────────────────── */

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bonus = await createBonus(req.body);
    successResponse(res, 201, "Bonus created", bonus);
  } catch (e) {
    fail(res, e, "Failed to create bonus");
  }
};

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = readPageParams(req.query);
    successResponse(res, 200, "Bonuses", await listBonuses(page, limit));
  } catch (e) {
    fail(res, e, "Failed to load bonuses");
  }
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    successResponse(res, 200, "Bonus", await getBonus(req.params.id));
  } catch (e) {
    fail(res, e, "Failed to load bonus");
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bonus = await updateBonus(req.params.id, req.body);
    successResponse(res, 200, "Bonus updated", bonus);
  } catch (e) {
    fail(res, e, "Failed to update bonus");
  }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteBonus(req.params.id);
    successResponse(res, 200, "Bonus deleted");
  } catch (e) {
    fail(res, e, "Failed to delete bonus");
  }
};

/* ── Catalog (server-to-server: GAMRU snapshots these) ──────────────────── */

/** All ACTIVE bonus definitions — GAMRU fetches this to build its snapshot. */
export const catalog = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    successResponse(res, 200, "Bonus catalog", await catalogBonuses());
  } catch (e) {
    fail(res, e, "Failed to load bonus catalog");
  }
};

/** A single bonus definition by id — GAMRU snapshots one pinned bonus. */
export const catalogOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    successResponse(res, 200, "Bonus", await getBonus(req.params.id));
  } catch (e) {
    fail(res, e, "Failed to load bonus");
  }
};

/* ── Player ─────────────────────────────────────────────────────────────── */

/** The signed-in player's granted bonuses (also merged into the Rewards page). */
export const getMyBonuses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = (req.query.status as string) || undefined;
    const rows = await listUserBonusRows(req.user!.id, status);
    successResponse(res, 200, "My bonuses", rows);
  } catch (e) {
    fail(res, e, "Failed to load bonuses");
  }
};

/** Claim a PENDING bonus — credits the wallet (RM→real_money, BM→bonus_money). */
export const claimMyBonus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await claimBonus(req.user!.id, req.params.id);

    // Mirror the claim into GAMRU's user_bonuses ledger (clientAuth, by email).
    // Fire-and-forget — a GAMRU outage must never fail the player's claim.
    void (async () => {
      try {
        const user = await UserRepository.findByPk(req.user!.id);
        if (!user?.email) return;
        await gamru.bonuses.recordClaim({
          email: user.email,
          external_id: user.id,
          external_bonus_id: result.bonusId,
          bonus_name: result.bonusName,
          source_type: result.sourceType,
          source_id: result.sourceId,
          amount: result.amount,
          amount_type: result.amountType,
        });
      } catch (err) {
        logger.warn("GAMRU bonus claim mirror failed", {
          userId: req.user!.id,
          error: (err as Error).message,
        });
      }
    })();

    successResponse(res, 200, "Bonus claimed", result);
  } catch (e) {
    fail(res, e, "Failed to claim bonus");
  }
};
