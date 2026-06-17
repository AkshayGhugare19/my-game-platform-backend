/**
 * Gamru-backed mission engine.
 *
 * Missions are AUTHORED in gamru (the backoffice) and fetched live per request
 * from the player's gamru profile payload (`gamification.missions`). This
 * engine owns only the per-player PARTICIPATION that gamru does not store:
 * Join, progress, claim and cancel — tracked in the local `user_missions`
 * table, keyed by the gamru mission uuid.
 *
 * The BetFury flow this implements:
 *  - a player JOINs a mission (one Casino + one Sport mission at a time; joining
 *    another in the same bucket cancels the current one),
 *  - gameplay events advance progress against the mission's objective,
 *  - on completion the player CLAIMs → the reward is granted in gamru and lands
 *    in their "Special Bonuses",
 *  - a player may CANCEL a running mission (progress reset).
 */
import { AppError } from "../../../utils/AppError.ts";
import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import gamru, {
  gamruUserProfileData,
  type GamruMission,
  type GamruMissionData,
  type GamruWidgetsConfig,
} from "../../../utils/gamruService.ts";
import UserMission from "../model/user-mission.model.ts";
import UserMissionRepository from "../model/user-mission.repository.ts";

/** gamru missions are lifetime/special — one participation row per mission. */
const PERIOD = "GAMRU";

/**
 * A bundle's participation track key — mirrors bundlePeriodKey in the bundle
 * engine (kept local here to avoid a circular import). Used to advance the
 * RIGHT track when a play is attributed to a bundle.
 */
const bundlePeriodKey = (bundleId: string): string =>
  ("B" + bundleId.replace(/-/g, "")).slice(0, 20);

export type MissionStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED";

/** Exclusivity bucket: everything that isn't Sport shares the Casino slot. */
export type MissionBucket = "Casino" | "Sport";

export interface MissionDTO {
  id: string;
  name: string;
  description: string | null;
  category: string; // display category (Slots / Originals / Sport / …)
  bucket: MissionBucket;
  vip: boolean;
  duration_days: number | null;
  large_image: string | null;
  status: MissionStatus;
  objective_type: string;
  measure: string; // "count" | "amount"
  target: number;
  progress: number;
  condition: string; // human label, e.g. "Wager $15 000"
  game_category: string | null;
  min_bet: number | null;
  min_multiplier: number | null;
  bet_currency: string;
  games: string[];
  start_date: string | null;
  end_date: string | null;
  reward_type: string;
  reward_amount: number;
  reward_label: string; // e.g. "50 Bonus Bets x $2"
  max_bonus: number | null;
  bonus_wagering: string;
  deposit_required: boolean;
  wagering_required: boolean;
  more_details: string | null;
  tags: string[];
}

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
  const list = Array.isArray(raw)
    ? raw
    : String(raw ?? "").split(",");
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

const statusFor = (um: UserMission | undefined): MissionStatus => {
  if (!um) return "AVAILABLE";
  if (um.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (um.status === "COMPLETED") return "COMPLETED";
  if (um.status === "CLAIMED") return "CLAIMED";
  return "AVAILABLE";
};

export const mapMission = (m: GamruMission, um?: UserMission): MissionDTO => {
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
  };
};

export const mapBranding = (
  cfg: GamruWidgetsConfig | null | undefined
): MissionBranding => ({
  banner_desktop: toStr(cfg?.missions_banner_desktop),
  banner_mobile: toStr(cfg?.missions_banner_mobile),
});

/** Snapshot the mission's objective onto the participation row (for progress). */
const objectiveSnapshot = (dto: MissionDTO): Record<string, unknown> => ({
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

/**
 * Fetch the live mission catalog from gamru for this player. Never throws on a
 * gamru outage — returns an empty catalog so the page still renders.
 */
const loadCatalog = async (
  email: string
): Promise<{ missions: GamruMission[]; branding: MissionBranding }> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    return { missions: [], branding: DEFAULT_BRANDING };
  }
  const missions = res.body.gamification?.missions ?? [];
  return { missions, branding: mapBranding(res.body.widgets_config) };
};

/**
 * Options for the participation-mutating operations. `periodKey` selects the
 * participation TRACK: the default "GAMRU" is the standalone Missions tab; a
 * different key (e.g. "BUNDLE") is an independent track that completes
 * separately. `exclusive` enforces the one-IN_PROGRESS-per-bucket rule within
 * that track.
 */
export interface ParticipationOpts {
  periodKey?: string;
  exclusive?: boolean;
}

/** Catalog + the player's participation (for the given track) merged in. */
export const listMissions = async (
  userId: string,
  email: string,
  periodKey: string = PERIOD
): Promise<MissionListResult> => {
  const { missions, branding } = await loadCatalog(email);
  const rows = await UserMissionRepository.listByUser(userId);
  const byMission = new Map(
    rows.filter((r) => r.period_key === periodKey).map((r) => [r.mission_id, r])
  );
  return {
    branding,
    missions: missions.map((m) => mapMission(m, byMission.get(m.id))),
  };
};

