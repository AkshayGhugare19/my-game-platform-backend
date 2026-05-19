/** Typed domain-event contracts carried by the in-process event bus. */

export const EVENTS = {
  USER_REGISTERED: "user.registered",
  ACTIVITY_RECORDED: "activity.recorded",
  XP_AWARDED: "xp.awarded",
  LEVEL_UP: "level.up",
  RANK_UP: "rank.up",
  MISSION_PROGRESS: "mission.progress",
  MISSION_COMPLETED: "mission.completed",
  REWARD_GRANTED: "reward.granted",
  STREAK_UPDATED: "streak.updated",
} as const;

export interface UserRegisteredPayload {
  userId: string;
  email: string;
}
export interface ActivityRecordedPayload {
  userId: string;
  type: string;
  ruleCode: string;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}
export interface XpAwardedPayload {
  userId: string;
  amount: number;
  xpTotal: number;
  source: string;
}
export interface LevelUpPayload {
  userId: string;
  from: number;
  to: number;
  perks: unknown;
}
export interface RankUpPayload {
  userId: string;
  from: string;
  to: string;
  unlocks: unknown;
}
export interface MissionProgressPayload {
  userId: string;
  missionId: string;
  progress: number;
  target: number;
  status: string;
}
export interface MissionCompletedPayload {
  userId: string;
  missionId: string;
  title: string;
  rewardXp: number;
}
export interface RewardGrantedPayload {
  userId: string;
  rewardId: string;
  name: string;
  type: string;
}
export interface StreakUpdatedPayload {
  userId: string;
  current: number;
  longest: number;
}
