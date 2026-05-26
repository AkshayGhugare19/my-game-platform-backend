import { AppError } from "../../../utils/AppError.ts";
import { logger } from "../../../utils/logger.ts";
import type {
  GamruUserProfileData,
  GamruLevelTier,
} from "../../../utils/gamruService.ts";
import { gamruUserProfileData } from "../../../utils/gamruService.ts";
import UserRepository from "../../user/model/user.repository.ts";

interface ProfileUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface RankInfo {
  code: string;
  name: string;
  next: {
    code: string;
    name: string;
    minXp: number;
    minLevel: number;
  } | null;
}

interface LevelProgress {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  nextLevelXp: number | null;
  progressPct: number;
}

/** The rank the player is climbing toward, with its unlock reward. */
export interface NextRank {
  code: string;
  name: string;
  level: number;
  xpRequired: number;
  xpRemaining: number;
  rewardType: string | null;
  rewardValue: number | null;
}

/** A single level band in the player's progression roadmap. */
export interface LevelTier {
  level: number;
  rankCode: string;
  rankName: string;
  xpStart: number;
  xpEnd: number;
  rewardType: string | null;
  rewardValue: number | null;
  state: "completed" | "current" | "locked";
}

/** A rank tier as defined in Gamru (simplified for the client). */
export interface RankTier {
  id: string;
  code: string;
  name: string;
  description: string;
}

/** An audited gamification action (XP adjustments, rank ups, …). */
export interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  created_at: string;
}

export interface GamificationProfile {
  user: ProfileUser;
  xpTotal: number;
  level: number;
  maxLevel: number;
  rank: RankInfo;
  coins: number;
  streak: { current: number; longest: number };
  progress: LevelProgress;
  nextRank: NextRank | null;
  levels: LevelTier[];
  ranks: RankTier[];
  logs: ActivityLog[];
}

export interface XpHistoryRow {
  id: string;
  source: string;
  rule_code: string | null;
  xp_amount: number;
  balance_after: number;
  created_at: string;
}

export interface PaginatedXpHistory {
  data: XpHistoryRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const EMPTY_RANK: RankInfo = { code: "UNRANKED", name: "Unranked", next: null };

const titleCase = (s: string): string =>
  s
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fetchGamru = async (
  email: string
): Promise<GamruUserProfileData | null> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    logger.warn("Gamru profile unavailable; serving local fallback", {
      email,
      status: res.status,
      error: res.error,
    });
    return null;
  }
  return res.body;
};

/**
 * Progress *within the current level band*. When Gamru gives us the
 * `levels` roadmap we anchor to the real `xp_start`/`xp_end` of the
 * level (so e.g. 150 XP at level 2 of a 100–200 band reads as 50/100,
 * not 75%). Without the roadmap we fall back to the flat
 * `xp_to_next` estimate.
 */
const buildProgress = (
  level: number,
  xpTotal: number,
  xpToNext: number,
  isMaxLevel: boolean,
  levels: GamruLevelTier[]
): LevelProgress => {
  const band = levels.find((l) => Number(l.level) === level);
  if (band) {
    const xpStart = Number(band.xp_start ?? 0);
    const xpEnd = Number(band.xp_end ?? xpStart);
    const span = Math.max(1, xpEnd - xpStart);
    const xpIntoLevel = Math.max(0, xpTotal - xpStart);
    if (isMaxLevel) {
      return { level, xpTotal, xpIntoLevel, nextLevelXp: null, progressPct: 100 };
    }
    const progressPct = Math.min(
      100,
      Math.max(0, Math.round((xpIntoLevel / span) * 100))
    );
    return { level, xpTotal, xpIntoLevel, nextLevelXp: span, progressPct };
  }

  if (isMaxLevel || xpToNext <= 0) {
    return {
      level,
      xpTotal,
      xpIntoLevel: xpTotal,
      nextLevelXp: null,
      progressPct: 100,
    };
  }
  const nextLevelXp = xpTotal + xpToNext;
  const span = Math.max(1, nextLevelXp);
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round((xpTotal / span) * 100))
  );
  return { level, xpTotal, xpIntoLevel: xpTotal, nextLevelXp, progressPct };
};

