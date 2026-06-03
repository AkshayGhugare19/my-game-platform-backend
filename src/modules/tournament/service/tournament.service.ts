import { Op } from "sequelize";
import { AppError } from "../../../utils/AppError.ts";
import { logger } from "../../../utils/logger.ts";
import gamru, {
  gamruUserProfileData,
  type GamruTournament,
  type GamruWidgetsConfig,
} from "../../../utils/gamruService.ts";
import UserTournamentRepository from "../model/user-tournament.repository.ts";
import UserRepository from "../../user/model/user.repository.ts";

/** Lifecycle state derived from the tournament's start / end dates. */
export type TournamentState = "SCHEDULED" | "IN_PROGRESS" | "ENDED";

export interface TournamentDTO {
  id: string;
  name: string;
  description: string | null;
  industry: string; // "Casino" | "Sports" | …
  tournament_type: string | null;
  /** Game route keys the player can launch for this tournament. */
  games: string[];
  period: string | null;
  large_image: string | null;
  small_image: string | null;
  min_bet: number | null;
  max_bets: number | null;
  buy_in: number | null;
  start_date: string | null;
  end_date: string | null;
  leaderboard_size: number | null;
  prize_pool: number | null;
  eligibility_type: string | null;
  segment: string | null;
  tags: string[];
  state: TournamentState;
}

export interface TournamentBranding {
  banner_desktop: string | null;
  banner_mobile: string | null;
  tag_color_casino: string;
  tag_color_sport: string;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  score: number;
  is_me: boolean;
}

const DEFAULT_BRANDING: TournamentBranding = {
  banner_desktop: null,
  banner_mobile: null,
  tag_color_casino: "#9013fe",
  tag_color_sport: "#417505",
};

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/** Normalize the tournament's game list, tolerating the legacy single field. */
const toGames = (d: GamruTournament["data"]): string[] => {
  const list = Array.isArray(d?.games) ? d!.games : [];
  const cleaned = list.map((g) => String(g).trim()).filter(Boolean);
  if (cleaned.length > 0) return Array.from(new Set(cleaned));
  const single = toStr(d?.game);
  return single ? [single] : [];
};

/**
 * Parse a tournament date, but only trust it if it actually looks like a real
 * date. The wizard fields are free-text, so operators may type junk like "5"
 * or "10" — `Date.parse("10")` yields the year 2001, which would wrongly mark
 * a live tournament as ENDED. We reject bare numbers, very short strings, and
 * implausible years, returning null ("unknown") for anything untrustworthy.
 */
const parseTrustworthyDate = (v: string | null): number | null => {
  if (!v) return null;
  const s = v.trim();
  if (s.length < 6) return null; // too short to be a real date
  if (/^\d+$/.test(s)) return null; // a bare number is not a date
  const ts = Date.parse(s);
  if (Number.isNaN(ts)) return null;
  const year = new Date(ts).getFullYear();
  if (year < 2000 || year > 2100) return null; // implausible
  return ts;
};

/**
 * Derive a lifecycle state from the (free-text) start / end dates. When the
 * dates are missing or untrustworthy, an ACTIVE tournament defaults to
 * IN_PROGRESS so players can still register and play — we only mark ENDED when
 * there is a clearly-valid end date in the past.
 */
const deriveState = (
  startDate: string | null,
  endDate: string | null
): TournamentState => {
  const now = Date.now();
  const start = parseTrustworthyDate(startDate);
  const end = parseTrustworthyDate(endDate);

  if (end !== null && now > end) return "ENDED";
  if (start !== null && now < start) return "SCHEDULED";
  return "IN_PROGRESS";
};

const mapTournament = (t: GamruTournament): TournamentDTO => {
  const d = t.data ?? {};
  const start_date = toStr(d.start_date);
  const end_date = toStr(d.end_date);
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    industry: toStr(d.industry) ?? "Casino",
    tournament_type: toStr(d.tournament_type),
    games: toGames(d),
    period: toStr(d.period),
    large_image: toStr(d.large_image),
    small_image: toStr(d.small_image),
    min_bet: toNum(d.min_bet),
    max_bets: toNum(d.max_bets),
    buy_in: toNum(d.buy_in),
    start_date,
    end_date,
    leaderboard_size: toNum(d.leaderboard_size),
    prize_pool: toNum(d.prize_pool),
    eligibility_type: toStr(d.eligibility_type),
    segment: toStr(d.segment),
    tags: Array.isArray(t.tags) ? t.tags : [],
    state: deriveState(start_date, end_date),
  };
};

