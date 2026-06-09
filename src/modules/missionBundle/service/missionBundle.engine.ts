/**
 * Gamru-backed mission BUNDLE engine.
 *
 * Mission bundles are AUTHORED in gamru (Gamification → Mission Bundles) and
 * fetched live per request from the player's gamru profile payload
 * (`gamification.mission_bundles`). A bundle is a curated GROUPING of existing
 * missions — it carries no reward or progress of its own. The player joins,
 * progresses and claims each mission individually (reusing the mission flow),
 * so this engine is read-only: it resolves each bundle's mission references to
 * the same player-facing MissionDTOs the Missions page uses (participation
 * merged in) and reports an aggregate completion count for the bundle.
 */
import { AppError } from "../../../utils/AppError.ts";
import {
  gamruUserProfileData,
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
import UserMissionRepository from "../../mission/model/user-mission.repository.ts";

/**
 * Bundle participation lives on its OWN track, separate from the standalone
 * Missions tab ("GAMRU"). So completing a mission in the Missions tab does NOT
 * complete it inside a bundle, and vice-versa — they are independent rows.
 * (period_key is STRING(20), so this is a single shared key rather than one per
 * bundle id; a mission shared across bundles therefore shares one bundle row.)
 */
const BUNDLE_PERIOD = "BUNDLE";

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

/**
 * Fetch the live catalog from gamru for this player and build, in a single
 * round-trip, the player-facing mission DTOs (participation merged) indexed by
 * both lowercased name and id, plus the raw bundles and page branding. Never
 * throws on a gamru outage — returns an empty catalog so the page still renders.
 */
const loadCatalog = async (
  userId: string,
  email: string
): Promise<{
  bundles: GamruMissionBundle[];
  byName: Map<string, MissionDTO>;
  byId: Map<string, MissionDTO>;
  branding: MissionBranding;
}> => {
  const res = await gamruUserProfileData(email);
  if (!res.ok || !res.body) {
    return {
      bundles: [],
      byName: new Map(),
      byId: new Map(),
      branding: DEFAULT_BRANDING,
    };
  }

  const missions = res.body.gamification?.missions ?? [];
  const bundles = res.body.gamification?.mission_bundles ?? [];
  const rows = await UserMissionRepository.listByUser(userId);
  // Only the bundle track — keeps bundle progress independent of the tab.
  const part = new Map(
    rows
      .filter((r) => r.period_key === BUNDLE_PERIOD)
      .map((r) => [r.mission_id, r])
  );

  const byName = new Map<string, MissionDTO>();
  const byId = new Map<string, MissionDTO>();
  for (const m of missions) {
    const dto = mapMission(m, part.get(m.id));
    byId.set(dto.id, dto);
    byName.set(dto.name.trim().toLowerCase(), dto);
  }

  return {
    bundles,
    byName,
    byId,
    branding: mapBranding(res.body.widgets_config),
  };
};

const mapBundle = (
  b: GamruMissionBundle,
  byName: Map<string, MissionDTO>,
  byId: Map<string, MissionDTO>
): BundleDTO => {
  const d = b.data ?? {};
  const refs = bundleMissionRefs(d.missions);

  // Resolve each reference to a mission, matching by id first (the stable
  // relation) then by name, deduping and dropping any that no longer exist.
  const seen = new Set<string>();
  const missions = refs
    .map((ref) => (ref.id && byId.get(ref.id)) || byName.get(ref.name.toLowerCase()))
    .filter((m): m is MissionDTO => Boolean(m))
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));

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
    tags: Array.isArray(b.tags) ? b.tags : [],
    missions,
    total: missions.length,
    completed,
  };
};

/** All active bundles with each one's grouped missions + the player's progress. */
export const listBundles = async (
  userId: string,
  email: string
): Promise<BundleListResult> => {
  const { bundles, byName, byId, branding } = await loadCatalog(userId, email);
  return {
    branding,
    bundles: bundles.map((b) => mapBundle(b, byName, byId)),
  };
};

export const getBundle = async (
  userId: string,
  email: string,
  bundleId: string
): Promise<BundleDTO> => {
  const { bundles, byName, byId } = await loadCatalog(userId, email);
  const found = bundles.find((b) => b.id === bundleId);
  if (!found) throw new AppError("Mission bundle not found", 404);
  return mapBundle(found, byName, byId);
};

/* ── Per-mission participation on the bundle track ─────────────────────────── */
// A mission inside a bundle is joined/progressed/claimed on its own "BUNDLE"
// track (no one-per-bucket exclusivity, so every mission in the bundle can run
// at once). Gameplay advances whatever is IN_PROGRESS on any track, so these
// progress independently of the same mission on the Missions tab.

export const joinBundleMission = (
  userId: string,
  email: string,
  missionId: string
): Promise<MissionDTO> =>
  joinMission(userId, email, missionId, {
    periodKey: BUNDLE_PERIOD,
    exclusive: false,
  });

export const claimBundleMission = (
  userId: string,
  email: string,
  missionId: string
): Promise<{ reward_label: string }> =>
  claimMission(userId, email, missionId, BUNDLE_PERIOD);

export const cancelBundleMission = (
  userId: string,
  missionId: string
): Promise<void> => cancelMission(userId, missionId, BUNDLE_PERIOD);
