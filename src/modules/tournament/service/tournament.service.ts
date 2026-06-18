/**
 * Gamru-backed tournament service — THIN CONSUMER.
 *
 * GAMRU is the single source of truth for tournaments: it authors the
 * definitions AND now owns all participation, scoring, ranking and prize
 * settlement via the `/api/integration/tournaments/*` API. This module no
 * longer computes leaderboards or settles prizes (that moved to GAMRU, which
 * grants the prize into the player's reward ledger on claim). It forwards
 * scores, reads GAMRU's standings, and mirrors them into the local
 * `user_tournaments` table — a read-through CACHE / audit + history mirror.
 */
import { AppError } from "../../../utils/AppError.ts";
import gamru, {
  gamruUserProfileData,
  type GamruIntTournament,
  type GamruWidgetsConfig,
} from "../../../utils/gamruService.ts";
import UserTournamentRepository from "../model/user-tournament.repository.ts";
import UserRepository from "../../user/model/user.repository.ts";
import WalletRepository from "../../wallet/model/wallet.repository.ts";
import { pushNotification } from "../../notification/service/notification.service.ts";

export type TournamentState = "SCHEDULED" | "IN_PROGRESS" | "ENDED";

/** Tournament shape returned to the games frontend === GAMRU's integration DTO. */
export type TournamentDTO = GamruIntTournament;

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
  prize: number;
  /** Whether this player already claimed their prize (from GAMRU). */
  claimed: boolean;
}

const DEFAULT_BRANDING: TournamentBranding = {
  banner_desktop: null,
  banner_mobile: null,
  tag_color_casino: "#9013fe",
  tag_color_sport: "#417505",
};

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const mapBranding = (
  cfg: GamruWidgetsConfig | null | undefined
): TournamentBranding => ({
  banner_desktop: toStr(cfg?.tournaments_banner_desktop),
  banner_mobile: toStr(cfg?.tournaments_banner_mobile),
  tag_color_casino:
    toStr(cfg?.tournaments_tag_color_casino) ?? DEFAULT_BRANDING.tag_color_casino,
  tag_color_sport:
    toStr(cfg?.tournaments_tag_color_sport) ?? DEFAULT_BRANDING.tag_color_sport,
});

/** Page branding only — pulled from the player's gamru profile (widgets). */
const loadBranding = async (email: string): Promise<TournamentBranding> => {
  const res = await gamruUserProfileData(email);
  return res.ok && res.body ? mapBranding(res.body.widgets_config) : DEFAULT_BRANDING;
};

/* ── Cache mirror ─────────────────────────────────────────────────────────── */

interface CachePatch {
  score?: number;
  plays?: number;
  games_played?: Record<string, number>;
  rank?: number | null;
  prize_amount?: number;
  prize_awarded?: boolean;
  claimed_at?: Date | null;
  status?: string | null;
  registered?: boolean;
  tournament_name?: string | null;
  tournament_industry?: string | null;
  tournament_image?: string | null;
}

const syncTournamentToCache = async (
  userId: string,
  tournamentId: string,
  patch: CachePatch
): Promise<void> => {
  const existing = await UserTournamentRepository.find(userId, tournamentId);
  const data = { ...patch, last_synced_at: new Date() };
  if (existing) {
    existing.set(data);
    if (patch.games_played) existing.changed("games_played", true);
    await existing.save();
  } else {
    await UserTournamentRepository.create({
      user_id: userId,
      tournament_id: tournamentId,
      ...data,
    });
  }
};

/**
 * Notify the player ONCE that a tournament ended and their prize is claimable.
 * Gated by the local cache's `prize_awarded` flag, so it fires the first time we
 * observe a won, unclaimed prize and never again.
 */