const mapBranding = (cfg: GamruWidgetsConfig | null | undefined): TournamentBranding => ({
  banner_desktop: toStr(cfg?.tournaments_banner_desktop),
  banner_mobile: toStr(cfg?.tournaments_banner_mobile),
  tag_color_casino:
    toStr(cfg?.tournaments_tag_color_casino) ?? DEFAULT_BRANDING.tag_color_casino,
  tag_color_sport:
    toStr(cfg?.tournaments_tag_color_sport) ?? DEFAULT_BRANDING.tag_color_sport,
});

/**
 * Fetch the live tournament catalog from Gamru for this player and merge in
 * their local participation. Never throws on a Gamru outage — returns an
 * empty catalog so the page still renders.
 */
const loadCatalog = async (
  email: string
): Promise<{ tournaments: GamruTournament[]; branding: TournamentBranding }> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    return { tournaments: [], branding: DEFAULT_BRANDING };
  }
  const tournaments = res.body.gamification?.tournaments ?? [];
  return { tournaments, branding: mapBranding(res.body.widgets_config) };
};

export interface TournamentListResult {
  branding: TournamentBranding;
  tournaments: TournamentDTO[];
}

export const listTournaments = async (
  _userId: string,
  email: string
): Promise<TournamentListResult> => {
  const { tournaments, branding } = await loadCatalog(email);
  return { branding, tournaments: tournaments.map(mapTournament) };
};

export interface TournamentDetailResult {
  branding: TournamentBranding;
  tournament: TournamentDTO;
  leaderboard: TournamentLeaderboardEntry[];
}

export const getTournament = async (
  userId: string,
  email: string,
  tournamentId: string
): Promise<TournamentDetailResult> => {
  const { tournaments, branding } = await loadCatalog(email);
  const found = tournaments.find((t) => t.id === tournamentId);
  if (!found) throw new AppError("Tournament not found", 404);

  const tournament = mapTournament(found);
  const leaderboard = await buildLeaderboard(
    tournamentId,
    userId,
    tournament.leaderboard_size
  );
  return { branding, tournament, leaderboard };
};

const buildLeaderboard = async (
  tournamentId: string,
  meId: string,
  size: number | null
): Promise<TournamentLeaderboardEntry[]> => {
  // Everyone who has scored in this tournament, best first.
  const rows = (await UserTournamentRepository.listByTournament(tournamentId))
    .slice(0, size && size > 0 ? size : undefined);
  if (rows.length === 0) return [];

  const users = await UserRepository.findWhere({
    id: { [Op.in]: rows.map((r) => r.user_id) },
  });
  const nameById = new Map(
    users.map((u) => [
      u.id,
      (u.username || `${u.first_name} ${u.last_name}`).trim() || "Player",
    ])
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    name: nameById.get(r.user_id) ?? "Player",
    score: r.score,
    is_me: r.user_id === meId,
  }));
};

export interface RecordScoreResult {
  tournament_id: string;
  score: number;
  applied: number;
}

/**
 * Add tournament points earned from a play. Increments the player's running
 * score (drives the games-side leaderboard — a player appears on the board the
 * moment they score, no registration step) and mirrors the delta to Gamru so
 * the backoffice sees the same standings.
 *
 * If `game` is provided it must match the tournament's configured game,
 * otherwise the points are ignored (a stray play of a different game must not
 * pollute the leaderboard). A Gamru outage never fails the call.
 */