export const getMission = async (
  userId: string,
  email: string,
  missionId: string,
  periodKey: string = PERIOD
): Promise<MissionDTO> => {
  const { missions } = await loadCatalog(email);
  const found = missions.find((m) => m.id === missionId);
  if (!found) throw new AppError("Mission not found", 404);
  const um = await UserMissionRepository.find(userId, missionId, periodKey);
  return mapMission(found, um ?? undefined);
};

/**
 * Join a mission on a participation track. By default (the standalone Missions
 * tab) it enforces the BetFury rule: only one IN_PROGRESS mission per bucket
 * (Casino / Sport) — joining another in the same bucket cancels the current
 * one. Other tracks (e.g. bundles) can opt out with `exclusive: false` so the
 * player can run several at once. Re-joining a mission you already started on
 * the same track just resets it. Tracks never affect each other.
 */
export const joinMission = async (
  userId: string,
  email: string,
  missionId: string,
  opts: ParticipationOpts = {}
): Promise<MissionDTO> => {
  const periodKey = opts.periodKey ?? PERIOD;
  const exclusive = opts.exclusive ?? true;

  const { missions } = await loadCatalog(email);
  const found = missions.find((m) => m.id === missionId);
  if (!found) throw new AppError("Mission not found", 404);

  const dto = mapMission(found);
  if (dto.target <= 0) {
    throw new AppError("This mission is not configured correctly", 400);
  }

  // Cancel any other running mission in the same bucket ON THIS TRACK only.
  if (exclusive) {
    const others = await UserMissionRepository.listActiveInCategory(
      userId,
      dto.bucket
    );
    for (const o of others) {
      if (o.period_key === periodKey && o.mission_id !== missionId) {
        await o.destroy();
      }
    }
  }

  const meta = objectiveSnapshot(dto);
  const existing = await UserMissionRepository.find(userId, missionId, periodKey);
  if (existing) {
    existing.progress = 0;
    existing.target = dto.target;
    existing.status = "IN_PROGRESS";
    existing.category = dto.bucket;
    existing.meta = meta;
    existing.completed_at = null;
    existing.changed("meta", true);
    await existing.save();
  } else {
    await UserMissionRepository.create({
      user_id: userId,
      mission_id: missionId,
      progress: 0,
      target: dto.target,
      status: "IN_PROGRESS",
      period_key: periodKey,
      category: dto.bucket,
      meta,
    });
  }

  // Tell gamru the player joined, so the operator console's "Participated"
  // count updates on join. Standalone track only — a mission joined inside a
  // bundle is synced by the bundle engine against the BUNDLE id, so mission and
  // bundle counts never cross-contaminate. Fire-and-forget.
  if (periodKey === PERIOD) {
    void gamru.participation
      .record("missions", missionId, {
        email,
        external_id: userId,
        status: "IN_PROGRESS",
      })
      .catch(() => {});
  }

  return { ...dto, status: "IN_PROGRESS", progress: 0 };
};

/** Cancel a running mission on a track — the row is removed (back to AVAILABLE). */
export const cancelMission = async (
  userId: string,
  missionId: string,
  periodKey: string = PERIOD
): Promise<void> => {
  const um = await UserMissionRepository.find(userId, missionId, periodKey);
  if (!um) throw new AppError("Mission not started", 404);
  if (um.status === "CLAIMED") {
    throw new AppError("A claimed mission can't be cancelled", 409);
  }
  await um.destroy();
};

/**
 * Claim a COMPLETED mission on a track. Grants the reward in gamru (so it lands
 * in the player's Special Bonuses) and marks the local participation CLAIMED.
 */
export const claimMission = async (
  userId: string,
  email: string,
  missionId: string,
  periodKey: string = PERIOD
): Promise<{ reward_label: string }> => {
  const um = await UserMissionRepository.find(userId, missionId, periodKey);
  if (!um) throw new AppError("Mission not started", 404);
  if (um.status === "CLAIMED") {
    throw new AppError("Mission reward already claimed", 409);
  }
  if (um.status !== "COMPLETED") {
    throw new AppError("Mission not completed yet", 409);
  }

  // gamru owns the reward ledger — resolve the player's gamru id by email.
  const profile = await gamruUserProfileData(email);
  const gamruPlayerId = profile.ok ? profile.body?.id : null;
  if (!gamruPlayerId) {
    throw new AppError("Could not reach the rewards service — try again", 503);
  }

  const res = await gamru.players.claimMissionReward(gamruPlayerId, missionId);
  if (!res.ok) {
    const body = res.body as { message?: string } | undefined;
    const message = body?.message || res.error || "Failed to claim reward";
    throw new AppError(message, res.status ?? 502);
  }

  um.status = "CLAIMED";
  await um.save();

  // Reflect the claim on gamru's participation record (standalone track only).
  if (periodKey === PERIOD) {
    void gamru.participation
      .record("missions", missionId, {
        email,
        external_id: userId,
        status: "CLAIMED",
      })
      .catch(() => {});
  }

  const meta = (um.meta as Record<string, unknown>) ?? {};
  return { reward_label: String(meta.reward_label ?? "Reward") };
};

