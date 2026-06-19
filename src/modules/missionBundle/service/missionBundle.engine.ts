/**
 * Gamru-backed mission BUNDLE engine.
 *
 * Mission bundles are AUTHORED in gamru (Gamification → Mission Bundles) and
 * fetched live per request from the player's gamru profile payload
 * (`gamification.mission_bundles`). A bundle is a curated GROUPING of existing
 * missions — it carries no reward of its own. The player joins, progresses and
 * claims each mission individually (reusing the mission flow).
 *
 * Two important scoping rules live here:
 *  - Each bundle has its OWN participation track (a per-bundle `period_key`), so
 *    the same mission in two different bundles — and on the standalone Missions
 *    tab ("GAMRU") — tracks completely independently. A brand-new bundle always
 *    starts every mission at AVAILABLE.
 *  - Bundles are filtered by ELIGIBILITY: an "All Players" bundle shows to
 *    everyone; a "Segment" bundle shows only to players who belong to one of the
 *    selected segments (the player's segments are resolved by gamru and carried
 *    on the profile payload).
 */
import { AppError } from "../../../utils/AppError.ts";
import {
  gamruUserProfileData,
  type GamruMission,
  type GamruMissionBundle,
} from "../../../utils/gamruService.ts";
import {
  mapMission,
  mapBranding,
  joinMission,
  claimMission,
  cancelMission,
  type MissionDTO,
  type MissionBranding,
} from "../../mission/service/mission.engine.ts";
import UserMission from "../../mission/model/user-mission.model.ts";
import UserMissionRepository from "../../mission/model/user-mission.repository.ts";

/**
 * A bundle's participation track key. `period_key` is STRING(20), too short for
 * "BUNDLE:" + a uuid, so we derive a compact per-bundle key: "B" + the first 19
 * hex chars of the bundle id. That keeps every bundle independent (and distinct
 * from the standalone "GAMRU" track) while fitting the column.
 */
export const bundlePeriodKey = (bundleId: string): string =>
  ("B" + bundleId.replace(/-/g, "")).slice(0, 20);

const rowKey = (periodKey: string, missionId: string): string =>
  `${periodKey}::${missionId}`;

export interface BundleDTO {
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
  /** The missions grouped in this bundle, with the player's participation. */
  missions: MissionDTO[];
  /** How many missions the bundle groups. */
  total: number;
  /** Missions already COMPLETED or CLAIMED. */
  completed: number;
}

export interface BundleListResult {
  branding: MissionBranding;
  bundles: BundleDTO[];
}

const DEFAULT_BRANDING: MissionBranding = {
  banner_desktop: null,
  banner_mobile: null,
};

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/** Normalize a list-or-comma-string of plain names into trimmed names. */
const toNames = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  return list.map((s) => String(s).trim()).filter(Boolean);
};

interface MissionRef {
  id: string;
  name: string;
}

/**
 * Normalize a bundle's `data.missions` into `{ id, name }[]`, accepting the
 * current shape (objects with id+name), a legacy array of names, or a legacy
 * comma-separated string.
 */
const bundleMissionRefs = (raw: unknown): MissionRef[] => {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  return list
    .map((item): MissionRef =>
      item && typeof item === "object"
        ? {
            id: String((item as MissionRef).id ?? "").trim(),
            name: String((item as MissionRef).name ?? "").trim(),
          }
        : { id: "", name: String(item).trim() }
    )
    .filter((r) => r.id || r.name);
};

/** The segment names a "Segment"-eligibility bundle is limited to. */
const bundleSegments = (b: GamruMissionBundle): string[] =>
  toNames(b.data?.segment);

/**
 * Whether this bundle should be visible to a player with these segment names.
 * "All Players" (or unset eligibility) is always visible; a "Segment" bundle is
 * visible only when the player belongs to one of its segments. A segment bundle
 * with no segments chosen falls back to visible (nothing to restrict by).
 */
const isEligible = (
  b: GamruMissionBundle,
  playerSegments: Set<string>
): boolean => {
  const type = String(b.data?.eligibility_type ?? "").trim().toLowerCase();
  if (type !== "segment") return true;
  const segs = bundleSegments(b);
  if (segs.length === 0) return true;
  return segs.some((s) => playerSegments.has(s.toLowerCase()));
};

/**
 * Fetch the live catalog from gamru for this player in a single round-trip:
 * the raw missions (indexed by id and lowercased name), the raw bundles, the
 * player's bundle-track participation rows (indexed by period+mission), the
 * player's segments, and the page branding. Never throws on a gamru outage —
 * returns an empty catalog so the page still renders.
 */
