import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import ActivityLogRepository from "../model/activity-log.repository.ts";
import { awardXp } from "../../xp/service/xp.engine.ts";
import UserRepository from "../../user/model/user.repository.ts";
import type {
  HamaraAddXpPointUserResponse} from "../../../utils/hamaraEngageService.ts";
import {
  hamaraAddXpPoints
} from "../../../utils/hamaraEngageService.ts";

export interface RecordActivityInput {
  userId: string;
  type: string; // maps directly to an xp_rules.code (e.g. GAME_PLAY)
  gameId?: string;
  amount?: number; // bet size — analytics only, NOT used for XP
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}

export const recordActivity = async (input: RecordActivityInput) => {
  const { userId, type, gameId, amount, idempotencyKey, meta } = input;

  const existing = await ActivityLogRepository.byIdempotencyKey(idempotencyKey);
  console.log("Existing activity with same idempotencyKey:", existing);
  if (!existing) {
    try {
      await ActivityLogRepository.create({
        user_id: userId,
        type,
        game_id: gameId ?? null,
        amount: amount ?? null,
        idempotency_key: idempotencyKey,
        processed: true,
        meta: meta ?? {},
      });
    } catch (e) {
      if ((e as { name?: string }).name !== "SequelizeUniqueConstraintError")
        throw e;
    }
  }

  const result = await awardXp({
    userId,
    ruleCode: type,
    source: "ACTIVITY",
    idempotencyKey,
    meta,
  });
 console.log("XP engine result:", result);
  bus.emit(EVENTS.ACTIVITY_RECORDED, {
    userId,
    type,
    ruleCode: type,
    idempotencyKey,
    meta,
  });

  let hamara: HamaraAddXpPointUserResponse | null = null;
  const xpAmount = amount ?? 0;

  if (!result.duplicate && result.totalXp > 0) {
    bus.emit(EVENTS.XP_AWARDED, {
      userId,
      amount: result.totalXp,
      xpTotal: result.xpTotal,
      source: "ACTIVITY",
    });
  }
  if (!result.duplicate) {
    try {
      console.log("Recording activity for Hamara Engage...", userId, xpAmount);
      const u = await UserRepository.findByPk(userId);
      const email = u?.email ?? null;
      if (email) {
        const xpRes = await hamaraAddXpPoints(email, xpAmount);
        console.log("Hamara add XP response:", xpRes);
        if (xpRes.ok && xpRes.body) hamara = xpRes.body;
      }
    } catch {
      /* Hamara outage — leave `hamara` null, gameplay continues. */
    }
  }

  // XP now comes from the activity `amount` pushed to Hamara, not the
  // local engine (which has no rule for `type` and returns 0). Report
  // the value actually applied, and Hamara's running total when it
  // answered, falling back to the local engine otherwise.
  const xpAwarded = result.duplicate ? 0 : xpAmount;

  return {
    duplicate: result.duplicate,
    xpAwarded,
    breakdown: {
      base: xpAwarded,
      streakBonus: result.streakBonus,
      dailyBonus: result.dailyBonus,
    },
    xpTotal: hamara?.xp_points ?? result.xpTotal,
    hamara,
  };
};

export const gameHistory = (userId: string, page: number, limit: number) =>
  ActivityLogRepository.listByUser(userId, page, limit);
