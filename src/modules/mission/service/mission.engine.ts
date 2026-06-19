/**
 * Gamru-backed mission engine — THIN CONSUMER.
 *
 * GAMRU is the single source of truth for missions: it authors the definitions
 * AND now computes all per-player progress (join, gameplay progress, complete,
 * claim, cancel) via the `/api/integration/missions/*` API. This module no
 * longer calculates anything — it forwards events to GAMRU and mirrors the
 * response into the local `user_missions` table, which is a read-through CACHE
 * / audit mirror (keyed by the gamru mission uuid + participation track).
 *
 * The cache lets the bundle layer and history render from local rows and keeps
 * the UI rendering if GAMRU briefly hiccups; it is never the source of truth.
 */
import { AppError } from "../../../utils/AppError.ts";
import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import gamru, {
  gamruUserProfileData,
  type GamruMission,
  type GamruMissionData,
  type GamruWidgetsConfig,
  type GamruIntMission,
} from "../../../utils/gamruService.ts";
import UserMission, {
  type UserMissionStatus,
} from "../model/user-mission.model.ts";
import UserMissionRepository from "../model/user-mission.repository.ts";
import UserRepository from "../../user/model/user.repository.ts";

/** gamru missions are lifetime/special — one participation row per track. */
const PERIOD = "GAMRU";

/** A bundle's participation track key — mirrors the bundle engine. */
const bundlePeriodKey = (bundleId: string): string =>
  ("B" + bundleId.replace(/-/g, "")).slice(0, 20);

export type MissionStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED";

/** Exclusivity bucket: everything that isn't Sport shares the Casino slot. */
export type MissionBucket = "Casino" | "Sport";

/** The mission shape returned to the games frontend === GAMRU's integration DTO. */
export type MissionDTO = GamruIntMission;

export interface MissionBranding {
  banner_desktop: string | null;
  banner_mobile: string | null;
}

export interface MissionListResult {
  branding: MissionBranding;
  missions: MissionDTO[];
}

const DEFAULT_BRANDING: MissionBranding = {
  banner_desktop: null,
  banner_mobile: null,
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

const bucketFor = (category: string): MissionBucket =>
  /sport/i.test(category) ? "Sport" : "Casino";

const toGames = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  return Array.from(
    new Set(list.map((s) => String(s).trim()).filter(Boolean))
  );
};

