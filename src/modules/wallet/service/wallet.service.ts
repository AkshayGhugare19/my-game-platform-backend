import WalletRepository from "../model/wallet.repository.ts";
import type Wallet from "../model/wallet.model.ts";
import FreeSpinsGrantRepository from "../model/free-spins-grant.repository.ts";
import { AppError } from "../../../utils/AppError.ts";
import { syncDepositMade } from "../../../integration/gamruSync.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface FreeSpinsView {
  gameKey: string;
  remaining: number;
}

export interface WalletView {
  balance: number;
  realMoney: number;
  bonusMoney: number;
  currency: string;
  depositCount: number;
  totalDeposit: number;
  /** Free spins credited by a reward-shop purchase, grouped by game. */
  freeSpins: FreeSpinsView[];
}

const toView = async (wallet: Wallet): Promise<WalletView> => ({
  balance: round2(Number(wallet.balance ?? 0)),
  realMoney: round2(Number(wallet.real_money ?? 0)),
  bonusMoney: round2(Number(wallet.bonus_money ?? 0)),
  currency: wallet.currency ?? "USD",
  depositCount: Number(wallet.deposit_count ?? 0),
  totalDeposit: round2(Number(wallet.total_deposit ?? 0)),
  freeSpins: (await FreeSpinsGrantRepository.summaryByUser(wallet.user_id)).map((r) => ({
    gameKey: r.gameKey,
    remaining: r.remaining,
  })),
});

/** Current wallet for a user, creating an empty one on first access. */
export const getWallet = async (userId: string): Promise<WalletView> => {
  const wallet = await WalletRepository.findOrCreateByUserId(userId);
  return toView(wallet);
};

/**
 * Credit `real_money` or `bonus_money` directly — used for non-deposit
 * grants (e.g. a reward-shop purchase configured as Real/Bonus Cash). Unlike
 * `deposit()` below, this does NOT mirror to Gamru as a DEPOSIT_MADE event —
 * it isn't a deposit, so it must not move the player into the "depositor"
 * segment or count toward deposit totals.
 */
export const creditWallet = async (
  userId: string,
  amount: number,
  bucket: "real_money" | "bonus_money"
): Promise<WalletView> => {
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError("Credit amount must be a positive number", 400);
  }

  const wallet = await WalletRepository.findOrCreateByUserId(userId);
  wallet[bucket] = round2(Number(wallet[bucket] ?? 0) + value);
  wallet.balance = round2(
    Number(wallet.real_money ?? 0) + Number(wallet.bonus_money ?? 0)
  );
  await wallet.save();

  return toView(wallet);
};

/** Credit free spins on one game — used by a reward-shop "Free Spins" purchase. */
export const creditFreeSpins = async (
  userId: string,
  gameKey: string,
  quantity: number,
  source: string,
  sourceId: string
): Promise<void> => {
  const qty = Math.max(1, Math.floor(Number(quantity) || 0));
  await FreeSpinsGrantRepository.create({
    user_id: userId,
    game_key: gameKey,
    quantity_total: qty,
    quantity_remaining: qty,
    source,
    source_id: sourceId,
  });
};

/**
 * Apply a reward gamru just claimed on the player's behalf (mission,
 * tournament, challenge, race, or reward-shop purchase — see each
 * `applied.type` field on those claim responses) to this platform's own
 * wallet / free-spins ledger. gamru itself only ever credits `xp`/`tokens`
 * (its own native currencies, applied inside its own claim transaction);
 * everything else needs the local credit below since it's the only place
 * those balances exist. Best-effort: a failure here must never surface as a
 * failed claim — the player already has the claim recorded in gamru's
 * ledger, so log and move on rather than throw.
 */
export const applyClaimedReward = async (
  userId: string,
  applied: { type: string; amount: number },
  rewardGame: string | null,
  source: string,
  sourceId: string
): Promise<void> => {
  const { type, amount } = applied;
  if (!(amount > 0)) return;
  try {
    if (type === "real_cash") {
      await creditWallet(userId, amount, "real_money");
    } else if (type === "bonus_cash") {
      await creditWallet(userId, amount, "bonus_money");
    } else if (type === "free_spins" && rewardGame) {
      await creditFreeSpins(userId, rewardGame, amount, source, sourceId);
    } else if (type === "free_spins" && !rewardGame) {
      // The admin configured "Free Spins" but left "Reward Game" blank on the
      // source mission/tournament/challenge/race — gamru has nothing to tell
      // us which game to credit. Surfaced loudly (was previously a true
      // no-op with zero logging) so a misconfigured reward doesn't look like
      // a successful claim with the player's spins simply missing.
      console.error("Free spins claim has no reward_game configured — nothing credited:", {
        userId,
        source,
        sourceId,
        amount,
      });
    }
    // "xp"/"tokens" are already applied by gamru itself; every other legacy
    // label (e.g. "bonus_bets", "points") has no wallet bucket on this
    // platform, so it's intentionally left as a no-op here (same as before
    // this fix — still recorded in gamru's reward ledger either way).
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to apply claimed reward to local wallet:", {
      userId,
      applied,
      rewardGame,
      source,
      sourceId,
      error: (err as Error).message,
    });
  }
};

/**
 * Credit the user's wallet by `amount`, then mirror the deposit to Gamru so
 * the player moves from the "no_deposit" segment into "depositor". The Gamru
 * push is fire-and-forget — a CRM outage must never fail the deposit.
 */
export const deposit = async (
  userId: string,
  email: string,
  amount: number
): Promise<WalletView> => {
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError("Deposit amount must be a positive number", 400);
  }

  const wallet = await WalletRepository.findOrCreateByUserId(userId);
  // A deposit is Real Money. Credit RM and keep the invariant
  // balance = real_money + bonus_money.
  wallet.real_money = round2(Number(wallet.real_money ?? 0) + value);
  wallet.balance = round2(
    Number(wallet.real_money ?? 0) + Number(wallet.bonus_money ?? 0)
  );
  wallet.deposit_count = Number(wallet.deposit_count ?? 0) + 1;
  wallet.total_deposit = round2(Number(wallet.total_deposit ?? 0) + value);
  await wallet.save();

  syncDepositMade(userId, value, email, {
    deposit_count: wallet.deposit_count,
    balance_after: wallet.balance,
  });

  return await toView(wallet);
};
