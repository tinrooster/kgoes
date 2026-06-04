import type { TowerDraftPage, TowerElevationReferenceImage, TrackItTowerSiteContext } from "./types";
import {
  ftAglToY,
  TOWER_DRAFT_PX_PER_FT,
  TOWER_DRAFT_RULER_W,
  towerDraftGroundY,
} from "./towerDraftUtils";

/** Default content scale for full-bleed reference profile (2.5× px/ft). */
export const REFERENCE_ELEVATION_CONTENT_SCALE = 2.5;

/** Sutro elevation PNG natural width ÷ height (245×1024). */
export const SUTRO_ELEVATION_IMAGE_ASPECT = 245 / 1024;

/** Space right of tower axis for designation / azimuth labels on profile. */
export const PROFILE_LABEL_RAIL_W = 420;

const REFERENCE_MARGIN = 16;

/** Default profile opacity for full-bleed reference underlays. */
export const REFERENCE_ELEVATION_DEFAULT_OPACITY = 0.5;

/** Infer aspect from known mountaintop reference asset paths. */
export function inferReferenceImageAspectRatio(ref: TowerElevationReferenceImage): number | undefined {
  if (ref.imageAspectRatio != null && ref.imageAspectRatio > 0) {
    return ref.imageAspectRatio;
  }
  const url = `${ref.url ?? ""} ${ref.detailUrl ?? ""}`.toLowerCase();
  if (url.includes("sutro-elevation")) {
    return SUTRO_ELEVATION_IMAGE_ASPECT;
  }
  return undefined;
}

/** Fill missing full-bleed / aspect / opacity fields (legacy persisted pages). */
export function enrichTowerElevationReference(
  ref: TowerElevationReferenceImage,
): TowerElevationReferenceImage {
  const aspect = inferReferenceImageAspectRatio(ref);
  const fullBleed = ref.fullBleed === true || aspect != null;
  return {
    ...ref,
    imageAspectRatio: aspect,
    fullBleed,
    opacity: ref.opacity ?? (fullBleed ? REFERENCE_ELEVATION_DEFAULT_OPACITY : undefined),
    blendMode: ref.blendMode ?? (fullBleed ? "normal" : undefined),
    contentScale:
      ref.contentScale ?? (fullBleed ? REFERENCE_ELEVATION_CONTENT_SCALE : ref.contentScale),
  };
}

export function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Pathname for relative or absolute mountaintop asset URLs (for deduping hosts). */
export function mountaintopAssetPathname(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed.split("?")[0] ?? trimmed;
  try {
    return new URL(trimmed).pathname;
  } catch {
    return null;
  }
}

/**
 * Prefer absolute trackIT asset URLs over relative `/assets/…` paths stored on the page.
 * KGO-ES is hosted separately; relative paths resolve on the ES origin and 404 unless
 * the asset is also published under kgoes/public. When page + context refer to the same
 * mountaintop file, prefer context (trackIT origin) over a stale absolute page URL on ES.
 */
export function pickElevationReferenceUrl(
  pageUrl?: string | null,
  ctxUrl?: string | null,
): string | undefined {
  const page = pageUrl?.trim() || undefined;
  const ctx = ctxUrl?.trim() || undefined;
  const pagePath = page ? mountaintopAssetPathname(page) : null;
  const ctxPath = ctx ? mountaintopAssetPathname(ctx) : null;
  const sameMountaintopAsset =
    !!pagePath &&
    !!ctxPath &&
    pagePath === ctxPath &&
    pagePath.includes("/assets/mountaintops/");

  if (sameMountaintopAsset) {
    if (ctx && isAbsoluteHttpUrl(ctx)) return ctx;
    if (page && isAbsoluteHttpUrl(page)) return page;
    return ctx ?? page;
  }

  if (page && isAbsoluteHttpUrl(page)) return page;
  if (ctx && isAbsoluteHttpUrl(ctx)) return ctx;
  if (page?.startsWith("/assets/") && ctx && isAbsoluteHttpUrl(ctx)) return ctx;
  return page ?? ctx;
}

/** Merge page + trackIT context refs; context fills gaps on stale page payloads. */
export function mergeTowerElevationReference(
  pageRef?: TowerElevationReferenceImage | null,
  ctxRef?: TowerElevationReferenceImage | null,
): TowerElevationReferenceImage | null {
  const url = pickElevationReferenceUrl(pageRef?.url, ctxRef?.url);
  if (!url) return null;
  const merged: TowerElevationReferenceImage = {
    ...ctxRef,
    ...pageRef,
    url,
    detailUrl: pickElevationReferenceUrl(pageRef?.detailUrl, ctxRef?.detailUrl),
    label: pageRef?.label ?? ctxRef?.label,
    imageAspectRatio: pageRef?.imageAspectRatio ?? ctxRef?.imageAspectRatio,
    fullBleed: pageRef?.fullBleed ?? ctxRef?.fullBleed,
    contentScale: pageRef?.contentScale ?? ctxRef?.contentScale,
    opacity: pageRef?.opacity ?? ctxRef?.opacity,
    blendMode: pageRef?.blendMode ?? ctxRef?.blendMode,
    align: pageRef?.align ?? ctxRef?.align,
  };
  return enrichTowerElevationReference(merged);
}

