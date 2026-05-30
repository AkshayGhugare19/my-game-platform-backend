import WalletRepository from "../model/wallet.repository.ts";
import type Wallet from "../model/wallet.model.ts";
import { AppError } from "../../../utils/AppError.ts";
import { syncDepositMade } from "../../../integration/gamruSync.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface WalletView {
  balance: number;
  currency: string;
  depositCount: number;
  totalDeposit: number;
}

const toView = (wallet: Wallet): WalletView => ({
  balance: round2(Number(wallet.balance ?? 0)),
  currency: wallet.currency ?? "USD",
  depositCount: Number(wallet.deposit_count ?? 0),
  totalDeposit: round2(Number(wallet.total_deposit ?? 0)),
});

/** Current wallet for a user, creating an empty one on first access. */
export const getWallet = async (userId: string): Promise<WalletView> => {
  const wallet = await WalletRepository.findOrCreateByUserId(userId);
  return toView(wallet);
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
  wallet.balance = round2(Number(wallet.balance ?? 0) + value);
  wallet.deposit_count = Number(wallet.deposit_count ?? 0) + 1;
  wallet.total_deposit = round2(Number(wallet.total_deposit ?? 0) + value);
  await wallet.save();

  syncDepositMade(userId, value, email, {
    deposit_count: wallet.deposit_count,
    balance_after: wallet.balance,
  });

  return toView(wallet);
};
