import { AppError } from "../../../utils/AppError.ts";
import { logger } from "../../../utils/logger.ts";
import type { HamaraUserProfileData} from "../../../utils/hamaraEngageService.ts";
import { hamaraUserProfileData } from "../../../utils/hamaraEngageService.ts";
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

export interface GamificationProfile {
  user: ProfileUser;
  xpTotal: number;
  level: number;
  rank: RankInfo;
  coins: number;
  streak: { current: number; longest: number };
  progress: LevelProgress;
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

const fetchHamara = async (
  email: string
): Promise<HamaraUserProfileData | null> => {
  const res = await hamaraUserProfileData(email);
  if (!res.ok || !res.body) {
    logger.warn("Hamara profile unavailable; serving local fallback", {
      email,
      status: res.status,
      error: res.error,
    });
    return null;
  }
  return res.body;
};

const buildProgress = (
  level: number,
  xpTotal: number,
  xpToNext: number,
  isMaxLevel: boolean
): LevelProgress => {
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

  const userDataRes = await fetchHamara(email);

  const xpTotal = Number(userDataRes?.xp_points ?? 0);
  const level = Number(userDataRes?.level ?? 1);
  const maxLevel = Number(userDataRes?.max_level ?? level);
  const xpToNext = Number(userDataRes?.xp_to_next ?? 0);
  const coins = Number(userDataRes?.tokens ?? 0);
  const isMaxLevel = maxLevel > 0 && level >= maxLevel;

  const rankName = userDataRes?.rank_name;
  const rank: RankInfo = rankName
    ? { code: String(rankName).toUpperCase(), name: titleCase(String(rankName)), next: null }
    : EMPTY_RANK;

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
    xpTotal,
    level,
    rank,
    coins,
    streak: { current: 0, longest: 0 },
    progress: buildProgress(level, xpTotal, xpToNext, isMaxLevel),
  };
};

export const getXpHistory = async (
  email: string,
  page: number,
  limit: number
): Promise<PaginatedXpHistory> => {
  const userDataRes = await fetchHamara(email);
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