const notifyPrizeAvailableOnce = async (
  userId: string,
  t: {
    tournament_id: string;
    name: string;
    prize: number;
    claimed: boolean;
    rank?: number | null;
  }
): Promise<void> => {
  if (!(t.prize > 0) || t.claimed) return;
  const cached = await UserTournamentRepository.find(userId, t.tournament_id);
  if (cached?.prize_awarded) return; // already known / already notified

  await pushNotification(
    userId,
    "REWARD_UNLOCKED",
    `Tournament ended: ${t.name} 🏆`,
    `You won a $${t.prize} prize pool — claim it now from the tournament or your rewards!`,
    { tournamentId: t.tournament_id, kind: "tournament_prize" }
  );
  await syncTournamentToCache(userId, t.tournament_id, {
    prize_awarded: true,
    prize_amount: t.prize,
    rank: t.rank ?? null,
    status: "WON",
    tournament_name: t.name,
  });
};

/* ── Read ─────────────────────────────────────────────────────────────────── */

export interface TournamentListResult {
  branding: TournamentBranding;
  tournaments: TournamentDTO[];
}

export const listTournaments = async (
  _userId: string,
  email: string
): Promise<TournamentListResult> => {
  const [branding, res] = await Promise.all([
    loadBranding(email),
    gamru.integration.tournaments.list(email),
  ]);
  const tournaments = res.ok && res.body ? res.body.tournaments : [];
  return { branding, tournaments };
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
  const [branding, res] = await Promise.all([
    loadBranding(email),
    gamru.integration.tournaments.get(tournamentId, email),
  ]);
  if (!res.ok || !res.body) throw new AppError("Tournament not found", 404);

  const { tournament, leaderboard } = res.body;
  const mappedBoard: TournamentLeaderboardEntry[] = leaderboard.map((e) => ({
    rank: e.rank,
    user_id: e.email,
    name: e.name,
    score: e.score,
    is_me: e.is_me,
    prize: round2(e.prize),
    claimed: Boolean(e.claimed),
  }));

  // Mirror the player's own standing into the cache for history / fallback.
  const me = leaderboard.find((e) => e.is_me);
  if (me) {
    // Notify (once) before the mirror flips prize_awarded.
    await notifyPrizeAvailableOnce(userId, {
      tournament_id: tournamentId,
      name: tournament.name,
      prize: round2(me.prize),
      claimed: Boolean(me.claimed),
      rank: me.rank,
    });
    await syncTournamentToCache(userId, tournamentId, {
      score: me.score,
      rank: me.rank,
      prize_amount: round2(me.prize),
      prize_awarded: me.prize > 0,
      registered: true,
      tournament_name: tournament.name,
      tournament_industry: tournament.industry,
      tournament_image: tournament.large_image,
    });
  }

  return { branding, tournament, leaderboard: mappedBoard };
};

/* ── History ──────────────────────────────────────────────────────────────── */

export interface TournamentHistoryGame {
  game: string;
  plays: number;
}

export interface TournamentHistoryEntry {
  tournament_id: string;
  name: string;
  player_name: string;
  player_email: string | null;
  industry: string;
  image: string | null;
  plays: number;
  games_played: TournamentHistoryGame[];
  xp: number;
  rank: number;
  /** Prize won (GAMRU computed) and whether it has been claimed. */
  prize: number;
  claimed: boolean;
  last_played_at: string | null;
}

