/**
 * Gamru-backed race service — THIN CONSUMER.
 *
 * GAMRU is the single source of truth for Races: it authors the definitions
 * AND owns all participation, scoring, ranking and prize settlement via the
 * `/api/races/*` integration API. Mirrors `tournament.service.ts`'s "thin
 * proxy" role, minus the local cache mirror / wallet crediting — Races are a
 * new feature with no local `user_races` table, so every call forwards
 * straight through and returns GAMRU's response as-is.
 */
import { AppError } from "../../../utils/AppError.ts";
import gamru, {
  type GamruIntRace,
  type GamruIntRaceProgress,
  type GamruIntLeaderboardEntry,
} from "../../../utils/gamruService.ts";

export type RaceDTO = GamruIntRace;

export const listRaces = async (email: string): Promise<RaceDTO[]> => {
  const res = await gamru.integration.races.list(email);
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Failed to load races", res.status ?? 502);
  }
  return res.body.races;
};

export interface RaceDetailResult {
  race: RaceDTO;
  leaderboard: GamruIntLeaderboardEntry[];
}

export const getRace = async (
  email: string,
  raceId: string
): Promise<RaceDetailResult> => {
  const res = await gamru.integration.races.get(raceId, email);
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Race not found", res.status ?? 404);
  }
  return res.body;
};

export const joinRace = async (
  email: string,
  raceId: string
): Promise<GamruIntRaceProgress> => {
  const res = await gamru.integration.races.join(raceId, email);
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Failed to join race", res.status ?? 502);
  }
  return res.body;
};

export const getRaceProgress = async (
  email: string,
  raceId: string
): Promise<GamruIntRaceProgress> => {
  const res = await gamru.integration.races.progress(raceId, email);
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to load race progress",
      res.status ?? 502
    );
  }
  return res.body;
};

export const getRaceLeaderboard = async (
  raceId: string,
  email: string,
  size?: number | null
): Promise<GamruIntLeaderboardEntry[]> => {
  const res = await gamru.integration.races.leaderboard(raceId, email, size);
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to load race leaderboard",
      res.status ?? 502
    );
  }
  return res.body.leaderboard;
};

export interface RecordRaceScoreResult {
  race_id: string;
  score: number;
  applied: number;
}

export const recordRaceScore = async (
  email: string,
  raceId: string,
  points: number,
  game?: string | null
): Promise<RecordRaceScoreResult> => {
  const res = await gamru.integration.races.score(raceId, {
    email,
    points: Math.max(0, Math.round(Number(points) || 0)),
    game,
  });
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to record race score",
      res.status ?? 502
    );
  }
  return res.body;
};

export const claimRace = async (
  email: string,
  raceId: string
): Promise<{ prize: number }> => {
  const res = await gamru.integration.races.claim(raceId, email);
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to claim race prize",
      res.status ?? 502
    );
  }
  return res.body;
};
