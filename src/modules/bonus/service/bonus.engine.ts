import { AppError } from "../../../utils/AppError.ts";
import { logger } from "../../../utils/logger.ts";
import sequelize from "../../../config/db.ts";
import BonusRepository from "../model/bonus.repository.ts";
import UserBonusRepository from "../model/user-bonus.repository.ts";
import UserBonus from "../model/user-bonus.model.ts";
import type { UserBonusSource } from "../model/user-bonus.model.ts";
import WalletRepository from "../../wallet/model/wallet.repository.ts";
import { pushNotification } from "../../notification/service/notification.service.ts";
import type {
  GamruLevelTier,
  GamruRankTier,
} from "../../../utils/gamruService.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** One bonus candidate to (idempotently) grant. */
interface GrantCandidate {
  bonusId: string;
  sourceType: UserBonusSource;
  sourceId: string;
}

/**
 * A granted bonus rendered into the same row shape the Rewards page consumes
 * (merged ahead of GAMRU's reward rows). `is_bonus` lets the frontend route the
 * claim to `POST /bonuses/:id/claim` instead of the GAMRU reward claim.
 */
export interface BonusRewardRow {
  id: string;
  is_bonus: true;
  status: "IN_PROGRESS" | "CLAIMED" | "EXPIRED";
  granted_date: string | null;
  gamification_source: string;
  reward_type: string;
  reward: string;
  amount: number;
  amount_type: "RM" | "BM";
  created_at: string;
}

/** The level/rank progression snapshot reconcile reads (from the GAMRU payload). */
export interface BonusLadder {
  levels: GamruLevelTier[];
  ranks: GamruRankTier[];
  currentLevel: number;
}

/** Coerce a bonus-ids value (array, comma-separated string, or empty) to string[]. */
const coerceIds = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

/**
 * Read a rank's pinned bonus ids from `bonusIds` or `data.bonus_ids`. The
 * rank-wide field in GAMRU is a comma-separated text input, so accept a string.
 */
const rankBonusIds = (rank: GamruRankTier): string[] => {
  if (rank.bonusIds !== undefined) return coerceIds(rank.bonusIds);
  return coerceIds((rank.data as Record<string, unknown> | undefined)?.bonus_ids);
};

/**
 * Highest level number that belongs to a rank in the ladder. The rank bonus is
 * only granted once the player has completed ALL levels in the rank, i.e. their
 * current level has reached this top level. Returns +Infinity when the rank has
 * no levels in the delivered ladder, so it is never granted on incomplete data.
 */
const rankTopLevel = (rankName: string, levels: GamruLevelTier[]): number => {
  const mine = levels
    .filter((l) => String(l.rank_name ?? "") === rankName)
    .map((l) => Number(l.level ?? 0));
  return mine.length ? Math.max(...mine) : Number.POSITIVE_INFINITY;
};

/**
 * Grant a single bonus candidate, idempotently. No-ops on an unknown/inactive
 * bonus id (so a typo'd GAMRU id never throws) and on a duplicate grant (the
 * unique index is the real guarantee; the pre-check just avoids re-notifying).
 */
export const grantBonus = async (
  userId: string,
  { bonusId, sourceType, sourceId }: GrantCandidate
): Promise<void> => {
  const already = await UserBonusRepository.existsGrant(
    userId,
    bonusId,
    sourceType,
    sourceId
  );
  if (already) return;

  const bonus = await BonusRepository.activeById(bonusId);
  if (!bonus) return; // unknown / inactive id pasted in GAMRU — skip silently

  try {
    await UserBonusRepository.create({
      user_id: userId,
      bonus_id: bonusId,
      source_type: sourceType,
      source_id: sourceId,
      amount: bonus.amount,
      amount_type: bonus.amount_type,
      status: "PENDING",
    });
  } catch (e) {
    // Unique-index race (two profile reads at once) → already granted, no-op.
    logger.warn("bonus grant skipped (already granted)", {
      userId,
      bonusId,
      error: (e as Error).message,
    });
    return;
  }

  await pushNotification(
    userId,
    "REWARD_UNLOCKED",
    `Bonus unlocked: ${bonus.bonus_name} 🎁`,
    "Claim it from your Rewards page.",
    { bonusId: bonus.id, kind: "bonus" }
  );
};

/**
 * Grant any newly-reached level/rank bonuses. Called fire-and-forget on every
 * profile read (the pointer-pattern grant trigger) — must NEVER throw.
 */
export const reconcileBonusGrants = async (
  userId: string,
  ladder: BonusLadder
): Promise<void> => {
  try {
    const { levels, ranks, currentLevel } = ladder;
    const candidates: GrantCandidate[] = [];

    // Levels: every rung at or below the player's current level is reached.
    for (const lvl of levels) {
      if (Number(lvl.level ?? 0) > currentLevel) continue;
      for (const bonusId of lvl.bonusIds ?? []) {
        candidates.push({
          bonusId,
          sourceType: "LEVEL",
          sourceId: String(lvl.level ?? 0),
        });
      }
    }

    // Ranks: granted only once EVERY level in the rank is completed — i.e. the
    // player's current level has reached the rank's top level.
    for (const rank of ranks) {
      const topLevel = rankTopLevel(String(rank.name ?? ""), levels);
      if (currentLevel < topLevel) continue;
      const rankId = String(rank.id ?? rank.name ?? "");
      for (const bonusId of rankBonusIds(rank)) {
        candidates.push({ bonusId, sourceType: "RANK", sourceId: rankId });
      }
    }

    for (const candidate of candidates) {
      await grantBonus(userId, candidate);
    }
  } catch (e) {
    logger.warn("reconcileBonusGrants failed", {
      userId,
      error: (e as Error).message,
    });
  }
};