export const getTournamentHistory = async (
  userId: string
): Promise<TournamentHistoryEntry[]> => {
  const user = await UserRepository.findByPk(userId);
  const playerName = user
    ? (user.username || `${user.first_name} ${user.last_name}`).trim() || "Player"
    : "Player";
  const playerEmail = user?.email ?? null;

  // GAMRU owns the history. Fall back to the local cache mirror on outage.
  if (playerEmail) {
    const res = await gamru.integration.users.tournaments(userId, playerEmail);
    if (res.ok && res.body) {
      // Notify (once each) for any ended tournament with a claimable prize.
      for (const t of res.body.tournaments) {
        await notifyPrizeAvailableOnce(userId, {
          tournament_id: t.tournament_id,
          name: t.name,
          prize: round2(t.prize),
          claimed: t.claimed,
          rank: t.rank,
        });
      }
      return res.body.tournaments.map((t) => ({
        tournament_id: t.tournament_id,
        name: t.name,
        player_name: playerName,
        player_email: playerEmail,
        industry: t.industry,
        image: t.image,
        plays: t.plays,
        games_played: t.games_played,
        xp: t.xp,
        rank: t.rank,
        prize: round2(t.prize),
        claimed: t.claimed,
        last_played_at: t.last_played_at,
      }));
    }
  }

  const rows = (await UserTournamentRepository.listByUser(userId)).filter(
    (r) => Number(r.plays ?? 0) > 0 || Number(r.score ?? 0) > 0
  );
  return rows.map((r) => {
    const gp = (r.games_played as Record<string, number> | undefined) ?? {};
    return {
      tournament_id: r.tournament_id,
      name: r.tournament_name || "Tournament",
      player_name: playerName,
      player_email: playerEmail,
      industry: r.tournament_industry || "Casino",
      image: r.tournament_image ?? null,
      plays: Number(r.plays ?? 0),
      games_played: Object.entries(gp)
        .map(([game, plays]) => ({ game, plays: Number(plays) || 0 }))
        .filter((g) => g.plays > 0)
        .sort((a, b) => b.plays - a.plays),
      xp: Number(r.score ?? 0),
      rank: r.rank ?? 0,
      prize: round2(Number(r.prize_amount ?? 0)),
      claimed: Boolean(r.claimed_at),
      last_played_at: r.last_played_at
        ? new Date(r.last_played_at).toISOString()
        : null,
    };
  });
};

/* ── Mutations (delegated to GAMRU, mirrored to cache) ─────────────────────── */

export interface RecordScoreResult {
  tournament_id: string;
  score: number;
  applied: number;
}

export const recordScore = async (
  userId: string,
  email: string,
  tournamentId: string,
  points: number,
  game?: string | null
): Promise<RecordScoreResult> => {
  const res = await gamru.integration.tournaments.score(tournamentId, {
    email,
    points: Math.max(0, Math.round(Number(points) || 0)),
    game,
    external_id: userId,
  });
  if (!res.ok || !res.body) {
    // Don't fail gameplay on a GAMRU hiccup — report no points applied.
    const existing = await UserTournamentRepository.find(userId, tournamentId);
    return {
      tournament_id: tournamentId,
      score: Number(existing?.score ?? 0),
      applied: 0,
    };
  }

  // Mirror the new running score into the cache.
  const existing = await UserTournamentRepository.find(userId, tournamentId);
  const gamesPlayed: Record<string, number> = {
    ...((existing?.games_played as Record<string, number> | undefined) ?? {}),
  };
  if (game && res.body.applied > 0) {
    gamesPlayed[game] = (gamesPlayed[game] ?? 0) + 1;
  }
  await syncTournamentToCache(userId, tournamentId, {
    score: res.body.score,
    plays: Number(existing?.plays ?? 0) + (res.body.applied > 0 ? 1 : 0),
    games_played: gamesPlayed,
    registered: true,
    last_played_at: new Date(),
  } as CachePatch & { last_played_at: Date });

  return res.body;
};

/**
 * Claim a settled tournament prize. GAMRU grants it into its reward ledger
 * (idempotent — a second claim is rejected there with 409, so this throws
 * before crediting), and we credit the prize to the player's LOCAL games wallet
 * here. GAMRU's ledger and the games wallet are separate stores, so this is the
 * one place the cash actually lands in the player's wallet.
 */
export const claimTournament = async (
  userId: string,
  email: string,
  tournamentId: string
): Promise<{ prize: number; balance?: number }> => {
  const res = await gamru.integration.tournaments.claim(tournamentId, { email });
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Failed to claim prize", res.status ?? 502);
  }
  const prize = round2(res.body.prize);

  // Credit the local wallet with the prize (GAMRU already accepted the claim,
  // so this runs at most once per tournament for this player).
  let balance: number | undefined;
  if (prize > 0) {
    const wallet = await WalletRepository.findOrCreateByUserId(userId);
    wallet.balance = round2(Number(wallet.balance ?? 0) + prize);
    await wallet.save();
    balance = wallet.balance;
  }

  await syncTournamentToCache(userId, tournamentId, {
    claimed_at: new Date(),
    status: "CLAIMED",
    prize_amount: prize,
    prize_awarded: true,
  });
  return { prize, balance };
};
