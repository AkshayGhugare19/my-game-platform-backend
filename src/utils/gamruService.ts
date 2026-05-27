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
}

export interface GamruResult<T = unknown> {
  ok: boolean;
  status?: number;
  body?: T;
  error?: string;
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
  ranks?: Array<Record<string, unknown>>;
  missions?: unknown[];
  mission_bundles?: unknown[];
  reward_shop?: unknown[];
  rewards?: unknown[];
  logs?: GamruGamificationLog[];
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

type Q = RequestOptions["query"];


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
    logs: (id: string, query: Q, token: string) =>
      get(`/players/${id}/logs`, query, token),
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
