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
  type MissionDTO,
  type MissionBranding,
} from "../../mission/service/mission.engine.ts";
import UserMissionRepository from "../../mission/model/user-mission.repository.ts";

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

/** Normalize a bundle's `data.missions` (array, or legacy comma string) to names. */
const bundleMissionRefs = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  return Array.from(
    new Set(list.map((s) => String(s).trim()).filter(Boolean))
  );
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
  const part = new Map(rows.map((r) => [r.mission_id, r]));

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

  // Resolve each reference to a mission, matching by name first (how the bundle
  // is authored) then by id, and dropping any that no longer exist.
  const missions = refs
    .map((ref) => byName.get(ref.trim().toLowerCase()) ?? byId.get(ref))
    .filter((m): m is MissionDTO => Boolean(m));

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
