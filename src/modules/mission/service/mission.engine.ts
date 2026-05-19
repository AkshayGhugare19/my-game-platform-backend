import { AppError } from "../../../utils/AppError.ts";
import { periodKeyFor } from "../../../utils/period.ts";
import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import MissionRepository from "../model/mission.repository.ts";
import UserMissionRepository from "../model/user-mission.repository.ts";
import { Mission, MissionMetric } from "../model/mission.model.ts";
import RankTierRepository from "../../rank/model/rank-tier.repository.ts";
import { awardXp } from "../../xp/service/xp.engine.ts";
import { grantReward } from "../../reward/service/reward.engine.ts";

const rankAllows = async (
  required: string | null,
  rankCode: string
): Promise<boolean> => {
  if (!required) return true;
  const [need, have] = await Promise.all([
    RankTierRepository.byCode(required),
    RankTierRepository.byCode(rankCode),
  ]);
  return !!need && !!have && have.order >= need.order;
};

const getOrCreateUserMission = async (userId: string, m: Mission) => {
  const periodKey = periodKeyFor(m.type);
  let um = await UserMissionRepository.find(userId, m.id, periodKey);
  if (!um) {
    um = await UserMissionRepository.create({
      user_id: userId,
      mission_id: m.id,
      progress: 0,
      target: m.target,
      status: "IN_PROGRESS",
      period_key: periodKey,
    });
  }
  return um;
};

/** Create current-period rows for a freshly registered user. */
export const seedInitialUserMissions = async (
  userId: string
): Promise<void> => {
  const missions = await MissionRepository.activeCatalog();
  for (const m of missions) {
    if (await rankAllows(m.required_rank ?? null, "BEGINNER"))
      await getOrCreateUserMission(userId, m);
  }
};

/** Advance every matching mission's counter; emit completion. */
export const progressMissions = async (
  userId: string,
  metric: MissionMetric,
  delta: number
): Promise<void> => {
  if (delta <= 0) return;

  // Rank gating defaults to BEGINNER: the per-user rank store
  // (GamificationProfile) was removed, so no user has a higher rank.
  const missions = await MissionRepository.activeByMetric(metric);
  for (const m of missions) {
    if (!(await rankAllows(m.required_rank ?? null, "BEGINNER"))) continue;

    const um = await getOrCreateUserMission(userId, m);
    if (["COMPLETED", "CLAIMED", "EXPIRED"].includes(um.status)) continue;

    um.progress = Math.min(um.progress + delta, um.target);
    if (um.progress >= um.target) {
      um.status = "COMPLETED";
      um.completed_at = new Date();
      await um.save();
      bus.emit(EVENTS.MISSION_COMPLETED, {
        userId,
        missionId: m.id,
        title: m.title,
        rewardXp: m.reward_xp,
      });
    } else {
      await um.save();
      bus.emit(EVENTS.MISSION_PROGRESS, {
        userId,
        missionId: m.id,
        progress: um.progress,
        target: um.target,
        status: um.status,
      });
    }
  }
};

/** User claims a COMPLETED mission → XP + coins + reward, then CLAIMED. */
export const claimMission = async (
  userId: string,
  missionId: string
): Promise<{ rewardXp: number; rewardCoins: number }> => {
  const mission = await MissionRepository.findByPk(missionId);
  if (!mission) throw new AppError("Mission not found", 404);

  const periodKey = periodKeyFor(mission.type);
  const um = await UserMissionRepository.find(userId, missionId, periodKey);
  if (!um) throw new AppError("Mission not started", 404);
  if (um.status === "CLAIMED")
    throw new AppError("Mission reward already claimed", 409);
  if (um.status !== "COMPLETED")
    throw new AppError("Mission not completed yet", 409);

  if (mission.reward_xp > 0) {
    await awardXp({
      userId,
      ruleCode: `MISSION:${mission.code}`,
      source: "MISSION",
      fixedAmount: mission.reward_xp,
      idempotencyKey: `mission:${um.id}`,
      meta: { missionId },
    });
  }
  // reward_coins is no longer credited: the coin balance lived on the
  // removed GamificationProfile. The amount is still reported below.
  if (mission.reward_id) {
    await grantReward(userId, mission.reward_id, "MISSION");
  }

  um.status = "CLAIMED";
  await um.save();
  return { rewardXp: mission.reward_xp, rewardCoins: mission.reward_coins };
};

export const listUserMissions = async (userId: string) => {
  const [missions, userMissions] = await Promise.all([
    MissionRepository.activeCatalog(),
    UserMissionRepository.listByUser(userId),
  ]);
  return missions.map((m) => {
    const um = userMissions.find(
      (x) => x.mission_id === m.id && x.period_key === periodKeyFor(m.type)
    );
    return {
      id: m.id,
      code: m.code,
      title: m.title,
      description: m.description,
      type: m.type,
      metric: m.metric,
      target: m.target,
      reward_xp: m.reward_xp,
      reward_coins: m.reward_coins,
      progress: um?.progress ?? 0,
      status: um?.status ?? "IN_PROGRESS",
    };
  });
};
