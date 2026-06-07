import type { TowerDraftPage, TrackItTowerSiteContext } from "./types";
import type { TowerElevationView } from "./towerDraftFaces";
import { inferAuthoritativeTowerHeightFtAgl } from "./towerDraftHeightSanitize";
import { pickElevationReferenceUrl } from "./towerElevationReference";

const DEFAULT_TOWER_HEIGHT_FT_AGL = 150;

/** True when stored tower-draft page still uses the generic 150 ft starter scale. */
export function isGenericTowerDraftHeight(towerHeightFtAgl: number | undefined): boolean {
  return towerHeightFtAgl == null || towerHeightFtAgl <= DEFAULT_TOWER_HEIGHT_FT_AGL;
}

/** Authoritative catalog height AGL (context + page), never site AMSL mistaken for AGL. */
export function resolveCatalogTowerHeightFtAgl(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  const referenceUrl = pickElevationReferenceUrl(
    page.elevationReferenceImage?.url,
    context?.elevationReferenceImage?.url,
  );
  const resolved = inferAuthoritativeTowerHeightFtAgl({
    contextTowerHeightFt: context?.towerHeightFt,
    pageTowerHeightFtAgl: page.towerHeightFtAgl,
    siteCode: context?.siteCode,
    siteElevationFtAmsl: context?.siteElevationFtAmsl,
    referenceUrl,
  });
  if (resolved > 0) return resolved;
  return DEFAULT_TOWER_HEIGHT_FT_AGL;
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
