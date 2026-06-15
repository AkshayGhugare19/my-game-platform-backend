import env from "../../../config/env.ts";
import { AppError } from "../../../utils/AppError.ts";
import {
  gamru,
  gamruUserProfileData,
} from "../../../utils/gamruService.ts";
import {
  paginateArray,
  type Paginated,
} from "../../../utils/pagination.ts";
import RewardPurchaseRepository from "../model/reward-purchase.repository.ts";
import type RewardPurchase from "../model/reward-purchase.model.ts";

/* ────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────── */

export type ProductCategory = "product" | "booster";
export type BoosterKind = "token" | "xp" | "level" | "mission" | "generic";

export interface BoosterMeta {
  multiplier: number;
  durationMinutes: number;
  kind: BoosterKind;
}

export interface RewardProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  tokenPrice: number;
  realPrice: number | null;
  currency: string;
  /** Functional class used for booster logic. */
  category: ProductCategory;
  /** Admin-chosen category label from gamru (e.g. "Product", "Voucher"). */
  categoryLabel: string;
  tier: string | null;
  tags: string[];
  stockAvailable: number | null;
  type: string | null;
  booster: BoosterMeta | null;
  /** True when the player can afford one unit at the current balance. */
  affordable: boolean;
}

export interface BoosterView {
  id: string;
  productId: string;
  name: string;
  image: string | null;
  kind: BoosterKind;
  multiplier: number;
  tokenCost: number;
  tier: string | null;
  expiresAt: string | null;
  /** Seconds left before the booster expires, or null when permanent. */
  secondsRemaining: number | null;
  createdAt: string;
}

