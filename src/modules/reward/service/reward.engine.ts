import { AppError } from "../../../utils/AppError";
import RewardRepository from "../model/reward.repository";
import UserRewardRepository from "../model/user-reward.repository";
import { bus } from "../../../events/eventBus";
import { EVENTS } from "../../../events/events";

const expiryDate = (days: number | null): Date | null =>
  days ? new Date(Date.now() + days * 86400000) : null;

/** Grant every active reward gated on a rank when the user reaches it. */
export const unlockByRank = async (
  userId: string,
  rankCode: string
): Promise<void> => {
  const rewards = await RewardRepository.activeByRank(rankCode);
  for (const reward of rewards) {
    const owned = await UserRewardRepository.exists(userId, reward.id);
    if (owned) continue;
    await UserRewardRepository.create({
      user_id: userId,
      reward_id: reward.id,
      source: "RANK",
      status: "GRANTED",
      expires_at: expiryDate(reward.expires_in_days ?? null),
    });
    bus.emit(EVENTS.REWARD_GRANTED, {
      userId,
      rewardId: reward.id,
      name: reward.name,
      type: reward.type,
    });
  }
};

/** Grant a specific reward (mission/level/admin). Honors limited stock. */
export const grantReward = async (
  userId: string,
  rewardId: string,
  source: "MISSION" | "LEVEL" | "ADMIN"
): Promise<void> => {
  const reward = await RewardRepository.findByPk(rewardId);
  if (!reward || !reward.active) return;
  if (reward.stock != null) {
    if (reward.stock <= 0) throw new AppError("Reward out of stock", 409);
    await reward.update({ stock: reward.stock - 1 });
  }
  await UserRewardRepository.create({
    user_id: userId,
    reward_id: reward.id,
    source,
    status: "GRANTED",
    expires_at: expiryDate(reward.expires_in_days ?? null),
  });
  bus.emit(EVENTS.REWARD_GRANTED, {
    userId,
    rewardId: reward.id,
    name: reward.name,
    type: reward.type,
  });
};

/** User claims a GRANTED reward — applies its effect. */
export const claimReward = async (
  userId: string,
  userRewardId: string
): Promise<{ type: string; applied: Record<string, unknown> }> => {
  const ur = await UserRewardRepository.findByPk(userRewardId);
  if (!ur || ur.user_id !== userId)
    throw new AppError("Reward not found", 404);
  if (ur.status !== "GRANTED")
    throw new AppError(`Reward is ${ur.status.toLowerCase()}`, 409);
  if (ur.expires_at && ur.expires_at < new Date()) {
    await ur.update({ status: "EXPIRED" });
    throw new AppError("Reward expired", 409);
  }

  const reward = await RewardRepository.findByPk(ur.reward_id);
  if (!reward) throw new AppError("Reward not found", 404);

  const value = (reward.value || {}) as Record<string, number | string>;
  const applied: Record<string, unknown> = {};

  switch (reward.type) {
    case "COINS":
    case "BONUS_POINTS": {
      // Coin balance lived on the removed GamificationProfile; the reward
      // is marked claimed and the amount reported, but nothing is credited.
      applied.coins = Number(value.coins ?? 0);
      break;
    }
    case "COUPON":
      applied.coupon = value.coupon ?? reward.code;
      break;
    case "BADGE":
    case "UNLOCKABLE":
    case "FEATURE_ACCESS":
      applied.unlocked = reward.code;
      break;
  }

  await ur.update({ status: "CLAIMED", claimed_at: new Date(), meta: applied });
  return { type: reward.type, applied };
};

/** Cron: expire GRANTED rewards past their expiry. */
export const expirySweep = async (): Promise<number> => {
  const now = new Date();
  const stale = await UserRewardRepository.expiredGranted(now);
  for (const ur of stale) await ur.update({ status: "EXPIRED" });
  return stale.length;
};
