import { QueryTypes } from "sequelize";
import sequelize from "../../../config/db.ts";
import { startOfIsoWeek, startOfMonth } from "../../../utils/period.ts";
import UserRepository from "../../user/model/user.repository.ts";
import { emitLeaderboard } from "../../../realtime/socket.ts";

/**
 * Postgres-backed leaderboard (no Redis). Since the GamificationProfile
 * store was removed, ALL boards (global/weekly/monthly) are aggregated from
 * `xp_history` — global uses an all-time window (epoch start). NOTE: nothing
 * writes `xp_history` anymore (XP persistence was removed), so these boards
 * will be empty until an XP store is reintroduced. The (user_id, created_at)
 * index keeps the queries cheap.
 */

interface Row {
  rank: number;
  userId: string;
  score: number;
  name?: string;
}
type Board = "global" | "weekly" | "monthly";

const periodStart = (board: Board): Date | null =>
  board === "weekly"
    ? startOfIsoWeek()
    : board === "monthly"
      ? startOfMonth()
      : null;

/** Kept for the event-handler call site; Postgres needs no write-through. */
export const indexXp = async (): Promise<void> => {
  /* no-op — Postgres is the source of truth */
};

const periodRows = async (
  start: Date,
  limit: number,
  offset: number
): Promise<Row[]> => {
  const res = await sequelize.query<{ user_id: string; score: string }>(
    `SELECT user_id, SUM(xp_amount)::bigint AS score
       FROM xp_history
      WHERE created_at >= :start
      GROUP BY user_id
      ORDER BY score DESC
      LIMIT :limit OFFSET :offset`,
    { replacements: { start, limit, offset }, type: QueryTypes.SELECT }
  );
  return res.map((r, i) => ({
    rank: offset + i + 1,
    userId: r.user_id,
    score: Number(r.score),
  }));
};

const periodPosition = async (
  start: Date,
  userId: string
): Promise<{ rank: number; score: number } | null> => {
  const mine = await sequelize.query<{ score: string | null }>(
    `SELECT COALESCE(SUM(xp_amount),0)::bigint AS score
       FROM xp_history WHERE user_id = :userId AND created_at >= :start`,
    { replacements: { userId, start }, type: QueryTypes.SELECT }
  );
  const score = Number(mine[0]?.score ?? 0);
  if (score <= 0) return null;
  const ahead = await sequelize.query<{ c: string }>(
    `SELECT COUNT(*)::int AS c FROM (
        SELECT user_id FROM xp_history
        WHERE created_at >= :start
        GROUP BY user_id HAVING SUM(xp_amount) > :score
     ) t`,
    { replacements: { start, score }, type: QueryTypes.SELECT }
  );
  return { rank: Number(ahead[0]?.c ?? 0) + 1, score };
};

export const getBoard = async (
  board: Board,
  limit: number,
  offset: number,
  meUserId?: string
): Promise<{ board: string; rows: Row[]; me: Row | null }> => {
  let me: Row | null = null;

  // global = all-time window (epoch start); weekly/monthly = period window.
  const start = periodStart(board) ?? new Date(0);
  const rows = await periodRows(start, limit, offset);
  if (meUserId) {
    const pos = await periodPosition(start, meUserId);
    if (pos) me = { rank: pos.rank, userId: meUserId, score: pos.score };
  }

  await hydrateNames(rows);
  if (me) await hydrateNames([me]);
  return { board, rows, me };
};

export const myPositions = async (userId: string) => {
  const out: Record<string, { rank: number; score: number } | null> = {};
  for (const board of ["global", "weekly", "monthly"] as Board[]) {
    const r = await getBoard(board, 1, 0, userId);
    out[board] = r.me ? { rank: r.me.rank, score: r.me.score } : null;
  }
  return out;
};

/** Throttled broadcast of the global top-10 (called from event handler). */
let lastBroadcast = 0;
export const broadcastTop = async (): Promise<void> => {
  if (Date.now() - lastBroadcast < 5000) return;
  lastBroadcast = Date.now();
  const { rows } = await getBoard("global", 10, 0);
  emitLeaderboard("global", { board: "global", top: rows });
};

async function hydrateNames(rows: Row[]): Promise<void> {
  await Promise.all(
    rows.map(async (r) => {
      const u = await UserRepository.findByPk(r.userId);
      r.name = u ? `${u.first_name} ${u.last_name}` : "Player";
    })
  );
}
