import type { TowerDraftPage, TrackItTowerSiteContext } from "./types";
import type { TowerElevationView } from "./towerDraftFaces";

const DEFAULT_TOWER_HEIGHT_FT_AGL = 150;

/** True when stored tower-draft page still uses the generic 150 ft starter scale. */
export function isGenericTowerDraftHeight(towerHeightFtAgl: number | undefined): boolean {
  return towerHeightFtAgl == null || towerHeightFtAgl <= DEFAULT_TOWER_HEIGHT_FT_AGL;
}

function sanitizeTowerHeightFtAgl(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

/** Authoritative catalog height AGL (context + page), never site AMSL mistaken for AGL. */
export function resolveCatalogTowerHeightFtAgl(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  for (const raw of [context?.towerHeightFt, page.towerHeightFtAgl]) {
    const ft = sanitizeTowerHeightFtAgl(raw);
    if (ft > 0) {
      if (isGenericTowerDraftHeight(ft) && context?.towerHeightFt && context.towerHeightFt > ft) {
        continue;
      }
      return ft;
    }
  }
  return context?.towerHeightFt ?? DEFAULT_TOWER_HEIGHT_FT_AGL;
}

function resolveFaceLayoutCapFt(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number | undefined {
  const cap = context?.faceLayoutHeightFtAgl;
  if (cap != null && cap > 0) return cap;
  return undefined;
}

/**
 * Vertical extent for canvas layout (columns, ruler, face boxes).
 * Profile uses full catalog height; face views may cap via pack faceLayoutHeightFtAgl.
 */
export function resolveTowerDraftLayoutHeightFt(
  page: TowerDraftPage,
  context: TrackItTowerSiteContext | null | undefined,
  elevationView: TowerElevationView,
): number {
  const catalog = resolveCatalogTowerHeightFtAgl(page, context);
  if (elevationView === "profile" || elevationView === "site") {
    return catalog;
  }
  const cap = resolveFaceLayoutCapFt(page, context);
  if (cap != null) return Math.min(catalog, cap);
  return catalog;
}

/** @deprecated Use resolveTowerDraftLayoutHeightFt */
export function resolveTowerDraftDisplayHeightFt(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  return resolveTowerDraftLayoutHeightFt(page, context, "all-faces");
}