export const getProfile = async (
  email: string
): Promise<GamificationProfile> => {
  const user = await UserRepository.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  const userDataRes = await fetchGamru(email);
  const g = userDataRes?.gamification;
  const progress = g?.progress;

  // `gamification.progress` is the authoritative snapshot; fall back to
  // the flat top-level fields, then to safe zeroes (Gamru may be down).
  const xpTotal = Number(progress?.xp_points ?? userDataRes?.xp_points ?? 0);
  const level = Number(progress?.level ?? userDataRes?.level ?? 1);
  const maxLevel = Number(
    progress?.max_level ?? userDataRes?.max_level ?? level
  );
  const xpToNext = Number(
    progress?.xp_to_next ?? userDataRes?.xp_to_next ?? 0
  );
  const coins = Number(userDataRes?.tokens ?? 0);
  const isMaxLevel = maxLevel > 0 && level >= maxLevel;

  const nextRankRaw = g?.next_rank ?? null;
  const nextRank: NextRank | null =
    nextRankRaw && nextRankRaw.rank_name
      ? {
          code: String(nextRankRaw.rank_name).toUpperCase(),
          name: titleCase(String(nextRankRaw.rank_name)),
          level: Number(nextRankRaw.level ?? 0),
          xpRequired: Number(nextRankRaw.xp_required ?? 0),
          xpRemaining: Number(nextRankRaw.xp_remaining ?? 0),
          rewardType: nextRankRaw.reward_type ?? null,
          rewardValue:
            nextRankRaw.reward_value == null
              ? null
              : Number(nextRankRaw.reward_value),
        }
      : null;

  const rankName = progress?.rank_name ?? userDataRes?.rank_name;
  const rank: RankInfo = rankName
    ? {
        code: String(rankName).toUpperCase(),
        name: titleCase(String(rankName)),
        next: nextRank
          ? {
              code: nextRank.code,
              name: nextRank.name,
              minXp: nextRank.xpRequired,
              minLevel: nextRank.level,
            }
          : null,
      }
    : EMPTY_RANK;

  const levelTiers: GamruLevelTier[] = Array.isArray(g?.levels)
    ? g!.levels!
    : [];
  const levels: LevelTier[] = levelTiers
    .map((t) => ({
      level: Number(t.level ?? 0),
      rankCode: String(t.rank_name ?? "").toUpperCase(),
      rankName: titleCase(String(t.rank_name ?? "")),
      xpStart: Number(t.xp_start ?? 0),
      xpEnd: Number(t.xp_end ?? 0),
      rewardType: t.reward_type ?? null,
      rewardValue: t.reward_value == null ? null : Number(t.reward_value),
      state: (level > Number(t.level ?? 0)
        ? "completed"
        : level === Number(t.level ?? 0)
          ? "current"
          : "locked") as LevelTier["state"],
    }))
    .sort((a, b) => a.level - b.level);

  const ranks: RankTier[] = Array.isArray(g?.ranks)
    ? g!.ranks!.map((r) => ({
        id: String(r.id ?? ""),
        code: String(r.name ?? "").toUpperCase(),
        name: titleCase(String(r.name ?? "")),
        description: String(r.description ?? ""),
      }))
    : [];

  const logs: ActivityLog[] = Array.isArray(g?.logs)
    ? g!.logs!.map((l) => ({
        id: l.id,
        action: l.action,
        detail: l.detail,
        actor: l.actor,
        created_at: l.created_at,
      }))
    : [];

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
    xpTotal,
    level,
    maxLevel,
    rank,
    coins,
    streak: { current: 0, longest: 0 },
    progress: buildProgress(level, xpTotal, xpToNext, isMaxLevel, levelTiers),
    nextRank,
    levels,
    ranks,
    logs,
  };
};

export const getXpHistory = async (
  email: string,
  page: number,
  limit: number
): Promise<PaginatedXpHistory> => {
  const userDataRes = await fetchGamru(email);
  const rows = Array.isArray(userDataRes?.xp_history) ? userDataRes!.xp_history! : [];

  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};