/** Map a stored grant onto the Rewards-page row shape. */
const toRow = (ub: UserBonus, name?: string): BonusRewardRow => {
  const status: BonusRewardRow["status"] =
    ub.status === "CLAIMED"
      ? "CLAIMED"
      : ub.status === "EXPIRED"
        ? "EXPIRED"
        : "IN_PROGRESS";
  const label = `${name ?? "Bonus"} — ${ub.amount} ${ub.amount_type}`;
  return {
    id: ub.id,
    is_bonus: true,
    status,
    granted_date: ub.created_at ? new Date(ub.created_at).toISOString() : null,
    gamification_source: ub.source_type === "RANK" ? "rank" : "level",
    reward_type: "BONUS",
    reward: label,
    amount: ub.amount,
    amount_type: ub.amount_type,
    created_at: ub.created_at ? new Date(ub.created_at).toISOString() : "",
  };
};

/** The player's bonus rows for the Rewards page (status filter mirrors rewards). */
export const listUserBonusRows = async (
  userId: string,
  status?: string
): Promise<BonusRewardRow[]> => {
  // Map the rewards-status filter (IN_PROGRESS/CLAIMED) back to ledger status.
  let ledgerStatus: string | undefined;
  if (status) {
    const up = status.toUpperCase();
    ledgerStatus =
      up === "IN_PROGRESS" || up === "PENDING"
        ? "PENDING"
        : up === "CLAIMED"
          ? "CLAIMED"
          : up === "EXPIRED"
            ? "EXPIRED"
            : undefined;
  }
  const rows = await UserBonusRepository.listByUser(userId, ledgerStatus);
  // Resolve names for the labels in one pass.
  const names = new Map<string, string>();
  for (const r of rows) {
    if (!names.has(r.bonus_id)) {
      const bonus = await BonusRepository.findByPk(r.bonus_id);
      names.set(r.bonus_id, bonus?.bonus_name ?? "Bonus");
    }
  }
  return rows.map((r) => toRow(r, names.get(r.bonus_id)));
};

export const pendingBonusCount = (userId: string): Promise<number> =>
  UserBonusRepository.pendingCount(userId);

/** Result of a successful claim (returned to the frontend to refresh the wallet). */
export interface ClaimBonusResult {
  amount: number;
  amountType: "RM" | "BM";
  balance: number;
  real_money: number;
  bonus_money: number;
  /** Bonus identity — used to mirror the claim into GAMRU's user_bonuses. */
  bonusId: string;
  bonusName: string;
  sourceType: UserBonusSource;
  sourceId: string;
}

/**
 * Claim a PENDING bonus: credit the right wallet bucket, re-sum the balance,
 * flip the grant to CLAIMED. Runs in a transaction with a locked row reload so
 * the PENDING→CLAIMED check is race-safe (prevents a double credit).
 */
export const claimBonus = async (
  userId: string,
  userBonusId: string
): Promise<ClaimBonusResult> => {
  return sequelize.transaction(async (transaction) => {
    const ub = await UserBonus.findByPk(userBonusId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!ub || ub.user_id !== userId)
      throw new AppError("Bonus not found", 404);
    if (ub.status !== "PENDING")
      throw new AppError(`Bonus is ${ub.status.toLowerCase()}`, 409);

    const wallet = await WalletRepository.findOrCreateByUserId(userId);
    const amt = round2(Number(ub.amount));
    if (ub.amount_type === "RM") {
      wallet.real_money = round2(Number(wallet.real_money ?? 0) + amt);
    } else {
      wallet.bonus_money = round2(Number(wallet.bonus_money ?? 0) + amt);
    }
    wallet.balance = round2(
      Number(wallet.real_money ?? 0) + Number(wallet.bonus_money ?? 0)
    );
    await wallet.save({ transaction });

    await ub.update(
      { status: "CLAIMED", claimed_at: new Date() },
      { transaction }
    );

    const bonus = await BonusRepository.findByPk(ub.bonus_id);

    // Fire-and-forget (outside the wallet write path) — notify the player.
    void pushNotification(
      userId,
      "REWARD_UNLOCKED",
      `Bonus claimed: ${amt} ${ub.amount_type} 💰`,
      "Added to your wallet.",
      { userBonusId: ub.id, kind: "bonus" }
    );

    return {
      amount: amt,
      amountType: ub.amount_type,
      balance: wallet.balance,
      real_money: wallet.real_money,
      bonus_money: wallet.bonus_money,
      bonusId: ub.bonus_id,
      bonusName: bonus?.bonus_name ?? "Bonus",
      sourceType: ub.source_type,
      sourceId: ub.source_id,
    };
  });
};
