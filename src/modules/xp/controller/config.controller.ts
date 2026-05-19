import { Request, Response } from "express";
import { successResponse, errorResponse } from "../../../utils/responseHandler";
import { AppError } from "../../../utils/AppError";
import LevelTierRepository from "../../level/model/level-tier.repository";
import RankTierRepository from "../../rank/model/rank-tier.repository";
import XpRuleRepository from "../model/xp-rule.repository";
import { awardXp } from "../service/xp.engine";

const ok = (res: Response, msg: string, data: unknown) =>
  successResponse(res, 200, msg, data);
const fail = (res: Response, e: unknown, m: string) =>
  e instanceof AppError
    ? errorResponse(res, e.statusCode, e.message)
    : errorResponse(res, 500, m);

// ── Public progression maps (UI renders bars from these) ──────────
export const listLevels = async (_req: Request, res: Response) => {
  try {
    ok(res, "Level tiers", await LevelTierRepository.allOrdered());
  } catch (e) {
    fail(res, e, "Failed to load levels");
  }
};
export const listRanks = async (_req: Request, res: Response) => {
  try {
    ok(res, "Rank tiers", await RankTierRepository.allOrdered());
  } catch (e) {
    fail(res, e, "Failed to load ranks");
  }
};
export const listXpRules = async (_req: Request, res: Response) => {
  try {
    ok(res, "XP rules", await XpRuleRepository.findAll());
  } catch (e) {
    fail(res, e, "Failed to load XP rules");
  }
};

// ── Admin: XP rule CRUD + manual grant ────────────────────────────
export const upsertXpRule = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const existing = await XpRuleRepository.byCode(code);
    const rule = existing
      ? await existing.update(req.body)
      : await XpRuleRepository.create(req.body);
    ok(res, "XP rule saved", rule);
  } catch (e) {
    fail(res, e, "Failed to save XP rule");
  }
};

export const deleteXpRule = async (req: Request, res: Response) => {
  try {
    await XpRuleRepository.deleteByPk(req.params.id);
    ok(res, "XP rule deleted", null);
  } catch (e) {
    fail(res, e, "Failed to delete XP rule");
  }
};

export const adminGrantXp = async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;
    const result = await awardXp({
      userId,
      ruleCode: "ADMIN_GRANT",
      source: "ADMIN",
      fixedAmount: Number(amount),
      idempotencyKey: `admin:${userId}:${Date.now()}`,
      meta: { reason },
    });
    ok(res, "XP granted", result);
  } catch (e) {
    fail(res, e, "Failed to grant XP");
  }
};