export interface PurchaseView {
  id: string;
  productId: string;
  productName: string;
  image: string | null;
  category: ProductCategory;
  tier: string | null;
  tokenCost: number;
  quantity: number;
  multiplier: number | null;
  boosterKind: string | null;
  durationMinutes: number | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

/* ────────────────────────────────────────────────────────────────────────
 * Catalog normalization (gamru reward_shop entity → RewardProduct)
 * ──────────────────────────────────────────────────────────────────────── */

// gamru serves uploaded images relative to its origin (not the /api base).
const GAMRU_ORIGIN = env.gamru.baseUrl.replace(/\/api\/?$/, "");

const absoluteImage = (raw: unknown): string | null => {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  return `${GAMRU_ORIGIN}/${s.replace(/^\/+/, "")}`;
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const TIER_RE = /(silver|gold|bronze|platinum|diamond)/i;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const resolveTier = (
  data: Record<string, unknown>,
  tags: string[]
): string | null => {
  if (typeof data.tier === "string" && data.tier.trim()) return data.tier;
  const tagged = tags.find((t) => TIER_RE.test(t));
  if (tagged) return cap(TIER_RE.exec(tagged)![1]);
  return null;
};

const resolveCategory = (
  name: string,
  data: Record<string, unknown>,
  tags: string[]
): ProductCategory => {
  const explicit = String(data.category ?? "").toLowerCase();
  if (explicit === "booster" || explicit === "product") return explicit;
  if (tags.some((t) => /boost/i.test(t))) return "booster";
  if (/boost/i.test(name)) return "booster";
  return "product";
};

const resolveBoosterKind = (
  name: string,
  data: Record<string, unknown>
): BoosterKind => {
  const explicit = String(data.booster_kind ?? "").toLowerCase();
  if (["token", "xp", "level", "mission", "generic"].includes(explicit))
    return explicit as BoosterKind;
  if (/token/i.test(name)) return "token";
  if (/\bxp\b/i.test(name)) return "xp";
  if (/level/i.test(name)) return "level";
  if (/mission/i.test(name)) return "mission";
  return "generic";
};

// "Tokens Booster 2X" → 2 ; "Level Booster 1.5X" → 1.5
const parseMultiplier = (
  name: string,
  data: Record<string, unknown>
): number => {
  const explicit = num(data.multiplier);
  if (explicit && explicit > 0) return explicit;
  const m = name.match(/(\d+(?:\.\d+)?)\s*[xX]\b/);
  const parsed = m ? Number(m[1]) : 0;
  return parsed > 0 ? parsed : 2;
};

// "(5 mins)" / "10 minute" / "1 hour" → minutes
const parseDuration = (
  text: string,
  data: Record<string, unknown>
): number => {
  const explicit = num(data.duration_minutes);
  if (explicit && explicit > 0) return explicit;
  const m = text.match(/(\d+)\s*(hour|hr|min|minute)/i);
  if (!m) return 5;
  const value = Number(m[1]);
  return /hour|hr/i.test(m[2]) ? value * 60 : value;
};

interface GamruRewardShopRow {
  id?: string;
  name?: string;
  description?: string | null;
  tags?: string[];
  data?: Record<string, unknown>;
  status?: string;
  archived?: boolean;
}

const normalize = (
  row: GamruRewardShopRow,
  tokenBalance: number
): RewardProduct => {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const name = row.name ?? "Untitled";
  const tokenPrice = num(data.token_price) ?? 0;
  const category = resolveCategory(name, data, tags);
  const rawCategory =
    typeof data.category === "string" && data.category.trim()
      ? data.category.trim()
      : null;
  const categoryLabel = rawCategory ?? (category === "booster" ? "Booster" : "Product");

  const booster: BoosterMeta | null =
    category === "booster"
      ? {
          multiplier: parseMultiplier(name, data),
          durationMinutes: parseDuration(
            `${name} ${row.description ?? ""}`,
            data
          ),
          kind: resolveBoosterKind(name, data),
        }
      : null;

  return {
    id: String(row.id),
    name,
    description: row.description ?? null,
    image: absoluteImage(data.large_image) ?? absoluteImage(data.small_image),
    tokenPrice,
    realPrice: num(data.real_price),
    currency: String(data.currency ?? "USD"),
    category,
    categoryLabel,
    tier: resolveTier(data, tags),
    tags,
    stockAvailable:
      data.stock_total === undefined || data.stock_total === null
        ? null
        : num(data.stock_available ?? data.stock_total),
    type: typeof data.type === "string" ? data.type : null,
    booster,
    affordable: tokenPrice > 0 && tokenBalance >= tokenPrice,
  };
};

/* ────────────────────────────────────────────────────────────────────────
 * Views for stored purchases
 * ──────────────────────────────────────────────────────────────────────── */

const toPurchaseView = (p: RewardPurchase): PurchaseView => ({
  id: p.id,
  productId: p.product_id,
  productName: p.product_name,
  image: p.image,
  category: p.category,
  tier: p.tier,
  tokenCost: Number(p.token_cost ?? 0),
  quantity: Number(p.quantity ?? 1),
  multiplier: p.multiplier === null ? null : Number(p.multiplier),
  boosterKind: p.booster_kind,
  durationMinutes: p.duration_minutes === null ? null : Number(p.duration_minutes),
  expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
  status: p.status,
  createdAt: new Date(p.created_at).toISOString(),
});

/* ────────────────────────────────────────────────────────────────────────
 * Public service API
 * ──────────────────────────────────────────────────────────────────────── */

interface GamruProfileSlice {
  playerId: string | null;
  tokens: number;
  catalog: GamruRewardShopRow[];
}

/** Pull the player's gamru profile once: id, live token balance, catalog. */
const loadGamruSlice = async (email: string): Promise<GamruProfileSlice> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    throw new AppError("Reward shop is temporarily unavailable", 503);
  }
  const body = res.body;
  const rawCatalog = (body.gamification?.reward_shop ?? []) as GamruRewardShopRow[];
  // Honour the admin "Hidden" visibility flag; gamru already filters
  // INACTIVE / archived rows out of the by-email payload.
  const catalog = rawCatalog.filter(
    (r) => String((r.data ?? {}).product_visibility ?? "Visible") !== "Hidden"
  );
  return {
    playerId: body.id ?? null,
    tokens: Number(body.tokens ?? 0),
    catalog,
  };
};

export interface RewardShopCatalog extends Paginated<RewardProduct> {
  tokens: number;
}

export const getProducts = async (
  email: string,
  page = 1,
  limit = 12
): Promise<RewardShopCatalog> => {
  const { tokens, catalog } = await loadGamruSlice(email);
  const products = catalog.filter((r) => r.id).map((r) => normalize(r, tokens));
  return { tokens, ...paginateArray(products, page, limit) };
};

export interface BuyResult {
  tokensRemaining: number;
  tokensSpent: number;
  boosterActivated: boolean;
  /** Null only if the local history mirror failed after a successful charge. */
  purchase: PurchaseView | null;
}

