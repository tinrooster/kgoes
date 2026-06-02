import type { TowerDraftPage, TrackItTowerSiteContext } from "./types";
import type { TowerElevationView } from "./towerDraftFaces";
import { isTowerSectionElevationView } from "./towerDraftFaces";

/** Face-column / box views: operational top AGL (L6 + headroom; no spire). */
export const SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL = 800;

/** Published Sutro spire tips AGL — canonical profile height. */
export const SUTRO_CATALOG_TOP_FT_AGL = 977;

const DEFAULT_TOWER_HEIGHT_FT_AGL = 150;

function sanitizeTowerHeightFtAgl(
  raw: number | undefined,
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return 0;
  if (isSutroTowerDraftContext(page, context) && raw > SUTRO_CATALOG_TOP_FT_AGL + 200) {
    return SUTRO_CATALOG_TOP_FT_AGL;
  }
  return raw;
}

/** Authoritative catalog height AGL (context + page), never site AMSL mistaken for AGL. */
export function resolveCatalogTowerHeightFtAgl(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  for (const raw of [context?.towerHeightFt, page.towerHeightFtAgl]) {
    const ft = sanitizeTowerHeightFtAgl(raw, page, context);
    if (ft > 0) return ft;
  }
  if (isSutroTowerDraftContext(page, context)) return SUTRO_CATALOG_TOP_FT_AGL;
  return DEFAULT_TOWER_HEIGHT_FT_AGL;
}

export function isSutroTowerDraftContext(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): boolean {
  const code = context?.siteCode?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  if (code === "SUTRO" || code === "SUTROTOWER") return true;
  const url = `${page.elevationReferenceImage?.url ?? ""} ${context?.elevationReferenceImage?.url ?? ""}`.toLowerCase();
  return url.includes("sutro");
}

/**
 * Vertical extent for canvas layout (columns, ruler, face boxes).
 * Profile + reference art use full catalog height; face views cap Sutro at 800 ft.
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
  if (isSutroTowerDraftContext(page, context)) {
    return Math.min(catalog, SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL);
  }
  return catalog;
}

/** @deprecated Use resolveTowerDraftLayoutHeightFt */
export const SUTRO_TOWER_DISPLAY_HEIGHT_FT_AGL = SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL;

/** @deprecated Use resolveTowerDraftLayoutHeightFt */
export function resolveTowerDraftDisplayHeightFt(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): number {
  return resolveTowerDraftLayoutHeightFt(page, context, "all-faces");
}