const loadCatalog = async (
  userId: string,
  email: string
): Promise<{
  bundles: GamruMissionBundle[];
  rawById: Map<string, GamruMission>;
  rawByName: Map<string, GamruMission>;
  rowMap: Map<string, UserMission>;
  playerSegments: Set<string>;
  branding: MissionBranding;
}> => {
  const empty = {
    bundles: [] as GamruMissionBundle[],
    rawById: new Map<string, GamruMission>(),
    rawByName: new Map<string, GamruMission>(),
    rowMap: new Map<string, UserMission>(),
    playerSegments: new Set<string>(),
    branding: DEFAULT_BRANDING,
  };

  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) return empty;

  const missions = res.body.gamification?.missions ?? [];
  const bundles = res.body.gamification?.mission_bundles ?? [];
  const rows = await UserMissionRepository.listByUser(userId);

  const rawById = new Map<string, GamruMission>();
  const rawByName = new Map<string, GamruMission>();
  for (const m of missions) {
    rawById.set(m.id, m);
    rawByName.set(m.name.trim().toLowerCase(), m);
  }

  const rowMap = new Map<string, UserMission>(
    rows.map((r) => [rowKey(r.period_key, r.mission_id), r])
  );

  const playerSegments = new Set<string>(
    (res.body.segments ?? []).map((s) => String(s).trim().toLowerCase())
  );

  return {
    bundles,
    rawById,
    rawByName,
    rowMap,
    playerSegments,
    branding: mapBranding(res.body.widgets_config),
  };
};

const mapBundle = (
  b: GamruMissionBundle,
  rawById: Map<string, GamruMission>,
  rawByName: Map<string, GamruMission>,
  rowMap: Map<string, UserMission>
): BundleDTO => {
  const d = b.data ?? {};
  const pk = bundlePeriodKey(b.id);
  const refs = bundleMissionRefs(d.missions);

  // Resolve each reference to a mission (by id first — the stable relation —
  // then name), dedupe, and merge THIS bundle's own participation row so its
  // status/progress is independent of other bundles and the Missions tab.
  const seen = new Set<string>();
  const missions = refs
    .map((ref) => (ref.id && rawById.get(ref.id)) || rawByName.get(ref.name.toLowerCase()))
    .filter((m): m is GamruMission => Boolean(m))
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .map((m) => mapMission(m, rowMap.get(rowKey(pk, m.id))));

  const completed = missions.filter(
    (m) => m.status === "COMPLETED" || m.status === "CLAIMED"
  ).length;

  return {
    id: b.id,
    name: b.name,
    description: b.description ?? null,
    large_image: toStr(d.large_image) ?? toStr(d.small_image),
    small_image: toStr(d.small_image),
    bundle_type: toStr(d.bundle_type),
    periodicity: toStr(d.periodicity),
    priority: Number(b.priority ?? 0),
    eligibility_type: toStr(d.eligibility_type),
    segments: bundleSegments(b),
    tags: Array.isArray(b.tags) ? b.tags : [],
    missions,
    total: missions.length,
    completed,
  };
};

/** Bundles the player is ELIGIBLE for, each with grouped missions + progress. */
export const listBundles = async (
  userId: string,
  email: string
): Promise<BundleListResult> => {
  const { bundles, rawById, rawByName, rowMap, playerSegments, branding } =
    await loadCatalog(userId, email);
  return {
    branding,
    bundles: bundles
      .filter((b) => isEligible(b, playerSegments))
      .map((b) => mapBundle(b, rawById, rawByName, rowMap)),
  };
};

export const getBundle = async (
  userId: string,
  email: string,
  bundleId: string
): Promise<BundleDTO> => {
  const { bundles, rawById, rawByName, rowMap, playerSegments } =
    await loadCatalog(userId, email);
  const found = bundles.find((b) => b.id === bundleId);
  if (!found || !isEligible(found, playerSegments)) {
    throw new AppError("Mission bundle not found", 404);
  }
  return mapBundle(found, rawById, rawByName, rowMap);
};

/* ── Per-mission participation on a bundle's track ─────────────────────────── */
// A mission inside a bundle is joined/progressed/claimed on that bundle's own
// track (per-bundle period_key, no one-per-bucket exclusivity so every mission
// in the bundle can run at once). Gameplay advances whatever is IN_PROGRESS on
// any track, so these progress independently of the same mission elsewhere.

export const joinBundleMission = (
  userId: string,
  email: string,
  bundleId: string,
  missionId: string
): Promise<MissionDTO> =>
  // Delegates to the dedicated gamru mission-bundle join endpoint (via the
  // mission engine), which joins on the bundle's own track AND records the
  // bundle "Participated" count server-side — no separate participation push.
  joinMission(userId, email, missionId, { bundleId });

export const claimBundleMission = (
  userId: string,
  email: string,
  bundleId: string,
  missionId: string
): Promise<{ reward_label: string }> =>
  // Dedicated gamru mission-bundle claim endpoint grants the reward and bumps
  // the bundle "Participated" count server-side.
  claimMission(userId, email, missionId, bundleId);

export const cancelBundleMission = (
  userId: string,
  email: string,
  bundleId: string,
  missionId: string
): Promise<void> => cancelMission(userId, email, missionId, bundleId);
