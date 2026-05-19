import { bus } from "./eventBus";
import {
  EVENTS,
  UserRegisteredPayload,
  XpAwardedPayload,
  ActivityRecordedPayload,
  StreakUpdatedPayload,
  LevelUpPayload,
  RankUpPayload,
  MissionCompletedPayload,
  MissionProgressPayload,
  RewardGrantedPayload,
} from "./events";
import { pushNotification } from "../modules/notification/service/notification.service";
import { broadcastTop } from "../modules/leaderboard/service/leaderboard.service";
import { progressMissions } from "../modules/mission/service/mission.engine";
import { unlockByRank } from "../modules/reward/service/reward.engine";
import { emitToUser } from "../realtime/socket";
import { MissionMetric } from "../modules/mission/model/mission.model";

/** Maps an activity type → the mission metric it advances. */
const METRIC_BY_TYPE: Record<string, MissionMetric> = {
  GAME_PLAY: "GAMES_PLAYED",
  BET_PLACE: "BETS_PLACED",
};

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
    await progressMissions(p.userId, "XP_EARNED", p.amount);
    emitToUser(p.userId, "xp:awarded", {
      amount: p.amount,
      xpTotal: p.xpTotal,
    });
  });

  bus.on<ActivityRecordedPayload>(EVENTS.ACTIVITY_RECORDED, async (p) => {
    const metric = METRIC_BY_TYPE[p.type];
    if (metric) await progressMissions(p.userId, metric, 1);
  });

  bus.on<StreakUpdatedPayload>(EVENTS.STREAK_UPDATED, async (p) => {
    await progressMissions(p.userId, "LOGIN_DAYS", 1);
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