export const recordScore = async (
  userId: string,
  email: string,
  tournamentId: string,
  points: number,
  game?: string | null
): Promise<RecordScoreResult> => {
  const delta = Math.max(0, Math.round(Number(points) || 0));

  const { tournaments } = await loadCatalog(email);
  const found = tournaments.find((t) => t.id === tournamentId);
  if (!found) throw new AppError("Tournament not found", 404);

  const tournamentGames = toGames(found.data);
  if (game && tournamentGames.length > 0 && !tournamentGames.includes(game)) {
    // Played a game that isn't part of this tournament — ignore.
    const existing = await UserTournamentRepository.find(userId, tournamentId);
    return {
      tournament_id: tournamentId,
      score: existing?.score ?? 0,
      applied: 0,
    };
  }

  const snapshot = {
    tournament_name: found.name,
    tournament_industry: toStr(found.data?.industry),
    tournament_image: toStr(found.data?.large_image),
    last_played_at: new Date(),
  };

  let row = await UserTournamentRepository.find(userId, tournamentId);

  // Track which game was played (only when a known game key is supplied).
  const gamesPlayed: Record<string, number> = {
    ...((row?.games_played as Record<string, number> | undefined) ?? {}),
  };
  if (game) gamesPlayed[game] = (gamesPlayed[game] ?? 0) + 1;

  if (!row) {
    row = await UserTournamentRepository.create({
      user_id: userId,
      tournament_id: tournamentId,
      score: delta,
      plays: 1,
      games_played: gamesPlayed,
      ...snapshot,
    });
  } else {
    row.score = Number(row.score ?? 0) + delta;
    row.plays = Number(row.plays ?? 0) + 1;
    row.games_played = gamesPlayed;
    row.tournament_name = snapshot.tournament_name;
    row.tournament_industry = snapshot.tournament_industry;
    row.tournament_image = snapshot.tournament_image;
    row.last_played_at = snapshot.last_played_at;
    // JSONB fields need an explicit changed() flag when mutated by reference.
    row.changed("games_played", true);
    await row.save();
  }

  // Mirror to Gamru (fire-and-forget; safe on outage).
  if (delta > 0) {
    try {
      const user = await UserRepository.findByPk(userId);
      const name = user
        ? (user.username || `${user.first_name} ${user.last_name}`).trim()
        : null;
      const res = await gamru.tournamentLeaderboard.submitScore(tournamentId, {
        email,
        name,
        points: delta,
      });
      if (!res.ok) {
        logger.warn("Gamru tournament score push failed", {
          tournamentId,
          status: res.status,
        });
      }
    } catch (err) {
      logger.warn("Gamru tournament score push errored", { tournamentId, err });
    }
  }

  return { tournament_id: tournamentId, score: row.score, applied: delta };
};

export interface TournamentHistoryGame {
  game: string;
  plays: number;
}

export interface TournamentHistoryEntry {
  tournament_id: string;
  name: string;
  /** The player who played this tournament. */
  player_name: string;
  player_email: string | null;
  industry: string;
  image: string | null;
  /** Games the player has played in this tournament. */
  plays: number;
  /** Which games the player played, with per-game counts (most played first). */
  games_played: TournamentHistoryGame[];
  /** Total points / XP the player earned in this tournament. */
  xp: number;
  /** The player's current rank on this tournament's leaderboard. */
  rank: number;
  last_played_at: string | null;
}

/**
 * The player's tournament history: every tournament they've actually played,
 * with games played, points/XP earned, and their current rank. Reads from the
 * local snapshot so it still renders after a tournament leaves the catalog.
 */
export const getTournamentHistory = async (
  userId: string
): Promise<TournamentHistoryEntry[]> => {
  const user = await UserRepository.findByPk(userId);
  const playerName = user
    ? (user.username || `${user.first_name} ${user.last_name}`).trim() || "Player"
    : "Player";
  const playerEmail = user?.email ?? null;

  const rows = (await UserTournamentRepository.listByUser(userId)).filter(
    (r) => Number(r.plays ?? 0) > 0 || Number(r.score ?? 0) > 0
  );

  rows.sort((a, b) => {
    const ta = a.last_played_at ? new Date(a.last_played_at).getTime() : 0;
    const tb = b.last_played_at ? new Date(b.last_played_at).getTime() : 0;
    return tb - ta;
  });

  const out: TournamentHistoryEntry[] = [];
  for (const r of rows) {
    const better = await UserTournamentRepository.count({
      tournament_id: r.tournament_id,
      score: { [Op.gt]: Number(r.score ?? 0) },
    });
    const gp = (r.games_played as Record<string, number> | undefined) ?? {};
    const games_played = Object.entries(gp)
      .map(([game, plays]) => ({ game, plays: Number(plays) || 0 }))
      .filter((g) => g.plays > 0)
      .sort((a, b) => b.plays - a.plays);

    out.push({
      tournament_id: r.tournament_id,
      name: r.tournament_name || "Tournament",
      player_name: playerName,
      player_email: playerEmail,
      industry: r.tournament_industry || "Casino",
      image: r.tournament_image ?? null,
      plays: Number(r.plays ?? 0),
      games_played,
      xp: Number(r.score ?? 0),
      rank: better + 1,
      last_played_at: r.last_played_at
        ? new Date(r.last_played_at).toISOString()
        : null,
    });
  }
  return out;
};