export const buyProduct = async (
  userId: string,
  email: string,
  productId: string,
  quantity = 1
): Promise<BuyResult> => {
  const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
  const { playerId, tokens, catalog } = await loadGamruSlice(email);

  if (!playerId) throw new AppError("Player profile not found in gamru", 404);

  const raw = catalog.find((r) => String(r.id) === String(productId));
  if (!raw) throw new AppError("Product not found", 404);

  const product = normalize(raw, tokens);
  if (product.tokenPrice <= 0) {
    throw new AppError("This product cannot be bought with tokens", 400);
  }
  const cost = product.tokenPrice * qty;
  if (tokens < cost) {
    throw new AppError("You don't have enough tokens for this purchase", 400);
  }

  // Source of truth: gamru deducts the tokens, decrements stock and records
  // the purchase atomically. We only mirror it locally for rich history.
  const res = await gamru.rewardShop.purchase(playerId, {
    shop_item_id: productId,
    quantity: qty,
  });
  if (!res.ok) {
    const body = res.body as { message?: string } | undefined;
    throw new AppError(
      body?.message || res.error || "Purchase failed on gamru",
      res.status && res.status >= 400 && res.status < 600 ? res.status : 502
    );
  }

  const payload = res.body as
    | { data?: { tokens_remaining?: number; tokens_spent?: number } }
    | undefined;
  const tokensRemaining = Number(payload?.data?.tokens_remaining ?? tokens - cost);
  const tokensSpent = Number(payload?.data?.tokens_spent ?? cost);

  const isBooster = product.category === "booster";
  const durationMinutes = isBooster ? product.booster!.durationMinutes : null;
  const expiresAt =
    isBooster && durationMinutes && durationMinutes > 0
      ? new Date(Date.now() + durationMinutes * 60_000)
      : null;

  // gamru has already charged the tokens at this point, so a failure to
  // mirror the purchase locally must NOT surface as a failed purchase —
  // log it and still confirm success with gamru's authoritative balance.
  let purchaseView: PurchaseView | null = null;
  try {
    const purchase = await RewardPurchaseRepository.create({
      user_id: userId,
      product_id: productId,
      product_name: product.name,
      image: product.image,
      category: product.category,
      tier: product.tier,
      token_cost: tokensSpent,
      quantity: qty,
      multiplier: isBooster ? product.booster!.multiplier : null,
      booster_kind: isBooster ? product.booster!.kind : null,
      duration_minutes: durationMinutes,
      expires_at: expiresAt,
      status: isBooster ? "ACTIVE" : "COMPLETED",
    });
    purchaseView = toPurchaseView(purchase);
  } catch (err) {
    console.error("Failed to record local reward purchase:", err);
  }

  return {
    tokensRemaining,
    tokensSpent,
    boosterActivated: isBooster,
    purchase: purchaseView,
  };
};

interface GamruRewardRow {
  id?: string;
  reward?: string | null;
  reward_type?: string | null;
  gamification_source?: string | null;
  granted_date?: string | null;
  created_at?: string | null;
  status?: string | null;
}

/** gamru records every reward-shop buy as a `reward-shop` reward-ledger row. */
const isShopReward = (r: GamruRewardRow): boolean =>
  String(r.gamification_source ?? "") === "reward-shop" ||
  String(r.reward_type ?? "") === "reward_shop_purchase";

/** Parse the gamru buy label `"Name ×2 — tokens 400"` → name / qty / tokens. */
const parseRewardLabel = (
  label: string
): { name: string; qty: number; tokens: number } => {
  const TOK = " — tokens ";
  const sep = label.lastIndexOf(TOK);
  let name = sep >= 0 ? label.slice(0, sep) : label;
  const tokens = sep >= 0 ? Number(label.slice(sep + TOK.length)) || 0 : 0;
  let qty = 1;
  const m = name.match(/\s×(\d+)$/);
  if (m) {
    qty = Number(m[1]) || 1;
    name = name.replace(/\s×\d+$/, "");
  }
  return { name: name.trim() || "Purchase", qty, tokens };
};

/**
 * Shop history comes from gamru's reward ledger — the single source of truth
 * that captures EVERY purchase (made via this page OR the embedded widget),
 * so both surfaces show the same complete history. (The local
 * `reward_purchases` table only mirrors page buys, so it is no longer the
 * history source; it still backs boosters, which need expiry tracking gamru
 * doesn't keep.) Purchase names are matched back to the live catalog for the
 * product image / category / tier.
 */
