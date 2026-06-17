import { bus } from "./eventBus.ts";
import type {
  UserRegisteredPayload,
  XpAwardedPayload,
  ActivityRecordedPayload,
  StreakUpdatedPayload,
  LevelUpPayload,
  RankUpPayload,
  MissionCompletedPayload,
  MissionProgressPayload,
  RewardGrantedPayload} from "./events.ts";
import {
  EVENTS
} from "./events.ts";
import { pushNotification } from "../modules/notification/service/notification.service.ts";
import { broadcastTop } from "../modules/leaderboard/service/leaderboard.service.ts";
import {
  advanceForActivity,
  advanceForLogin,
} from "../modules/mission/service/mission.engine.ts";
import { unlockByRank } from "../modules/reward/service/reward.engine.ts";
import { emitToUser } from "../realtime/socket.ts";

/**
 * Wires every engine to the domain event bus exactly once at boot.
 * This is the single integration seam (swap for BullMQ to scale — see
 * DEPLOYMENT.md). Handlers are isolated/async by the bus itself.
 */
export const registerEventHandlers = (): void => {
  bus.on<UserRegisteredPayload>(EVENTS.USER_REGISTERED, async (p) => {
    await pushNotification(
      p.userId,
      "SYSTEM",
      "Welcome to Gamify Engage! 🎮",
      "Your journey starts now. Play to earn XP, level up and climb the ranks."
    );
  });

  bus.on<XpAwardedPayload>(EVENTS.XP_AWARDED, async (p) => {
    void broadcastTop();
    emitToUser(p.userId, "xp:awarded", {
      amount: p.amount,
      xpTotal: p.xpTotal,
    });
  });

  bus.on<ActivityRecordedPayload>(EVENTS.ACTIVITY_RECORDED, async (p) => {
    // Build this play's signal from the activity meta. `bet` is the stake
    // (turnover) — used for wager missions and the min-bet gate; `win` /
    // `winAmount` drive win missions. `amount` (the activity XP/win amount)
    // is only a fallback for the stake.
    const m = (p.meta ?? {}) as Record<string, unknown>;
    const stake = Number((m.bet as number | undefined) ?? p.amount ?? 0) || 0;
    const win = Boolean(m.win);
    const winAmount =
      Number((m.winAmount as number | undefined) ?? (win ? p.amount : 0)) || 0;
    const gameKey =
      (m.game as string | undefined) ??
      (m.gameId as string | undefined) ??
      (m.name as string | undefined) ??
      null;
    // Mission/bundle context set when the game was launched from a mission or
    // bundle card (carried in the activity meta) — advances only that track.
    const missionId = (m.mission as string | undefined) ?? null;
    const bundleId = (m.bundle as string | undefined) ?? null;
    await advanceForActivity(
      p.userId,
      { stake, win, winAmount, gameKey },
      { missionId, bundleId }
    );
  });

  bus.on<StreakUpdatedPayload>(EVENTS.STREAK_UPDATED, async (p) => {
    await advanceForLogin(p.userId);
    emitToUser(p.userId, "streak:updated", {
      current: p.current,
      longest: p.longest,
    });
    if ([7, 30, 100].includes(p.current)) {
      await pushNotification(
        p.userId,
        "STREAK",
        `🔥 ${p.current}-day streak!`,
        "Keep the streak alive for bigger bonuses."
      );
    }
  });

  bus.on<LevelUpPayload>(EVENTS.LEVEL_UP, async (p) => {
    emitToUser(p.userId, "level:up", { from: p.from, to: p.to, perks: p.perks });
    await pushNotification(
      p.userId,
      "LEVEL_UP",
      `Level Up! You reached Level ${p.to} 🚀`,
      `From level ${p.from} to ${p.to}.`,
      { from: p.from, to: p.to }
    );
  });

  bus.on<RankUpPayload>(EVENTS.RANK_UP, async (p) => {
    await unlockByRank(p.userId, p.to);
    emitToUser(p.userId, "rank:up", {
      from: p.from,
      to: p.to,
      unlocks: p.unlocks,
    });
    await pushNotification(
      p.userId,
      "RANK_UP",
      `New Rank: ${p.to} 🏆`,
      `Promoted from ${p.from} to ${p.to}. New rewards unlocked!`,
      { from: p.from, to: p.to }
    );
  });

  bus.on<MissionProgressPayload>(EVENTS.MISSION_PROGRESS, (p) => {
    emitToUser(p.userId, "mission:progress", p);
  });

  bus.on<MissionCompletedPayload>(EVENTS.MISSION_COMPLETED, async (p) => {
    emitToUser(p.userId, "mission:completed", {
      missionId: p.missionId,
      title: p.title,
      rewardXp: p.rewardXp,
    });
    await pushNotification(
      p.userId,
      "MISSION_COMPLETED",
      `Mission complete: ${p.title} ✅`,
      `Claim your reward of ${p.rewardXp} XP.`,
      { missionId: p.missionId }
    );
  });

  bus.on<RewardGrantedPayload>(EVENTS.REWARD_GRANTED, async (p) => {
    emitToUser(p.userId, "reward:granted", {
      rewardId: p.rewardId,
      name: p.name,
      type: p.type,
    });
    await pushNotification(
      p.userId,
      "REWARD_UNLOCKED",
      `Reward unlocked: ${p.name} 🎁`,
      "Claim it from your Rewards page.",
      { rewardId: p.rewardId }
    );
  });

  // eslint-disable-next-line no-console
  console.log("✅ Event handlers registered");
};