export function resolveTowerElevationReference(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): TowerElevationReferenceImage | null {
  return mergeTowerElevationReference(
    page.elevationReferenceImage,
    context?.elevationReferenceImage,
  );
}

/** Ft AGL ↔ canvas Y always uses canonical px/ft; viewport zoom handles readability. */
export function resolveProfilePxPerFt(
  _ref?: TowerElevationReferenceImage | null,
  _tallTowerMode?: boolean,
): number {
  return TOWER_DRAFT_PX_PER_FT;
}

export function referenceImageHeightPx(towerHeightFt: number, pxPerFt: number): number {
  const topY = ftAglToY(towerHeightFt, towerHeightFt, pxPerFt);
  const groundY = towerDraftGroundY(towerHeightFt, pxPerFt);
  return groundY - topY;
}

export function referenceImageWidthPx(
  ref: TowerElevationReferenceImage,
  imageHeightPx: number,
  contentWidthFallback: number,
  rulerX: number,
): number {
  const enriched = enrichTowerElevationReference(ref);
  const fullBleed = enriched.fullBleed === true;
  const aspect = enriched.imageAspectRatio;
  if (fullBleed && aspect != null && aspect > 0) {
    return imageHeightPx * aspect;
  }
  if (fullBleed) {
    return Math.max(160, contentWidthFallback - rulerX - REFERENCE_MARGIN * 2);
  }
  return Math.min(220, Math.max(96, imageHeightPx * 0.2));
}

/** Profile canvas width when a reference underlay is active. */
export function profileContentWidthForReference(opts: {
  ref: TowerElevationReferenceImage;
  towerHeightFt: number;
  pxPerFt: number;
  rulerX?: number;
  baseContentWidth: number;
}): number {
  const ref = enrichTowerElevationReference(opts.ref);
  const rulerX = opts.rulerX ?? TOWER_DRAFT_RULER_W;
  const imageH = referenceImageHeightPx(opts.towerHeightFt, opts.pxPerFt);
  const imageW = referenceImageWidthPx(ref, imageH, opts.baseContentWidth, rulerX);
  const align = ref.align ?? "center";
  if (align === "left") {
    return Math.max(opts.baseContentWidth, rulerX + REFERENCE_MARGIN + imageW + REFERENCE_MARGIN + PROFILE_LABEL_RAIL_W);
  }
  const centerX = rulerX + REFERENCE_MARGIN + imageW / 2;
  return Math.max(
    opts.baseContentWidth,
    centerX + imageW / 2 + REFERENCE_MARGIN + PROFILE_LABEL_RAIL_W,
  );
}

/** Structural axis X for placements when reference art defines the tower silhouette. */
export function profileCenterXForReference(opts: {
  ref: TowerElevationReferenceImage;
  towerHeightFt: number;
  pxPerFt: number;
  rulerX?: number;
  baseContentWidth: number;
}): number {
  const ref = enrichTowerElevationReference(opts.ref);
  const rulerX = opts.rulerX ?? TOWER_DRAFT_RULER_W;
  const imageH = referenceImageHeightPx(opts.towerHeightFt, opts.pxPerFt);
  const imageW = referenceImageWidthPx(ref, imageH, opts.baseContentWidth, rulerX);
  const align = ref.align ?? "center";
  if (align === "left") {
    return rulerX + REFERENCE_MARGIN + imageW / 2;
  }
  return rulerX + REFERENCE_MARGIN + imageW / 2;
}

/** Layout for profile-view SVG image (full height base → peak). */
export function towerElevationReferenceLayout(opts: {
  towerHeightFt: number;
  centerX: number;
  rulerX: number;
  contentWidth: number;
  pxPerFt: number;
  ref: TowerElevationReferenceImage;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  blendMode: string;
  preserveAspectRatio: string;
} {
  const ref = enrichTowerElevationReference(opts.ref);
  const topY = ftAglToY(opts.towerHeightFt, opts.towerHeightFt, opts.pxPerFt);
  const groundY = towerDraftGroundY(opts.towerHeightFt, opts.pxPerFt);
  const height = groundY - topY;
  const width = referenceImageWidthPx(ref, height, opts.contentWidth, opts.rulerX);
  const align = ref.align ?? "center";
  const x =
    align === "left"
      ? opts.rulerX + REFERENCE_MARGIN
      : opts.centerX - width / 2;
  const defaultOpacity = ref.fullBleed ? REFERENCE_ELEVATION_DEFAULT_OPACITY : 0.94;
  const hasExplicitAspect = ref.imageAspectRatio != null && ref.imageAspectRatio > 0;
  return {
    x,
    y: topY,
    width,
    height,
    opacity: ref.opacity ?? defaultOpacity,
    blendMode: ref.blendMode ?? "normal",
    preserveAspectRatio: hasExplicitAspect ? "none" : "xMidYMid meet",
  };
}