export const getHistory = async (
  email: string,
  page = 1,
  limit = 10
): Promise<Paginated<PurchaseView>> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    throw new AppError("Shop history is temporarily unavailable", 503);
  }
  const tokens = Number(res.body.tokens ?? 0);

  const rawCatalog = (res.body.gamification?.reward_shop ??
    []) as GamruRewardShopRow[];
  const byName = new Map<string, RewardProduct>();
  rawCatalog.forEach((r) => {
    if (r.name) byName.set(r.name.trim().toLowerCase(), normalize(r, tokens));
  });

  const rewards = (res.body.gamification?.rewards ?? []) as GamruRewardRow[];
  const purchases: PurchaseView[] = rewards
    .filter(isShopReward)
    .map((r) => {
      const { name, qty, tokens: cost } = parseRewardLabel(
        String(r.reward ?? "")
      );
      const product = byName.get(name.toLowerCase());
      const created = r.granted_date ?? r.created_at;
      return {
        id: String(r.id ?? ""),
        productId: product?.id ?? "",
        productName: name,
        image: product?.image ?? null,
        category: product?.category ?? "product",
        tier: product?.tier ?? null,
        tokenCost: cost,
        quantity: qty,
        multiplier: product?.booster?.multiplier ?? null,
        boosterKind: product?.booster?.kind ?? null,
        durationMinutes: product?.booster?.durationMinutes ?? null,
        expiresAt: null,
        status: String(r.status ?? "GRANTED"),
        createdAt: created
          ? new Date(created).toISOString()
          : new Date().toISOString(),
      };
    });

  return paginateArray(purchases, page, limit);
};

/**
 * Owned boosters, sourced from gamru's reward ledger — the same complete
 * record [[getHistory]] reads, so the page and the embedded widget list the
 * same boosters regardless of where they were bought. A booster is a purchase
 * whose product is in the catalog's Booster category; its multiplier / kind /
 * image come from that catalog product. gamru doesn't track activation/expiry,
 * so these are shown as owned (no countdown). The local `reward_purchases`
 * table still backs `getActiveBoostMultiplier`, which applies the live earning
 * boost for page-bought boosters within their duration.
 */
export const getBoosters = async (
  email: string,
  page = 1,
  limit = 12
): Promise<Paginated<BoosterView>> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    throw new AppError("Boosters are temporarily unavailable", 503);
  }
  const tokens = Number(res.body.tokens ?? 0);

  const rawCatalog = (res.body.gamification?.reward_shop ??
    []) as GamruRewardShopRow[];
  const boosterByName = new Map<string, RewardProduct>();
  rawCatalog.forEach((r) => {
    if (!r.name) return;
    const p = normalize(r, tokens);
    if (p.category === "booster") {
      boosterByName.set(r.name.trim().toLowerCase(), p);
    }
  });

  const rewards = (res.body.gamification?.rewards ?? []) as GamruRewardRow[];
  const boosters = rewards
    .filter(isShopReward)
    .map((r): BoosterView | null => {
      const { name, tokens: cost } = parseRewardLabel(String(r.reward ?? ""));
      const product = boosterByName.get(name.toLowerCase());
      if (!product || !product.booster) return null;
      const created = r.granted_date ?? r.created_at;
      return {
        id: String(r.id ?? ""),
        productId: product.id,
        name,
        image: product.image,
        kind: product.booster.kind,
        multiplier: product.booster.multiplier,
        tokenCost: cost,
        tier: product.tier,
        expiresAt: null,
        secondsRemaining: null,
        createdAt: created
          ? new Date(created).toISOString()
          : new Date().toISOString(),
      };
    })
    .filter((b): b is BoosterView => b !== null);

  return paginateArray(boosters, page, limit);
};

/**
 * The multiplier applied to XP/token earning right now: the highest active,
 * non-expired booster the player owns (1 when none). Used by the activity
 * engine so a purchased booster actually changes what the player earns.
 */
export const getActiveBoostMultiplier = async (
  userId: string
): Promise<number> => {
  const now = new Date();
  const rows = await RewardPurchaseRepository.activeBoosters(userId, now);
  return rows.reduce(
    (max, r) => Math.max(max, Number(r.multiplier ?? 1)),
    1
  );
};