/** Build the player-facing reward label, e.g. "50 Bonus Bets x $2". */
const rewardLabel = (d: GamruMissionData): string => {
  const explicit = toStr(d.reward_label);
  if (explicit) return explicit;
  const amount = toNum(d.reward_amount) ?? 0;
  const type = toStr(d.reward_type) ?? "bonus_cash";
  const pretty = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${amount} ${pretty}`;
};

/** Build the player-facing condition label, e.g. "Wager $15 000". */
const conditionLabel = (d: GamruMissionData, target: number): string => {
  const explicit = toStr(d.condition_label);
  if (explicit) return explicit;
  const ot = toStr(d.objective_type) ?? "wager";
  const measure = toStr(d.measure) ?? "amount";
  if (ot === "wager") return `Wager $${target}`;
  if (ot === "bet_count") return `Place ${target} bets`;
  if (ot === "login") return `Log in ${target} day${target === 1 ? "" : "s"}`;
  if (ot === "deposit") return `Deposit $${target}`;
  if (ot === "win") return `Win ${target} time${target === 1 ? "" : "s"}`;
  const verb = ot.replace(/_/g, " ");
  return measure === "amount" ? `${verb} $${target}` : `${verb} ${target}`;
};

const statusFor = (um: UserMission | undefined | null): MissionStatus => {
  if (!um) return "AVAILABLE";
  if (um.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (um.status === "COMPLETED") return "COMPLETED";
  if (um.status === "CLAIMED") return "CLAIMED";
  return "AVAILABLE";
};

/**
 * Map a gamru catalog mission + the player's local cache row into a MissionDTO.
 * Still used by the bundle engine (which merges per-bundle cache rows). The
 * cache row reflects GAMRU's progress (it is mirrored on every mutation/play).
 */
export const mapMission = (m: GamruMission, um?: UserMission | null): MissionDTO => {
  const d: GamruMissionData = m.data ?? {};
  const category = toStr(d.category) ?? "Casino";
  const target = toNum(d.objective_target) ?? 0;
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    category,
    bucket: bucketFor(category),
    vip: Boolean(d.vip),
    duration_days: toNum(d.duration_days),
    large_image: toStr(d.large_image) ?? toStr(d.small_image),
    status: statusFor(um),
    objective_type: toStr(d.objective_type) ?? "wager",
    measure: toStr(d.measure) ?? "amount",
    target,
    progress: um ? Number(um.progress ?? 0) : 0,
    condition: conditionLabel(d, target),
    game_category: toStr(d.objective_game_category),
    min_bet: toNum(d.min_bet),
    min_multiplier: toNum(d.min_multiplier),
    bet_currency: toStr(d.bet_currency) ?? "All Currencies",
    games: toGames(d.games),
    start_date: toStr(d.start_date),
    end_date: toStr(d.end_date),
    reward_type: toStr(d.reward_type) ?? "bonus_cash",
    reward_amount: toNum(d.reward_amount) ?? 0,
    reward_label: rewardLabel(d),
    max_bonus: toNum(d.max_bonus),
    bonus_wagering: toStr(d.bonus_wagering) ?? "Excluded",
    deposit_required: Boolean(d.deposit_required),
    wagering_required: Boolean(d.wagering_required),
    more_details: toStr(d.more_details),
    tags: Array.isArray(m.tags) ? m.tags : [],
    completed_at: um?.completed_at ? new Date(um.completed_at).toISOString() : null,
    claimed_at: um?.claimed_at ? new Date(um.claimed_at).toISOString() : null,
  };
};

export const mapBranding = (
  cfg: GamruWidgetsConfig | null | undefined
): MissionBranding => ({
  banner_desktop: toStr(cfg?.missions_banner_desktop),
  banner_mobile: toStr(cfg?.missions_banner_mobile),
});

/* ── Local cache mirror of GAMRU progress ─────────────────────────────────── */

const resolveEmail = async (userId: string): Promise<string | null> => {
  const u = await UserRepository.findByPk(userId);
  return u?.email ?? null;
};

/** Objective + display snapshot from a GAMRU DTO (for cache + history). */
const metaFromDto = (dto: MissionDTO): Record<string, unknown> => ({
  objective_type: dto.objective_type,
  measure: dto.measure,
  min_bet: dto.min_bet,
  min_multiplier: dto.min_multiplier,
  game_category: dto.game_category,
  games: dto.games,
  category: dto.category,
  bucket: dto.bucket,
  name: dto.name,
  large_image: dto.large_image,
  reward_type: dto.reward_type,
  reward_amount: dto.reward_amount,
  reward_label: dto.reward_label,
  condition: dto.condition,
});

/** Reconstruct a DTO from a cache row when GAMRU is unreachable. */
const dtoFromCacheRow = (um: UserMission): MissionDTO => {
  const meta = (um.meta as Record<string, unknown>) ?? {};
  return {
    id: um.mission_id,
    name: String(meta.name ?? "Mission"),
    description: null,
    category: String(meta.category ?? "Casino"),
    bucket: (um.category as MissionBucket) ?? "Casino",
    vip: false,
    duration_days: null,
    large_image: (meta.large_image as string | null) ?? null,
    status: statusFor(um),
    objective_type: String(meta.objective_type ?? "wager"),
    measure: String(meta.measure ?? "amount"),
    target: Number(um.target ?? 0),
    progress: Number(um.progress ?? 0),
    condition: String(meta.condition ?? ""),
    game_category: (meta.game_category as string | null) ?? null,
    min_bet: (meta.min_bet as number | null) ?? null,
    min_multiplier: (meta.min_multiplier as number | null) ?? null,
    bet_currency: "All Currencies",
    games: Array.isArray(meta.games) ? (meta.games as string[]) : [],
    start_date: null,
    end_date: null,
    reward_type: String(meta.reward_type ?? "bonus_cash"),
    reward_amount: Number(meta.reward_amount ?? 0),
    reward_label: String(meta.reward_label ?? "Reward"),
    max_bonus: null,
    bonus_wagering: "Excluded",
    deposit_required: false,
    wagering_required: false,
    more_details: null,
    tags: [],
    completed_at: um.completed_at ? new Date(um.completed_at).toISOString() : null,
    claimed_at: um.claimed_at ? new Date(um.claimed_at).toISOString() : null,
  };
};

/**
 * Mirror one GAMRU mission DTO into the local cache. AVAILABLE means the player
 * has no participation → drop any stale row. Returns the status transition so
 * the caller can emit the real-time progress/completion events.
 */
const syncMissionToCache = async (
  userId: string,
  dto: MissionDTO,
  periodKey: string
): Promise<{ prev: MissionStatus; next: MissionStatus }> => {
  const existing = await UserMissionRepository.find(userId, dto.id, periodKey);
  const prev = statusFor(existing);

  if (dto.status === "AVAILABLE") {
    if (existing) await existing.destroy();
    return { prev, next: "AVAILABLE" };
  }

  const patch = {
    progress: dto.progress,
    target: dto.target,
    status: dto.status as UserMissionStatus,
    category: dto.bucket,
    meta: metaFromDto(dto),
    completed_at: dto.completed_at ? new Date(dto.completed_at) : null,
    claimed_at: dto.claimed_at ? new Date(dto.claimed_at) : null,
    last_synced_at: new Date(),
  };

  if (existing) {
    existing.set(patch);
    existing.changed("meta", true);
    await existing.save();
  } else {
    await UserMissionRepository.create({
      user_id: userId,
      mission_id: dto.id,
      period_key: periodKey,
      ...patch,
    });
  }
  return { prev, next: dto.status };
};

/** Emit the websocket / notification events for a mirrored transition. */
const emitTransition = (
  userId: string,
  dto: MissionDTO,
  prev: MissionStatus,
  next: MissionStatus
): void => {
  if (next === "COMPLETED" && prev !== "COMPLETED") {
    bus.emit(EVENTS.MISSION_COMPLETED, {
      userId,
      missionId: dto.id,
      title: dto.name,
      rewardXp: dto.reward_amount,
    });
  } else if (next === "IN_PROGRESS" && (prev !== next || dto.progress > 0)) {
    bus.emit(EVENTS.MISSION_PROGRESS, {
      userId,
      missionId: dto.id,
      progress: dto.progress,
      target: dto.target,
      status: next,
    });
  }
};

/* ── Read ─────────────────────────────────────────────────────────────────── */

export const listMissions = async (
  userId: string,
  email: string,
  periodKey: string = PERIOD
): Promise<MissionListResult> => {
  const [profile, res] = await Promise.all([
    gamruUserProfileData(email),
    gamru.integration.missions.list(email),
  ]);
  const branding =
    profile.ok && profile.body
      ? mapBranding(profile.body.widgets_config)
      : DEFAULT_BRANDING;

  if (res.ok && res.body) {
    const missions = res.body.missions;
    // Mirror GAMRU's truth into the local cache (best-effort).
    for (const dto of missions) await syncMissionToCache(userId, dto, periodKey);
    return { branding, missions };
  }

  // GAMRU unreachable → render from the local cache mirror.
  const rows = (await UserMissionRepository.listByUser(userId)).filter(
    (r) => r.period_key === periodKey
  );
  return { branding, missions: rows.map(dtoFromCacheRow) };
};

export const getMission = async (
  userId: string,
  email: string,
  missionId: string,
  periodKey: string = PERIOD
): Promise<MissionDTO> => {
  const res = await gamru.integration.missions.get(missionId, email);
  if (res.ok && res.body) {
    await syncMissionToCache(userId, res.body, periodKey);
    return res.body;
  }
  const row = await UserMissionRepository.find(userId, missionId, periodKey);
  if (row) return dtoFromCacheRow(row);
  throw new AppError("Mission not found", 404);
};

/* ── Mutations (delegated to GAMRU, mirrored to cache) ─────────────────────── */

export interface ParticipationOpts {
  /** When set, this mission is joined on the bundle's independent track. */
  bundleId?: string | null;
}

export const joinMission = async (
  userId: string,
  email: string,
  missionId: string,
  opts: ParticipationOpts = {}
): Promise<MissionDTO> => {
  const bundleId = opts.bundleId ?? null;
  // A bundle-track join goes through the dedicated mission-bundle endpoint
  // (non-exclusive, server-side bundle participation); the standalone track uses
  // the plain mission endpoint.
  const res = bundleId
    ? await gamru.integration.missionBundles.join(bundleId, missionId, {
        email,
        external_id: userId,
      })
    : await gamru.integration.missions.join(missionId, {
        email,
        external_id: userId,
        bundleId: null,
      });
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Failed to join mission", res.status ?? 502);
  }
  const periodKey = bundleId ? bundlePeriodKey(bundleId) : PERIOD;

  // GAMRU enforces the one-per-bucket rule on the standalone track; mirror that
  // by clearing other in-bucket rows from the local cache on this track.
  if (!bundleId) {
    const others = await UserMissionRepository.listActiveInCategory(
      userId,
      res.body.bucket
    );
    for (const o of others) {
      if (o.period_key === PERIOD && o.mission_id !== missionId) await o.destroy();
    }
  }
  await syncMissionToCache(userId, res.body, periodKey);
  return res.body;
};

export const cancelMission = async (
  userId: string,
  email: string,
  missionId: string,
  bundleId: string | null = null
): Promise<void> => {
  const res = bundleId
    ? await gamru.integration.missionBundles.cancel(bundleId, missionId, {
        email,
      })
    : await gamru.integration.missions.cancel(missionId, { email, bundleId: null });
  if (!res.ok) {
    throw new AppError(res.error || "Failed to cancel mission", res.status ?? 502);
  }
  const periodKey = bundleId ? bundlePeriodKey(bundleId) : PERIOD;
  const row = await UserMissionRepository.find(userId, missionId, periodKey);
  if (row) await row.destroy();
};

export const claimMission = async (
  userId: string,
  email: string,
  missionId: string,
  bundleId: string | null = null
): Promise<{ reward_label: string }> => {
  const res = bundleId
    ? await gamru.integration.missionBundles.claim(bundleId, missionId, {
        email,
      })
    : await gamru.integration.missions.claim(missionId, { email, bundleId: null });
  if (!res.ok || !res.body) {
    const message = res.error || "Failed to claim reward";
    throw new AppError(message, res.status ?? 502);
  }
  const periodKey = bundleId ? bundlePeriodKey(bundleId) : PERIOD;
  await syncMissionToCache(userId, res.body.mission, periodKey);
  return { reward_label: res.body.reward_label };
};

/* ── Progress (forwarded to GAMRU; results mirrored to cache) ─────────────── */

export interface PlaySignal {
  stake: number;
  win: boolean;
  winAmount: number;
  gameKey?: string | null;
}

export const advanceForActivity = async (
  userId: string,
  signal: PlaySignal,
  context: { missionId?: string | null; bundleId?: string | null } = {}
): Promise<void> => {
  const email = await resolveEmail(userId);
  if (!email) return;
  const { missionId = null, bundleId = null } = context;

  const res = await gamru.integration.activity({
    email,
    external_id: userId,
    kind: "play",
    stake: signal.stake,
    win: signal.win,
    winAmount: signal.winAmount,
    gameKey: signal.gameKey,
    missionId,
    bundleId,
  });

  // The activity response carries the player's standalone mission snapshot.
  if (res.ok && res.body) {
    for (const dto of res.body.missions) {
      const { prev, next } = await syncMissionToCache(userId, dto, PERIOD);
      emitTransition(userId, dto, prev, next);
    }
  }

  // A bundle-scoped play advanced the bundle track too — mirror that one row
  // (read it back from the dedicated mission-bundle progress endpoint).
  if (missionId && bundleId) {
    const pr = await gamru.integration.missionBundles.progress(
      bundleId,
      missionId,
      email
    );
    if (pr.ok && pr.body) {
      const periodKey = bundlePeriodKey(bundleId);
      const { prev, next } = await syncMissionToCache(userId, pr.body, periodKey);
      emitTransition(userId, pr.body, prev, next);
    }
  }
};

export const advanceForLogin = async (userId: string): Promise<void> => {
  const email = await resolveEmail(userId);
  if (!email) return;
  const res = await gamru.integration.activity({
    email,
    external_id: userId,
    kind: "login",
  });
  if (res.ok && res.body) {
    for (const dto of res.body.missions) {
      const { prev, next } = await syncMissionToCache(userId, dto, PERIOD);
      emitTransition(userId, dto, prev, next);
    }
  }
};

/**
 * Missions are opt-in (the player JOINs from the Missions page), so there is
 * nothing to seed on registration. Kept as a no-op so the registration flow's
 * import stays stable.
 */
export const seedInitialUserMissions = async (
  _userId: string
): Promise<void> => {
  /* intentionally empty — see doc comment */
};
