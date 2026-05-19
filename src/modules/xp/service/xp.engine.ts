/**
 * XP engine — NEUTERED.
 *
 * The GamificationProfile model/table (the XP/level/rank/streak/coins store)
 * was removed. With no per-user profile to lock and mutate, XP can no longer
 * be persisted, and level/rank/streak progression no longer exists. `awardXp`
 * is kept as a no-op stub so its callers (activity.service, mission.engine,
 * config.controller) still type-check and run, but it awards nothing.
 */

export type XpSource = "ACTIVITY" | "MISSION" | "STREAK" | "DAILY" | "ADMIN";

export interface AwardInput {
  userId: string;
  ruleCode: string;
  source: XpSource;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
  /** override amount (MISSION/ADMIN grants supply explicit XP) */
  fixedAmount?: number;
}

export interface AwardResult {
  duplicate: boolean;
  baseXp: number;
  streakBonus: number;
  dailyBonus: number;
  totalXp: number;
  xpTotal: number;
}

/**
 * No-op: profile-backed XP persistence was removed. Always reports a zero
 * award. Retained only so existing call sites compile and don't throw.
 */
export const awardXp = async (_input: AwardInput): Promise<AwardResult> => ({
  duplicate: false,
  baseXp: 0,
  streakBonus: 0,
  dailyBonus: 0,
  totalXp: 0,
  xpTotal: 0,
});
