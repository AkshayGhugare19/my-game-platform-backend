import env from "../config/env.ts";
import { logger } from "./logger.ts";
export interface GamruUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password: string;
  username: string;
  role: string;
  status: string;
  source?: string;
}

export interface GamruResult<T = unknown> {
  ok: boolean;
  status?: number;
  body?: T;
  error?: string;
}

/** One on-site campaign message in the player's gamru inbox. */
export interface GamruInboxItem {
  id: string;
  campaign_id: string | null;
  channel: string;
  title: string;
  body: string;
  status: string;
  read: boolean;
  event_label: string | null;
  event_at: string;
  read_at: string | null;
}

/** `POST /inbox/list` payload — the player's messages + unread badge count. */
export interface GamruInboxResponse {
  unread_count: number;
  items: GamruInboxItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * A lifecycle / gameplay event pushed to GAMRU's campaign trigger engine
 * (`POST /integration/events`). GAMRU evaluates every event-triggered campaign
 * against the resolved player + segment and delivers any match to the on-site
 * inbox. Mirrors the `GamruSyncEvent` shape used by `integration/gamruSync.ts`.
 */
export interface GamruIntegrationEvent {
  event_id: string;
  /** e.g. USER_REGISTERED | DEPOSIT_MADE | LOGIN | XP_AWARDED | LEVEL_UP | RANK_UP */
  event_type: string;
  external_id: string;
  email?: string | null;
  amount?: number;
  meta?: Record<string, unknown>;
}

/** `gamification.progress` — the player's current level snapshot. */
export interface GamruGamificationProgress {
  level?: number;
  rank_name?: string;
  xp_points?: number;
  xp_to_next?: number;
  max_level?: number;
}

/** `gamification.next_rank` — the rank the player is climbing toward. */
export interface GamruNextRank {
  rank_name?: string;
  level?: number;
  xp_required?: number;
  xp_remaining?: number;
  reward_type?: string | null;
  reward_value?: number | null;
}

/** One entry of `gamification.levels` — a single level band. */
export interface GamruLevelTier {
  rank_name?: string;
  level?: number;
  xp_start?: number;
  xp_end?: number;
  reward_type?: string | null;
  reward_value?: number | null;
  /** SDLCGames bonus ids the operator pinned to this level (pointer pattern). */
  bonusIds?: string[];
}

/** One entry of `gamification.ranks` — a rank as authored in GAMRU. */
export interface GamruRankTier {
  id?: string;
  name?: string;
  description?: string;
  /** SDLCGames bonus ids pinned rank-wide (also mirrored in `data.bonus_ids`). */
  bonusIds?: string[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** One entry of `gamification.logs` — an audited gamification action. */
export interface GamruGamificationLog {
  id: string;
  player_id?: string;
  action: string;
  detail: string;
  actor: string;
  created_at: string;
  updated_at?: string;
}

/**
 * The nested `gamification` object Gamru attaches to a player on
 * `POST /players/by-email`. Every field is optional — Gamru is the
 * source of truth but may be unreachable or partially populated.
 */
export interface GamruGamification {
  progress?: GamruGamificationProgress;
  next_rank?: GamruNextRank | null;
  levels?: GamruLevelTier[];
  ranks?: GamruRankTier[];
  missions?: GamruMission[];
  mission_bundles?: GamruMissionBundle[];
  reward_shop?: unknown[];
  tournaments?: GamruTournament[];
  rewards?: unknown[];
  logs?: GamruGamificationLog[];
}

/**
 * A mission as authored in Gamru (Gamification → Missions). Common columns
 * are first-class; the multi-step wizard's fields live in the JSONB `data`
 * blob, so every `data` field is optional.
 */
export interface GamruMissionData {
  category?: string; // "Casino" | "Sport" | "Slots" | "Originals" | …
  duration_days?: number | string;
  vip?: boolean;
  large_image?: string;
  small_image?: string;
  /** Player event that advances progress: wager | bet_count | login | … */
  objective_type?: string;
  /** "count" (times) or "amount" (sum). */
  measure?: string;
  objective_target?: number | string;
  condition_label?: string;
  objective_game_category?: string;
  min_bet?: number | string;
  min_multiplier?: number | string;
  bet_currency?: string;
  /** Game route keys (array), or empty for all games in the category. */
  games?: string[] | string;
  time_frame_type?: string;
  start_date?: string;
  end_date?: string;
  reward_type?: string;
  reward_amount?: number | string;
  reward_label?: string;
  max_bonus?: number | string;
  bonus_wagering?: string;
  deposit_required?: boolean;
  wagering_required?: boolean;
  more_details?: string;
  [key: string]: unknown;
}

export interface GamruMission {
  id: string;
  name: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  priority?: number;
  tags?: string[];
  data?: GamruMissionData;
  created_at?: string;
  updated_at?: string;
}

/**
 * A mission bundle as authored in Gamru (Gamification → Mission Bundles). A
 * bundle is a curated GROUPING of existing missions — it carries no reward of
 * its own; the player completes/claims each mission individually. The wizard's
 * fields live in the JSONB `data` blob, so every `data` field is optional.
 */
export interface GamruMissionBundleData {
  large_image?: string;
  small_image?: string;
  /** daily | weekly | monthly | lifetime — how the bundle resets. */
  periodicity?: string;
  /** "Lifetime" | "Custom". */
  bundle_type?: string;
  /**
   * The missions grouped in this bundle, authored via the multi-select in
   * Gamru. Each entry carries the mission `id` (the relation to the missions
   * table) and `name`. May be a legacy array of names, or a comma-separated
   * string, on older bundles.
   */
  missions?: Array<{ id?: string; name?: string } | string> | string;
  easter_eggs?: string;
  start_date?: string;
  end_date?: string;
  /** "All Players" | "Segment" — who the bundle is visible to. */
  eligibility_type?: string;
  /**
   * When eligibility_type is "Segment", the segment names the bundle is limited
   * to (multi-select in Gamru). May be a legacy single string on older bundles.
   */
  segment?: string[] | string;
  [key: string]: unknown;
}

export interface GamruMissionBundle {
  id: string;
  name: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  priority?: number;
  tags?: string[];
  data?: GamruMissionBundleData;
  created_at?: string;
  updated_at?: string;
}

/**
 * A tournament as authored in Gamru (Settings → Gamification → Tournaments).
 * Common columns are first-class; the multi-step wizard's fields live in the
 * JSONB `data` blob, so every `data` field is optional.
 */
export interface GamruTournamentData {
  large_image?: string;
  small_image?: string;
  industry?: "Casino" | "Sports" | string;
  tournament_type?: string;
  /** Game route keys on the games platform (e.g. ["lucky-spinner"]). */
  games?: string[];
  /** Legacy single-game field; superseded by `games`. */
  game?: string;
  period?: string;
  min_bet?: number | string;
  max_bets?: number | string;
  buy_in?: number | string;
  opt_in?: boolean;
  start_date?: string;
  end_date?: string;
  leaderboard_size?: number | string;
  prize_pool?: number | string;
  eligibility_type?: string;
  segment?: string;
  [key: string]: unknown;
}

export interface GamruTournament {
  id: string;
  name: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  priority?: number;
  tags?: string[];
  data?: GamruTournamentData;
  created_at?: string;
  updated_at?: string;
}

/**
 * Player-facing widgets customization configured in Settings → Widgets.
 * Banner image URLs (desktop / mobile) and the casino / sport tag colors.
 */
export interface GamruWidgetsConfig {
  missions_banner_desktop?: string;
  missions_banner_mobile?: string;
  tournaments_banner_desktop?: string;
  tournaments_banner_mobile?: string;
  tournaments_tag_color_casino?: string;
  tournaments_tag_color_sport?: string;
}

/**
 * Shape of the gamification profile a player carries in Gamru.
 * These mirror the actual Gamru `players` payload (snake_case). Every
 * field is optional — Gamru is the source of truth but may be
 * unreachable or partially populated, so callers must fall back safely.
 */
export interface GamruUserProfileData {
  id?: string;
  external_id?: string;
  player_id?: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  status?: string;
  gamification_active?: boolean;

  /** Gamification fields as Gamru actually returns them. */
  level?: number;
  max_level?: number;
  xp_points?: number;
  xp_to_next?: number;
  rank_name?: string;
  tokens?: number;

  /**
   * Rich nested gamification payload (progress, next_rank, levels,
   * ranks, logs, …). Present on the `by-email` player fetch; absent on
   * leaner payloads, so treat as optional.
   */
  gamification?: GamruGamification;

  /** Player-facing widgets customization (banners + tag colors). */
  widgets_config?: GamruWidgetsConfig | null;

  /**
   * Names of the CRM segments this player currently belongs to, resolved by
   * gamru's segment rule engine at fetch time. Used to gate segment-restricted
   * content (e.g. mission bundles). Absent on leaner payloads.
   */
  segments?: string[];

  /** Optional XP ledger (absent on the basic player payload). */
  xp_history?: Array<{
    id: string;
    source: string;
    rule_code: string | null;
    xp_amount: number;
    balance_after: number;
    created_at: string;
  }>;
  [key: string]: unknown;
}

/**
 * Shape of the data Gamru returns from
 * `POST /players/by-email/add-xp` — the player's gamification snapshot
 * after the XP has been applied. Every field is optional: Gamru is the
 * source of truth but may be unreachable or only partially populated, so
 * callers must fall back safely.
 */
/**
 * Optional per-play game metadata pushed alongside an XP delta. Gamru
 * uses it to aggregate the player's casino personalization view
 * (game category / provider mix and favorite games).
 */
export interface GamruAddXpGame {
  id?: string | null;
  name?: string | null;
  category?: string | null;
  provider?: string | null;
  /** Bet size for this round — feeds the turnover totals. */
  turnover?: number | null;
}

export interface GamruAddXpPointUserResponse {
  id?: string;
  external_id?: string;
  player_id?: string;
  email?: string;
  name?: string;
  level?: number;
  max_level?: number;
  xp_points?: number;
  xp_to_next?: number;
  rank_name?: string;
  tokens?: number;
  /** XP just applied by this call, when Gamru echoes it back. */
  xp_added?: number;
  [key: string]: unknown;
}

/* ── Integration API DTOs (GAMRU is the source of truth) ──────────────────── */

/** A mission with the player's GAMRU-computed progress merged in. */
export interface GamruIntMission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  bucket: "Casino" | "Sport";
  vip: boolean;
  duration_days: number | null;
  large_image: string | null;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED";
  objective_type: string;
  measure: string;
  target: number;
  progress: number;
  condition: string;
  game_category: string | null;
  min_bet: number | null;
  min_multiplier: number | null;
  bet_currency: string;
  games: string[];
  start_date: string | null;
  end_date: string | null;
  reward_type: string;
  reward_amount: number;
  reward_label: string;
  max_bonus: number | null;
  bonus_wagering: string;
  deposit_required: boolean;
  wagering_required: boolean;
  more_details: string | null;
  tags: string[];
  completed_at: string | null;
  claimed_at: string | null;
}

/**
 * A mission bundle with the player's grouped, per-bundle-track progress merged
 * in (GAMRU-computed). A bundle is a curated GROUPING of existing missions; the
 * player joins / progresses / claims each member mission individually. Only
 * bundles the player is ELIGIBLE for (segment-gated) are returned.
 */
export interface GamruIntBundle {
  id: string;
  name: string;
  description: string | null;
  large_image: string | null;
  small_image: string | null;
  bundle_type: string | null;
  periodicity: string | null;
  priority: number;
  eligibility_type: string | null;
  segments: string[];
  tags: string[];
  /** The grouped member missions, each with this player's progress. */
  missions: GamruIntMission[];
  /** How many missions the bundle groups (the denominator). */
  total: number;
  /** Missions already COMPLETED or CLAIMED on this bundle's track. */
  completed: number;
}

export interface GamruIntTournament {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  tournament_type: string | null;
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
  state: "SCHEDULED" | "IN_PROGRESS" | "ENDED";
}

export interface GamruIntLeaderboardEntry {
  rank: number;
  email: string;
  name: string;
  score: number;
  is_me: boolean;
  prize: number;
  /** Whether this player already claimed their prize (server-authoritative). */
  claimed: boolean;
}

export interface GamruIntTournamentProgress {
  tournament_id: string;
  registered: boolean;
  score: number;
  plays: number;
  rank: number | null;
  prize_amount: number;
  prize_awarded: boolean;
  claimed: boolean;
  status: string | null;
}

export interface GamruIntTournamentHistory {
  tournament_id: string;
  name: string;
  industry: string;
  image: string | null;
  plays: number;
  games_played: Array<{ game: string; plays: number }>;
  xp: number;
  rank: number;
  prize: number;
  claimed: boolean;
  last_played_at: string | null;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  data?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  token?: string;
}


const buildUrl = (
  path: string,
  query?: RequestOptions["query"]
): string => {
  const url = `${env.gamru.baseUrl}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
  return qs ? `${url}?${qs}` : url;
};

/**
 * Module-level snapshot of how gamru currently sees this game platform's
 * client_auth_key. Updated by `verifyGamruClient` at boot and by every
 * subsequent response, mostly for logging/visibility. Gamru is the live
 * source of truth — every outbound request still goes to gamru and the
 * real 401/403 response is what surfaces to the caller. We do NOT
 * short-circuit on a cached DISABLED/INVALID_KEY because doing so makes
 * the cache impossible to recover from (no further response = no signal
 * to flip the flag back to ENABLED).
 */
export type GamruClientStatus =
  | "UNKNOWN"
  | "ENABLED"
  | "DISABLED"
  | "INVALID_KEY";

let gamruClientStatus: GamruClientStatus = "UNKNOWN";

export const setGamruClientStatus = (next: GamruClientStatus): void => {
  if (gamruClientStatus !== next) {
    logger.info(
      `Gamru client status transition: ${gamruClientStatus} → ${next}`
    );
  }
  gamruClientStatus = next;
};

export const getGamruClientStatus = (): GamruClientStatus => gamruClientStatus;

export const request = async <T = unknown>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<GamruResult<T>> => {
  // Hard guard: refuse to even attempt a call without the per-client API
  // key. env.ts already enforces this at boot via `required()`, but a
  // defensive in-process check makes the failure unambiguous if someone
  // mutates env at runtime or imports this file in a script context.
  if (!env.gamru.clientAuthKey) {
    const message =
      "GAMRU_CLIENT_AUTH_KEY is not configured — refusing to call gamru without a per-client auth key";
    logger.error(message, { method, path });
    return { ok: false, error: message };
  }

  const url = buildUrl(path, options.query);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    env.gamru.timeoutMs
  );

  try {
    const headers: Record<string, string> = {
      // Multi-client identity: the per-client API key from gamru's
      // `clientConfig` row. Required by gamru's `clientAuth` middleware
      // on every endpoint this service calls.
      "x-client-auth-key": env.gamru.clientAuthKey,
    };
    // Optional defence-in-depth: shared service key for s2s calls.
    if (env.gamru.serviceKey) {
      headers["x-service-key"] = env.gamru.serviceKey;
    }
    const hasBody =
      options.data !== undefined && method !== "GET" && method !== "DELETE";
    if (hasBody) headers["Content-Type"] = "application/json";
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.data) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON response — keep raw text */
    }

    if (!res.ok) {
      // Cache auth-rejection verdicts so the next call can short-circuit.
      // 403 with the literal gamru clientAuth message → client is disabled.
      // 401 from any path → key is missing/unknown server-side.
      const bodyMessage =
        body && typeof body === "object" && body !== null && "message" in body
          ? String((body as { message?: unknown }).message ?? "")
          : "";

      if (res.status === 403 && /disabled/i.test(bodyMessage)) {
        setGamruClientStatus("DISABLED");
      } else if (res.status === 401) {
        setGamruClientStatus("INVALID_KEY");
      }

      logger.warn("Gamru request failed", {
        method,
        url,
        status: res.status,
        body,
      });
      return {
        ok: false,
        status: res.status,
        body: body as T,
        error: bodyMessage || undefined,
      };
    }

    // Any successful auth-bearing response is proof the client is alive
    // again — recover from a stale DISABLED/INVALID_KEY if an admin just
    // re-enabled us.
    if (gamruClientStatus !== "ENABLED") {
      setGamruClientStatus("ENABLED");
    }
    return { ok: true, status: res.status, body: body as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Gamru request errored", {
      method,
      url,
      error: message,
    });
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
};

// Convenience wrappers around `request`.
const get = <T = unknown>(
  path: string,
  query?: RequestOptions["query"],
  token?: string
) => request<T>("GET", path, { query, token });

const post = <T = unknown>(
  path: string,
  data?: unknown,
  token?: string,
  query?: RequestOptions["query"]
) => request<T>("POST", path, { data, token, query });

const put = <T = unknown>(
  path: string,
  data?: unknown,
  token?: string,
  query?: RequestOptions["query"]
) => request<T>("PUT", path, { data, token, query });

const patch = <T = unknown>(
  path: string,
  data?: unknown,
  token?: string,
  query?: RequestOptions["query"]
) => request<T>("PATCH", path, { data, token, query });

const del = <T = unknown>(path: string, token?: string) =>
  request<T>("DELETE", path, { token });

/**
 * Peel gamru's `{ success, message, data }` envelope to the inner `data`,
 * leaving the `GamruResult` ok/status/error in place. Used by the integration
 * client so callers get the typed payload directly. Never throws.
 */
const unwrap = async <T = unknown>(
  res: Promise<GamruResult>
): Promise<GamruResult<T>> => {
  const r = await res;
  if (!r.ok) return r as GamruResult<T>;
  const raw = r.body as Record<string, unknown> | null | undefined;
  const data =
    raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  return { ok: r.ok, status: r.status, error: r.error, body: data as T };
};

type Q = RequestOptions["query"];

/**
 * Player on-site INBOX client — the READ side of GAMRU's campaign delivery
 * channel (`/api/inbox/*`, clientAuth, player resolved by email). Shared by
 * both `gamru.integration.campaigns.inbox` (the canonical grouping, parallel
 * to `integration.missions` / `tournaments`) and the top-level `gamru.inbox`
 * backward-compat alias.
 */
const inboxApi = {
  list: (email: string, query?: Q) =>
    unwrap<GamruInboxResponse>(
      post("/inbox/list", { email, ...(query ?? {}) })
    ),
  read: (id: string, email: string) =>
    unwrap<GamruInboxItem>(post(`/inbox/${id}/read`, { email })),
  click: (id: string, email: string) =>
    unwrap<GamruInboxItem>(post(`/inbox/${id}/click`, { email })),
  unsubscribe: (
    email: string,
    channel: string,
    reason?: string,
    campaignName?: string
  ) =>
    post("/inbox/unsubscribe", {
      email,
      channel,
      reason,
      campaign_name: campaignName,
    }),
};

export const gamru = {
  /** /api/auth */
  auth: {
    register: (data: unknown) => post("/auth/register", data),
    login: (data: { email: string; password: string }) =>
      post("/auth/login", data),
    resetPassword: (data: unknown) => post("/auth/reset-password", data),
  },

  /** /api/users */
  users: {
    add: (data: GamruUserPayload | unknown) =>
      post("/users/add", data),
    updateById: (id: string, data: unknown, token?: string) =>
      post(`/users/update-by/${id}`, data, token),
    me: (token: string) => get("/users/me", undefined, token),
    updateMe: (data: unknown, token: string) =>
      patch("/users/me", data, token),
    changePassword: (data: unknown, token: string) =>
      post("/users/me/change-password", data, token),
    list: (token: string) => get("/users", undefined, token),
    paginate: (query: Q, token: string) =>
      get("/users/paginate", query, token),
    deleteById: (id: string, token: string) =>
      del(`/users/${id}`, token),
  },

  /** /api/user-log */
  userLog: {
    add: (data: unknown, token: string) =>
      post("/user-log/add", data, token),
    list: (token: string) => get("/user-log", undefined, token),
    paginate: (query: Q, token: string) =>
      get("/user-log/paginate", query, token),
    getById: (id: string, token: string) =>
      get(`/user-log/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/user-log/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) =>
      del(`/user-log/${id}`, token),
  },

  /** /api/roles */
  roles: {
    add: (data: unknown, token: string) => post("/roles/add", data, token),
    list: (token: string) => get("/roles", undefined, token),
    paginate: (query: Q, token: string) =>
      get("/roles/paginate", query, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/roles/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) => del(`/roles/${id}`, token),
  },

  /** /api/system-settings */
  systemSettings: {
    getAll: (token: string) =>
      get("/system-settings/settings", undefined, token),
    bulkUpsert: (data: unknown, token: string) =>
      put("/system-settings/settings/bulk", data, token),
    getPanel: (panel: string, token: string) =>
      get(`/system-settings/settings/${panel}`, undefined, token),
    getOne: (panel: string, key: string, token: string) =>
      get(`/system-settings/settings/${panel}/${key}`, undefined, token),
    upsertOne: (panel: string, key: string, data: unknown, token: string) =>
      put(`/system-settings/settings/${panel}/${key}`, data, token),
    deleteOne: (panel: string, key: string, token: string) =>
      del(`/system-settings/settings/${panel}/${key}`, token),

    accountStatuses: {
      list: (token: string) =>
        get("/system-settings/account-statuses", undefined, token),
      bulkReplace: (data: unknown, token: string) =>
        put("/system-settings/account-statuses/bulk", data, token),
      create: (data: unknown, token: string) =>
        post("/system-settings/account-statuses", data, token),
      getById: (id: string, token: string) =>
        get(`/system-settings/account-statuses/${id}`, undefined, token),
      updateById: (id: string, data: unknown, token: string) =>
        put(`/system-settings/account-statuses/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/system-settings/account-statuses/${id}`, token),
    },

    paymentMethods: {
      list: (token: string) =>
        get("/system-settings/payment-methods", undefined, token),
      bulkReplace: (data: unknown, token: string) =>
        put("/system-settings/payment-methods/bulk", data, token),
      create: (data: unknown, token: string) =>
        post("/system-settings/payment-methods", data, token),
      getById: (id: string, token: string) =>
        get(`/system-settings/payment-methods/${id}`, undefined, token),
      updateById: (id: string, data: unknown, token: string) =>
        put(`/system-settings/payment-methods/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/system-settings/payment-methods/${id}`, token),
    },

    languages: {
      list: (token: string) =>
        get("/system-settings/languages", undefined, token),
      bulkReplace: (data: unknown, token: string) =>
        put("/system-settings/languages/bulk", data, token),
      create: (data: unknown, token: string) =>
        post("/system-settings/languages", data, token),
      getById: (id: string, token: string) =>
        get(`/system-settings/languages/${id}`, undefined, token),
      updateById: (id: string, data: unknown, token: string) =>
        put(`/system-settings/languages/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/system-settings/languages/${id}`, token),
    },

    oauthClients: {
      list: (token: string) =>
        get("/system-settings/oauth-clients", undefined, token),
      create: (data: unknown, token: string) =>
        post("/system-settings/oauth-clients", data, token),
      getById: (id: string, token: string) =>
        get(`/system-settings/oauth-clients/${id}`, undefined, token),
      updateById: (id: string, data: unknown, token: string) =>
        put(`/system-settings/oauth-clients/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/system-settings/oauth-clients/${id}`, token),
    },

    webhooks: {
      list: (token: string) =>
        get("/system-settings/webhooks", undefined, token),
      create: (data: unknown, token: string) =>
        post("/system-settings/webhooks", data, token),
      getById: (id: string, token: string) =>
        get(`/system-settings/webhooks/${id}`, undefined, token),
      updateById: (id: string, data: unknown, token: string) =>
        put(`/system-settings/webhooks/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/system-settings/webhooks/${id}`, token),
    },
  },

  /** /api/tags-gamification */
  gamificationTags: {
    paginate: (query: Q, token: string) =>
      get("/tags-gamification/paginate", query, token),
    add: (data: unknown, token: string) =>
      post("/tags-gamification/add", data, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/tags-gamification/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) =>
      del(`/tags-gamification/${id}`, token),
  },

  /** /api/media-database */
  mediaDatabase: {
    paginate: (query: Q, token: string) =>
      get("/media-database/paginate", query, token),
    /** Note: upload route expects multipart/form-data; pass a FormData-aware
     *  payload or call `request` directly with a prepared body. */
    add: (data: unknown, token: string) =>
      post("/media-database/add", data, token),
    deleteById: (id: string, token: string) =>
      del(`/media-database/${id}`, token),
  },

  /** /api/casino-catalog */
  casinoCatalog: {
    games: {
      paginate: (query: Q, token: string) =>
        get("/casino-catalog/games/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/casino-catalog/games/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/casino-catalog/games/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/casino-catalog/games/${id}`, token),
    },
    categories: {
      paginate: (query: Q, token: string) =>
        get("/casino-catalog/categories/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/casino-catalog/categories/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/casino-catalog/categories/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/casino-catalog/categories/${id}`, token),
    },
    providers: {
      paginate: (query: Q, token: string) =>
        get("/casino-catalog/providers/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/casino-catalog/providers/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/casino-catalog/providers/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/casino-catalog/providers/${id}`, token),
    },
  },

  /** /api/sport-catalog */
  sportCatalog: {
    sports: {
      paginate: (query: Q, token: string) =>
        get("/sport-catalog/sports/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/sport-catalog/sports/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/sport-catalog/sports/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/sport-catalog/sports/${id}`, token),
    },
    teams: {
      paginate: (query: Q, token: string) =>
        get("/sport-catalog/teams/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/sport-catalog/teams/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/sport-catalog/teams/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/sport-catalog/teams/${id}`, token),
    },
    tournaments: {
      paginate: (query: Q, token: string) =>
        get("/sport-catalog/tournaments/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/sport-catalog/tournaments/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/sport-catalog/tournaments/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/sport-catalog/tournaments/${id}`, token),
    },
    markets: {
      paginate: (query: Q, token: string) =>
        get("/sport-catalog/markets/paginate", query, token),
      add: (data: unknown, token: string) =>
        post("/sport-catalog/markets/add", data, token),
      updateById: (id: string, data: unknown, token: string) =>
        post(`/sport-catalog/markets/update-by/${id}`, data, token),
      deleteById: (id: string, token: string) =>
        del(`/sport-catalog/markets/${id}`, token),
    },
  },

  /**
   * /api/gamification — every resource is generated by buildGamificationRouter
   * and shares the same CRUD shape. Pass one of the known resource keys.
   */
  gamification: {
    list: (resource: string, query: Q, token: string) =>
      get(`/gamification/${resource}`, query, token),
    create: (resource: string, data: unknown, token: string) =>
      post(`/gamification/${resource}`, data, token),
    paginate: (resource: string, data: unknown, token: string) =>
      post(`/gamification/${resource}/paginate`, data, token),
    getById: (resource: string, id: string, token: string) =>
      get(`/gamification/${resource}/${id}`, undefined, token),
    updateById: (
      resource: string,
      id: string,
      data: unknown,
      token: string
    ) => post(`/gamification/${resource}/update-by/${id}`, data, token),
    deleteById: (resource: string, id: string, token: string) =>
      del(`/gamification/${resource}/${id}`, token),
  },

  /**
   * /api/gamification/:feature/:id/participants — record a player's
   * participation in a mission / mission-bundle (clientAuth, S2S). Keyed by the
   * gamru entity id (mission id for the standalone tab, bundle id for a bundle)
   * so the operator console's "Participated" count reflects joins, with mission
   * and bundle counts kept independent.
   */
  participation: {
    record: (
      feature: "missions" | "mission-bundles",
      entityId: string,
      data: {
        email: string;
        external_id?: string;
        name?: string | null;
        status?: string;
      }
    ) => post(`/gamification/${feature}/${entityId}/participants`, data),
  },

  /** /api/tournament-leaderboard — push player scores to the backoffice. */
  tournamentLeaderboard: {
    submitScore: (
      tournamentId: string,
      data: { email: string; name?: string | null; points: number }
    ) => post(`/tournament-leaderboard/${tournamentId}/score`, data),
    getStandings: (tournamentId: string, token: string) =>
      get(`/tournament-leaderboard/${tournamentId}`, undefined, token),
  },

  /**
   * GAMRU mission & tournament progression API — the single source of truth.
   * Top-level resource paths (`/api/missions`, `/api/tournaments`, `/api/users`,
   * `/api/activity` — no `/integration` prefix). The player is resolved by
   * `email`; `external_id` is this platform's user id (kept for audit / reverse
   * lookup). All progression logic lives in GAMRU; this platform only forwards
   * events and caches what it returns. Every method returns the unwrapped `data`.
   */
  integration: {
    missions: {
      list: (email: string) =>
        unwrap<{ missions: GamruIntMission[] }>(get("/missions", { email })),
      get: (id: string, email: string, bundleId?: string | null) =>
        unwrap<GamruIntMission>(
          get(`/missions/${id}`, { email, bundleId: bundleId ?? undefined })
        ),
      join: (
        id: string,
        data: { email: string; external_id?: string; bundleId?: string | null }
      ) => unwrap<GamruIntMission>(post(`/missions/${id}/join`, data)),
      cancel: (
        id: string,
        data: { email: string; bundleId?: string | null }
      ) => unwrap<{ cancelled: boolean }>(post(`/missions/${id}/cancel`, data)),
      progress: (id: string, email: string, bundleId?: string | null) =>
        unwrap<GamruIntMission>(
          get(`/missions/${id}/progress`, {
            email,
            bundleId: bundleId ?? undefined,
          })
        ),
      claim: (id: string, data: { email: string; bundleId?: string | null }) =>
        unwrap<{ reward_label: string; mission: GamruIntMission }>(
          post(`/missions/${id}/claim`, data)
        ),
    },
    missionBundles: {
      list: (email: string) =>
        unwrap<{ bundles: GamruIntBundle[] }>(
          get("/mission-bundles", { email })
        ),
      get: (id: string, email: string) =>
        unwrap<GamruIntBundle>(get(`/mission-bundles/${id}`, { email })),
      // Per-member-mission lifecycle on the bundle's own track.
      join: (
        bundleId: string,
        missionId: string,
        data: { email: string; external_id?: string }
      ) =>
        unwrap<GamruIntMission>(
          post(
            `/mission-bundles/${bundleId}/missions/${missionId}/join`,
            data
          )
        ),
      cancel: (bundleId: string, missionId: string, data: { email: string }) =>
        unwrap<{ cancelled: boolean }>(
          post(
            `/mission-bundles/${bundleId}/missions/${missionId}/cancel`,
            data
          )
        ),
      progress: (bundleId: string, missionId: string, email: string) =>
        unwrap<GamruIntMission>(
          get(
            `/mission-bundles/${bundleId}/missions/${missionId}/progress`,
            { email }
          )
        ),
      advance: (
        bundleId: string,
        missionId: string,
        data: {
          email: string;
          stake?: number;
          win?: boolean;
          winAmount?: number;
          gameKey?: string | null;
        }
      ) =>
        unwrap<GamruIntMission>(
          post(
            `/mission-bundles/${bundleId}/missions/${missionId}/progress`,
            data
          )
        ),
      claim: (bundleId: string, missionId: string, data: { email: string }) =>
        unwrap<{ reward_label: string; mission: GamruIntMission }>(
          post(
            `/mission-bundles/${bundleId}/missions/${missionId}/claim`,
            data
          )
        ),
    },
    tournaments: {
      list: (email: string) =>
        unwrap<{ tournaments: GamruIntTournament[] }>(
          get("/tournaments", { email })
        ),
      get: (id: string, email: string) =>
        unwrap<{
          tournament: GamruIntTournament;
          leaderboard: GamruIntLeaderboardEntry[];
        }>(get(`/tournaments/${id}`, { email })),
      join: (id: string, data: { email: string; external_id?: string }) =>
        unwrap<GamruIntTournamentProgress>(
          post(`/tournaments/${id}/join`, data)
        ),
      progress: (id: string, email: string) =>
        unwrap<GamruIntTournamentProgress>(
          get(`/tournaments/${id}/progress`, { email })
        ),
      leaderboard: (id: string, email: string, size?: number | null) =>
        unwrap<{ leaderboard: GamruIntLeaderboardEntry[] }>(
          get(`/tournaments/${id}/leaderboard`, {
            email,
            size: size ?? undefined,
          })
        ),
      score: (
        id: string,
        data: { email: string; points: number; game?: string | null; external_id?: string }
      ) =>
        unwrap<{ tournament_id: string; score: number; applied: number }>(
          post(`/tournaments/${id}/score`, data)
        ),
      claim: (id: string, data: { email: string }) =>
        unwrap<{ prize: number }>(post(`/tournaments/${id}/claim`, data)),
    },
    users: {
      missions: (userId: string, email: string) =>
        unwrap<{ missions: GamruIntMission[] }>(
          get(`/users/${userId}/missions`, { email })
        ),
      tournaments: (userId: string, email: string) =>
        unwrap<{ tournaments: GamruIntTournamentHistory[] }>(
          get(`/users/${userId}/tournaments`, { email })
        ),
    },
    /** Forward a gameplay / login event so GAMRU advances progress. */
    activity: (data: {
      email: string;
      external_id?: string;
      kind?: "play" | "login";
      stake?: number;
      win?: boolean;
      winAmount?: number;
      gameKey?: string | null;
      missionId?: string | null;
      bundleId?: string | null;
      tournamentId?: string | null;
      points?: number;
    }) => unwrap<{ missions: GamruIntMission[] }>(post("/activity", data)),

    /**
     * CRM campaign delivery — the same bridge as `missions` / `tournaments`,
     * but for messages. Campaigns are AUTHORED in gamru (admin console) and
     * DELIVERED to the player's on-site inbox here. GAMRU owns segment
     * resolution, template rendering, consent / frequency-cap enforcement and
     * analytics; this platform only (a) forwards events that may trigger a
     * campaign and (b) reads/acks the resulting inbox messages.
     */
    campaigns: {
      /**
       * Forward a lifecycle / gameplay event so GAMRU evaluates every
       * event-triggered campaign (Login, Deposit, Registration, …) and
       * delivers any match. Fire-and-forget at the call sites (registration,
       * deposit, login); returns the raw `GamruResult` so callers can log a
       * rejection. `POST /integration/events`.
       */
      trigger: (event: GamruIntegrationEvent) =>
        post(`/integration/events`, { origin: "gamify", ...event }),
      /** Read side of the channel — the player's on-site inbox. */
      inbox: inboxApi,
    },
  },

  /** /api/campaigns */
  campaigns: {
    add: (data: unknown, token: string) =>
      post("/campaigns/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/campaigns/paginate", query, token),
    getById: (id: string, token: string) =>
      get(`/campaigns/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/campaigns/update-by/${id}`, data, token),
    archiveById: (id: string, token: string) =>
      post(`/campaigns/archive/${id}`, undefined, token),
    restoreById: (id: string, token: string) =>
      post(`/campaigns/restore/${id}`, undefined, token),
    deleteById: (id: string, token: string) =>
      del(`/campaigns/${id}`, token),
  },

  /** /api/segments */
  segments: {
    add: (data: unknown, token: string) =>
      post("/segments/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/segments/paginate", query, token),
    creators: (token: string) =>
      get("/segments/creators", undefined, token),
    getById: (id: string, token: string) =>
      get(`/segments/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/segments/update-by/${id}`, data, token),
    archiveById: (id: string, token: string) =>
      post(`/segments/archive/${id}`, undefined, token),
    restoreById: (id: string, token: string) =>
      post(`/segments/restore/${id}`, undefined, token),
    deleteById: (id: string, token: string) =>
      del(`/segments/${id}`, token),
  },

  /** /api/templates */
  templates: {
    add: (data: unknown, token: string) =>
      post("/templates/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/templates/paginate", query, token),
    getById: (id: string, token: string) =>
      get(`/templates/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/templates/update-by/${id}`, data, token),
    archiveById: (id: string, token: string) =>
      post(`/templates/archive/${id}`, undefined, token),
    restoreById: (id: string, token: string) =>
      post(`/templates/restore/${id}`, undefined, token),
    deleteById: (id: string, token: string) =>
      del(`/templates/${id}`, token),
  },

  /** /api/custom-triggers */
  customTriggers: {
    add: (data: unknown, token: string) =>
      post("/custom-triggers/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/custom-triggers/paginate", query, token),
    getById: (id: string, token: string) =>
      get(`/custom-triggers/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/custom-triggers/update-by/${id}`, data, token),
    archiveById: (id: string, token: string) =>
      post(`/custom-triggers/archive/${id}`, undefined, token),
    restoreById: (id: string, token: string) =>
      post(`/custom-triggers/restore/${id}`, undefined, token),
    deleteById: (id: string, token: string) =>
      del(`/custom-triggers/${id}`, token),
  },

  /** /api/frequency-caps */
  frequencyCaps: {
    add: (data: unknown, token: string) =>
      post("/frequency-caps/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/frequency-caps/paginate", query, token),
    getById: (id: string, token: string) =>
      get(`/frequency-caps/${id}`, undefined, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/frequency-caps/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) =>
      del(`/frequency-caps/${id}`, token),
  },

  /** /api/unsubscribe-reports */
  unsubscribeReports: {
    add: (data: unknown, token?: string) =>
      post("/unsubscribe-reports/add", data, token),
    paginate: (query: Q, token: string) =>
      get("/unsubscribe-reports/paginate", query, token),
  },

  /** /api/player-data */
  playerData: {
    add: (data: unknown, token: string) =>
      post("/player-data/add", data, token),
    bulk: (data: unknown, token: string) =>
      post("/player-data/bulk", data, token),
    paginate: (query: Q, token: string) =>
      get("/player-data/paginate", query, token),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/player-data/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) =>
      del(`/player-data/${id}`, token),
  },

  /** /api/players */
  players: {
    paginate: (query: Q, token: string) =>
      get("/players/paginate", query, token),
    add: (data: unknown, token: string) =>
      post("/players/add", data, token),
    getById: (id: string, token?: string) =>
      get(`/players/${id}`, undefined, token),
    getByEmail: (email: string) =>
      post(`/players/by-email`, { email }),
    addXpPoints: (
      email: string,
      amount: number,
      game?: GamruAddXpGame
    ) =>
      post(`/players/by-email/add-xp`, { email, amount, game }),
    updateById: (id: string, data: unknown, token: string) =>
      post(`/players/update-by/${id}`, data, token),
    deleteById: (id: string, token: string) =>
      del(`/players/${id}`, token),
    campaignHistory: (id: string, query: Q, token: string) =>
      get(`/players/${id}/campaign-history`, query, token),
    listRewards: (id: string, query: Q, token: string) =>
      get(`/players/${id}/rewards`, query, token),
    addReward: (id: string, data: unknown, token: string) =>
      post(`/players/${id}/rewards`, data, token),
    claimReward: (playerId: string, rewardId: string) =>
      post(`/players/${playerId}/rewards/${rewardId}/claim`, {}),
    // Grant a completed mission's reward to the player (lands in gamru's
    // reward ledger → Special Bonuses). clientAuth on gamru.
    claimMissionReward: (playerId: string, missionId: string) =>
      post(`/players/${playerId}/missions/${missionId}/claim`, {}),
    logs: (id: string, query: Q, token: string) =>
      get(`/players/${id}/logs`, query, token),
  },

  /** /api/players/:id/reward-shop — token-spend purchases. */
  rewardShop: {
    // Atomic token-spend on a reward_shop product. clientAuth on gamru.
    purchase: (
      playerId: string,
      data: { shop_item_id: string; quantity?: number }
    ) => post(`/players/${playerId}/reward-shop/purchase`, data),
  },

  /**
   * /api/inbox — the player's on-site campaign messages (clientAuth, by email).
   * Backward-compat alias; the canonical grouping is
   * `gamru.integration.campaigns.inbox` (parallel to `integration.missions` /
   * `tournaments`). Both point at the same `inboxApi`.
   */
  inbox: inboxApi,

  /**
   * /api/user-bonuses — mirror a claimed bonus into GAMRU's user_bonuses ledger
   * (clientAuth, player resolved by email). GAMRU also upserts a snapshot of the
   * bonus into its `bonuses` table. Fire-and-forget at the call site — a GAMRU
   * outage must never fail the player's claim.
   */
  bonuses: {
    recordClaim: (data: {
      email: string;
      external_id?: string;
      external_bonus_id: string;
      bonus_name: string;
      bonus_type?: string;
      source_type: string;
      source_id: string;
      amount: number;
      amount_type: string;
    }) => post("/user-bonuses/record", data),
  },

  /** /api/analytics */
  analytics: {
    campaigns: (query: Q, token: string) =>
      get("/analytics/campaigns", query, token),
    campaignById: (id: string, token: string) =>
      get(`/analytics/campaigns/${id}`, undefined, token),
    history: (query: Q, token: string) =>
      get("/analytics/history", query, token),
    track: (data: unknown, token: string) =>
      post("/analytics/track", data, token),
  },
};

export const createGamruUser = (
  payload: GamruUserPayload
): Promise<GamruResult> => gamru.users.add(payload);

export const getGamruUser = (
  userId: string,
  token?: string
): Promise<GamruResult> => gamru.players.getById(userId, token);


export const gamruUserProfileData = async (
  email: string,
  token?: string
): Promise<GamruResult<GamruUserProfileData>> => {
  const res = await gamru.players.getByEmail(email );
  if (!res.ok) return res as GamruResult<GamruUserProfileData>;

  const raw = res.body as Record<string, unknown> | null | undefined;
  const unwrapped = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  const profile = (unwrapped ?? undefined) as
    | GamruUserProfileData
    | undefined;

  return {
    ok: res.ok,
    status: res.status,
    error: res.error,
    body: profile,
  };
};

/**
 * Apply XP to a Gamru player by email and return the unwrapped
 * gamification snapshot. Gamru wraps payloads in `{ success, message,
 * data }`; this peels the envelope to a flat `GamruAddXpPointUserResponse`.
 * Never throws — on a Gamru outage it resolves with `ok:false`, so
 * callers can degrade gracefully without breaking gameplay.
 */
export const gamruAddXpPoints = async (
  email: string,
  amount: number,
  game?: GamruAddXpGame
): Promise<GamruResult<GamruAddXpPointUserResponse>> => {
  const res = await gamru.players.addXpPoints(email, amount, game);
  console.log("Gamru addXpPoints response>>", { email, amount, res });
  if (!res.ok) return res as GamruResult<GamruAddXpPointUserResponse>;

  const raw = res.body as Record<string, unknown> | null | undefined;
  const unwrapped =
    raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  const data = (unwrapped ?? undefined) as
    | GamruAddXpPointUserResponse
    | undefined;

  return {
    ok: res.ok,
    status: res.status,
    error: res.error,
    body: data,
  };
};

export const deriveUsername = (email: string): string =>
  email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase() || `user${Date.now()}`;

export default gamru;
