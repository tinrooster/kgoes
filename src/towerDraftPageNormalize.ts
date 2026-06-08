import type { SchematicPage, TowerDraftPage, TrackItTowerSiteContext } from "./types";
import { resolveCatalogTowerHeightFtAgl } from "./towerDraftDisplayHeight";
import { guideBandsStaleVsContext } from "./towerDraftGuideBands";
import { mergeTowerElevationReference } from "./towerElevationReference";

/** Upgrade stale tower-draft pages (150 ft starter, relative Sutro assets) on load / context. */
export function normalizeTowerDraftPage(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): TowerDraftPage {
  let next = page;
  const catalogH = resolveCatalogTowerHeightFtAgl(page, context);
  if (catalogH > 0 && Math.abs(page.towerHeightFtAgl - catalogH) > 1) {
    next = { ...next, towerHeightFtAgl: catalogH };
  }
  if (context?.towerType && next.towerType !== context.towerType) {
    next = { ...next, towerType: context.towerType };
  }

  const ctxBands = context?.elevationViewport?.guideBandsFt;
  if (ctxBands?.length && guideBandsStaleVsContext(next.guideBandsFt, ctxBands)) {
    next = { ...next, guideBandsFt: ctxBands };
  }

  const mergedRef = mergeTowerElevationReference(next.elevationReferenceImage, context?.elevationReferenceImage);
  if (mergedRef) {
    const prevJson = JSON.stringify(next.elevationReferenceImage ?? null);
    const nextJson = JSON.stringify(mergedRef);
    if (prevJson !== nextJson) {
      next = {
        ...next,
        elevationReferenceImage: mergedRef,
        polylines: next.elevationReferenceImage?.url ? next.polylines : [],
      };
    }
  }

  return next;
}

export function normalizeTowerDraftPages(
  pages: SchematicPage[],
  context?: TrackItTowerSiteContext | null,
): SchematicPage[] {
  let changed = false;
  const next = pages.map((p) => {
    if (p.type !== "tower-draft") return p;
    const normalized = normalizeTowerDraftPage(p, context);
    if (normalized !== p) changed = true;
    return normalized;
  });
  return changed ? next : pages;
}