/* ── Progress (driven by gameplay events) ─────────────────────────────────── */

interface AdvanceOpts {
  /** Bet stake — gates the optional min-bet sub-condition. */
  betSize: number;
  /** Value added to amount-measured missions (turnover, win amount, …). */
  amountValue: number;
  /** Game played, for the optional game sub-condition. */
  gameKey?: string | null;
  /** The mission this play was launched for (from the mission/bundle card). */
  missionId?: string | null;
  /** The bundle, when the play was launched from a bundle card. */
  bundleId?: string | null;
}

/**
 * Advance every running mission whose objective matches one of `kinds`.
 * Count-measured missions tick by 1; amount-measured missions add
 * `amountValue` (e.g. turnover for `wager`, win amount for `win`).
 */
const advanceUserMissions = async (
  userId: string,
  kinds: string[],
  opts: AdvanceOpts
): Promise<void> => {
  const { betSize, amountValue, gameKey, missionId, bundleId } = opts;

  // Which participation rows may this play advance? A mission can be IN_PROGRESS
  // on more than one track — the standalone Missions tab ("GAMRU") and one or
  // more bundle tracks. So we DON'T advance every copy (that moves them in
  // lockstep). When the game was launched from a specific mission/bundle card,
  // the activity carries that context and we advance ONLY that one track:
  //   - bundle present → that bundle's track for the mission,
  //   - mission only   → the standalone "GAMRU" track for the mission.
  // With no context (a generic game play), fall back to the standalone track
  // only — never bundle tracks.
  let rows: UserMission[];
  if (missionId) {
    const periodKey = bundleId ? bundlePeriodKey(bundleId) : PERIOD;
    const um = await UserMissionRepository.find(userId, missionId, periodKey);
    rows = um && um.status === "IN_PROGRESS" ? [um] : [];
  } else {
    rows = (await UserMissionRepository.listInProgress(userId)).filter(
      (r) => r.period_key === PERIOD
    );
  }

  for (const um of rows) {
    const meta = (um.meta as Record<string, unknown>) ?? {};
    const ot = String(meta.objective_type ?? "");
    if (!kinds.includes(ot)) continue;

    // Mission restricted to specific games → only count plays of those games.
    const games = Array.isArray(meta.games) ? (meta.games as string[]) : [];
    if (games.length > 0 && (!gameKey || !games.includes(gameKey))) continue;

    const minBet = Number(meta.min_bet ?? 0) || 0;
    if (minBet > 0 && betSize < minBet) continue;

    const measure = String(meta.measure ?? "count");
    const delta =
      measure === "amount" ? Math.max(0, Math.round(amountValue)) : 1;
    if (delta <= 0) continue;

    um.progress = Math.min(Number(um.progress ?? 0) + delta, um.target);
    if (um.progress >= um.target) {
      um.status = "COMPLETED";
      um.completed_at = new Date();
      await um.save();
      bus.emit(EVENTS.MISSION_COMPLETED, {
        userId,
        missionId: um.mission_id,
        title: String(meta.name ?? "Mission"),
        rewardXp: Number(meta.reward_amount ?? 0),
      });
    } else {
      await um.save();
      bus.emit(EVENTS.MISSION_PROGRESS, {
        userId,
        missionId: um.mission_id,
        progress: um.progress,
        target: um.target,
        status: um.status,
      });
    }
  }
};

/** A single play's signal, derived from the activity event. */
export interface PlaySignal {
  /** Bet stake / turnover for this play. */
  stake: number;
  /** Whether the play was a win. */
  win: boolean;
  /** Amount won on this play (0 on a loss). */
  winAmount: number;
  /** Game route key played, if known. */
  gameKey?: string | null;
}

/**
 * A gameplay/bet event. Advances:
 *  - `wager` / `bet_count` missions on every play (turnover = the stake),
 *  - `win` missions only on a win (amount = the win amount).
 */
export const advanceForActivity = async (
  userId: string,
  signal: PlaySignal,
  context: { missionId?: string | null; bundleId?: string | null } = {}
): Promise<void> => {
  const { missionId = null, bundleId = null } = context;
  await advanceUserMissions(userId, ["wager", "bet_count"], {
    betSize: signal.stake,
    amountValue: signal.stake,
    gameKey: signal.gameKey,
    missionId,
    bundleId,
  });
  if (signal.win) {
    await advanceUserMissions(userId, ["win"], {
      betSize: signal.stake,
      amountValue: signal.winAmount,
      gameKey: signal.gameKey,
      missionId,
      bundleId,
    });
  }
};

/** A login/streak tick — advances login missions. */
export const advanceForLogin = async (userId: string): Promise<void> => {
  await advanceUserMissions(userId, ["login"], {
    betSize: 0,
    amountValue: 1,
  });
};

/**
 * Missions are now opt-in (the player JOINs from the Missions page), so there
 * is nothing to seed on registration. Kept as a no-op so the registration
 * flow's import stays stable.
 */
export const seedInitialUserMissions = async (
  _userId: string
): Promise<void> => {
  /* intentionally empty — see doc comment */
};
