import { ftAglToY, TOWER_DRAFT_PX_PER_FT } from "./towerDraftUtils";
import { computeFitViewport, type ContentBounds } from "./viewNavUtils";
import type { TrackItTowerSiteContext } from "./types";

export const TALL_TOWER_THRESHOLD_FT = 300;
/** 1 = fit full tower in view (~40% UI zoom on typical panels); >1 zooms into a band. */
export const DEFAULT_WORKING_ZOOM_RATIO = 1;

export function resolveTallTowerProfileMode(
  towerHeightFt: number,
  context?: TrackItTowerSiteContext | null,
): boolean {
  const hints = context?.elevationViewport;
  if (hints?.tallTowerMode != null) return hints.tallTowerMode;
  const threshold = hints?.tallTowerThresholdFt ?? TALL_TOWER_THRESHOLD_FT;
  return towerHeightFt > threshold;
}

export function resolveWorkingZoomRatio(
  context?: TrackItTowerSiteContext | null,
  contentScale = 1,
): number {
  const base = context?.elevationViewport?.workingZoomRatio ?? DEFAULT_WORKING_ZOOM_RATIO;
  if (contentScale <= 1) return base;
  return Math.max(1, base / contentScale);
}

export function resolveInitialFocusFtAgl(
  towerHeightFt: number,
  context?: TrackItTowerSiteContext | null,
): number {
  const fromCtx = context?.elevationViewport?.initialFocusFtAgl;
  if (fromCtx != null) return Math.max(0, Math.min(towerHeightFt, fromCtx));
  return Math.round(towerHeightFt * 0.6);
}

/** Pan/zoom so `focusFtAgl` is centered at `zoom` (content coordinates include contentOffsetY). */
export function panZoomCenteredOnFtAgl(opts: {
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  focusFtAgl: number;
  towerHeightFt: number;
  contentOffsetY: number;
  centerXContent: number;
  pxPerFt?: number;
}): { x: number; y: number } {
  const y =
    ftAglToY(opts.focusFtAgl, opts.towerHeightFt, opts.pxPerFt ?? TOWER_DRAFT_PX_PER_FT) + opts.contentOffsetY;
  return {
    x: opts.containerWidth / 2 - opts.centerXContent * opts.zoom,
    y: opts.containerHeight / 2 - y * opts.zoom,
  };
}

/** Initial tall-tower viewport: fit-all at ratio 1; ratio > 1 zooms into `focusFtAgl`. */
export function computeTallTowerInitialViewport(opts: {
  containerWidth: number;
  containerHeight: number;
  fullBounds: ContentBounds;
  towerHeightFt: number;
  focusFtAgl: number;
  contentOffsetY: number;
  centerXContent: number;
  workingZoomRatio: number;
  pxPerFt?: number;
  maxZoom?: number;
}): { zoom: number; pan: { x: number; y: number } } {
  const fit = computeFitViewport(opts.containerWidth, opts.containerHeight, opts.fullBounds, {
    maxZoom: opts.maxZoom ?? 4,
    minZoom: 0.05,
    padding: 24,
  });
  if (opts.workingZoomRatio <= 1) {
    return fit;
  }
  const zoom = Math.min(opts.maxZoom ?? 4, fit.zoom * opts.workingZoomRatio);
  const pan = panZoomCenteredOnFtAgl({
    containerWidth: opts.containerWidth,
    containerHeight: opts.containerHeight,
    zoom,
    focusFtAgl: opts.focusFtAgl,
    towerHeightFt: opts.towerHeightFt,
    contentOffsetY: opts.contentOffsetY,
    centerXContent: opts.centerXContent,
    pxPerFt: opts.pxPerFt,
  });
  return { zoom, pan };
}

/** Counter-scale glyphs when zoomed out on tall towers (content-space boost). */
export function computeGlyphViewportBoost(tallTowerMode: boolean, zoom: number): number {
  if (!tallTowerMode || zoom >= 1.15) return 1;
  return Math.min(2.75, Math.max(1, 1.2 / Math.max(0.2, zoom)));
}

/** Visible content Y range from current pan/zoom. */
export function visibleContentYRange(opts: {
  containerHeight: number;
  viewOffsetY: number;
  zoom: number;
}): { top: number; bottom: number } {
  const top = -opts.viewOffsetY / opts.zoom;
  const bottom = (opts.containerHeight - opts.viewOffsetY) / opts.zoom;
  return { top, bottom };
}
