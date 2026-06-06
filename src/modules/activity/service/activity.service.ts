import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import ActivityLogRepository from "../model/activity-log.repository.ts";
import { awardXp } from "../../xp/service/xp.engine.ts";
import UserRepository from "../../user/model/user.repository.ts";
import type { GamruAddXpPointUserResponse } from "../../../utils/gamruService.ts";
import { gamruAddXpPoints } from "../../../utils/gamruService.ts";
import { getActiveBoostMultiplier } from "../../reward-shop/service/reward-shop.service.ts";
import { AppError } from "../../../utils/AppError.ts";

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
    amount: amount ?? 0,
    meta,
  });

  let gamru: GamruAddXpPointUserResponse | null = null;
  // Base XP/token delta for this play; an active reward-shop booster
  // multiplies it before it reaches gamru (see below). Turnover (bet size)
  // is intentionally left un-boosted.
  const baseAmount = amount ?? 0;
  let xpAmount = baseAmount;
  let boostMultiplier = 1;

  if (!result.duplicate && result.totalXp > 0) {
    bus.emit(EVENTS.XP_AWARDED, {
      userId,
      amount: result.totalXp,
      xpTotal: result.xpTotal,
      source: "ACTIVITY",
    });
  }
  if (!result.duplicate) {
    // Apply the player's strongest active booster to the earned amount so a
    // purchased "2X" booster actually doubles what gamru awards. Best-effort:
    // a lookup failure must never block gameplay (multiplier stays 1).
    try {
      boostMultiplier = await getActiveBoostMultiplier(userId);
      if (boostMultiplier > 1) xpAmount = Math.round(baseAmount * boostMultiplier);
    } catch {
      boostMultiplier = 1;
    }
    try {
      console.log("Recording activity for Gamru...", userId, xpAmount);
      const u = await UserRepository.findByPk(userId);
      const email = u?.email ?? null;
      if (email) {
        // Forward game metadata so gamru can build the player's
        // casino personalization (category/provider mix + favorites).
        const m = (meta ?? {}) as Record<string, unknown>;
        const game = {
          id: gameId ?? null,
          name: (m.name as string | undefined) ?? (m.game as string | undefined) ?? null,
          category: (m.category as string | undefined) ?? null,
          provider: (m.provider as string | undefined) ?? null,
          turnover: typeof m.bet === "number" ? (m.bet as number) : (amount ?? 0),
        };
        const xpRes = await gamruAddXpPoints(email, xpAmount, game);
        console.log("Gamru add XP response:", xpRes);

        if (xpRes.ok && xpRes.body) {
          gamru = xpRes.body;
        } else if (xpRes.status === 403) {
          // Gamru rejected this client — the operator must fix it from
          // Configurations → Clients. Surface as a real error so the
          // caller sees the cause instead of a silent "no XP applied".
          throw new AppError(
            xpRes.error || "Gamru client service is disabled",
            503
          );
        } else if (xpRes.status === 401) {
          throw new AppError(
            xpRes.error || "Gamru client auth key is invalid",
            503
          );
        }
        // Any other non-ok response (network blip, 5xx) → degrade
        // silently: leave `gamru` null so gameplay continues.
      }
    } catch (err) {
      // Re-raise auth-rejection errors so the HTTP layer renders them;
      // swallow everything else (transient gamru outages) so gameplay
      // is never blocked by a network blip.
      if (err instanceof AppError) throw err;
      /* Gamru outage — leave `gamru` null, gameplay continues. */
    }
  }

  // XP now comes from the activity `amount` pushed to Gamru, not the
  // local engine (which has no rule for `type` and returns 0). Report
  // the value actually applied, and Gamru's running total when it
  // answered, falling back to the local engine otherwise.
  const xpAwarded = result.duplicate ? 0 : xpAmount;

  return {
    duplicate: result.duplicate,
    xpAwarded,
    // Reward-shop booster applied to this play (1 = none).
    boostMultiplier: result.duplicate ? 1 : boostMultiplier,
    breakdown: {
      base: result.duplicate ? 0 : baseAmount,
      streakBonus: result.streakBonus,
      dailyBonus: result.dailyBonus,
    },
    xpTotal: gamru?.xp_points ?? result.xpTotal,
    gamru,
  };
};

export const gameHistory = (userId: string, page: number, limit: number) =>
  ActivityLogRepository.listByUser(userId, page, limit);
