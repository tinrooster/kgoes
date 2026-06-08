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

/** SGH / SGM elevation blueprint PNG natural width ÷ height (291×1024). */
export const SUTRO_ELEVATION_BLUEPRINT_ASPECT = 291 / 1024;

/** Canonical Sutro permit blueprint (clean SGM export, no UI chrome). */
export const SUTRO_ELEVATION_SGM_BLUEPRINT_PATH =
  "/assets/mountaintops/sutro/sutro-elevation-sgm.png";

/** Bust browser cache after replacing bad screenshot crops with SGM art. */
export const SUTRO_ELEVATION_SGM_BLUEPRINT_URL = `${SUTRO_ELEVATION_SGM_BLUEPRINT_PATH}?v=6`;

/** @deprecated Use {@link SUTRO_ELEVATION_SGM_BLUEPRINT_PATH}. */
export const SUTRO_ELEVATION_SGH_BLUEPRINT_PATH = SUTRO_ELEVATION_SGM_BLUEPRINT_PATH;

export function isSutroMountaintopAsset(url: string): boolean {
  const path = mountaintopAssetPathname(url) ?? url;
  return path.toLowerCase().includes("/assets/mountaintops/sutro/");
}

/** Map legacy Sutro blueprint filenames (screenshot crops, old aliases) to canonical SGM. */
export function rewriteSutroBlueprintUrl(url: string): string {
  if (!url?.trim() || !isSutroMountaintopAsset(url)) return url;
  const path = (mountaintopAssetPathname(url) ?? url).toLowerCase();
  const isBlueprint =
    classifyElevationReferenceAsset(url) === "blueprint" ||
    path.includes("elevation-blueprint") ||
    path.includes("elevation-sgm") ||
    path.includes("sgh-s1");
  if (!isBlueprint) return url;
  if (path === SUTRO_ELEVATION_SGM_BLUEPRINT_PATH.toLowerCase() && url.includes("?v=")) {
    return url;
  }
  const canonical = SUTRO_ELEVATION_SGM_BLUEPRINT_URL;
  if (isAbsoluteHttpUrl(url)) {
    try {
      return `${new URL(url.trim()).origin}${canonical}`;
    } catch {
      return canonical;
    }
  }
  return canonical;
}

export function isSutroTowerContextOrPage(
  context?: TrackItTowerSiteContext | null,
  pageRef?: TowerElevationReferenceImage | null,
): boolean {
  if (isSutroTowerSite(context)) return true;
  for (const candidate of [pageRef?.url, pageRef?.detailUrl]) {
    if (candidate && isSutroMountaintopAsset(candidate)) return true;
  }
  return false;
}

export type TowerElevationReferenceVariant = "primary" | "blueprint";

export function isSutroTowerSite(context?: TrackItTowerSiteContext | null): boolean {
  const code = context?.siteCode?.trim().toUpperCase();
  return code === "SUTRO" || code === "SUTROTOWER";
}

type ReferenceAssetKind = "silhouette" | "blueprint" | "other";

/** Classify mountaintop elevation art by filename (not url vs detailUrl field). */
export function classifyElevationReferenceAsset(url: string): ReferenceAssetKind {
  const path = (mountaintopAssetPathname(url) ?? url).toLowerCase();
  if (
    path.includes("blueprint") ||
    path.includes("elevation-bw") ||
    path.includes("sutro_bw") ||
    path.includes("sgh-s1") ||
    path.includes("elevation-sgm")
  ) {
    return "blueprint";
  }
  if (path.includes("sutro-elevation-ref") || path.includes("sf-sutro")) {
    return "silhouette";
  }
  return "other";
}

/**
 * Ensure silhouette lives in `url` and blueprint in `detailUrl` even when a stale
 * page JSON swapped them (e.g. after saving while blueprint view was active).
 */
export function canonicalizeElevationReference(
  ref: TowerElevationReferenceImage,
): TowerElevationReferenceImage {
  const rawUrls = [ref.url, ref.detailUrl].filter((u): u is string => !!u?.trim());
  let silhouette: string | undefined;
  let blueprint: string | undefined;
  for (const candidate of rawUrls) {
    const trimmed = candidate.trim();
    const kind = classifyElevationReferenceAsset(trimmed);
    if (kind === "silhouette" && !silhouette) silhouette = trimmed;
    if (kind === "blueprint" && !blueprint) blueprint = trimmed;
  }
  if (!silhouette) {
    const fallback = ref.url?.trim();
    if (fallback && classifyElevationReferenceAsset(fallback) !== "blueprint") {
      silhouette = fallback;
    }
  }
  if (!blueprint) {
    const fallback = ref.detailUrl?.trim();
    if (fallback && classifyElevationReferenceAsset(fallback) === "blueprint") {
      blueprint = fallback;
    }
  }
  if (
    silhouette &&
    blueprint &&
    classifyElevationReferenceAsset(silhouette) === "blueprint" &&
    classifyElevationReferenceAsset(blueprint) === "silhouette"
  ) {
    [silhouette, blueprint] = [blueprint, silhouette];
  }
  return {
    ...ref,
    url: silhouette ?? ref.url,
    detailUrl: blueprint,
  };
}

function mountaintopPathKey(url: string): string | null {
  const path = mountaintopAssetPathname(url);
  return path ? path.toLowerCase() : null;
}

/** Pick best host for a mountaintop asset path (prefer trackIT absolute over stale ES page URL). */
function pickUrlForMountaintopPath(
  pathKey: string,
  pageRef?: TowerElevationReferenceImage | null,
  ctxRef?: TowerElevationReferenceImage | null,
): string | undefined {
  const pageMatch = [pageRef?.url, pageRef?.detailUrl].find(
    (u) => u && mountaintopPathKey(u) === pathKey,
  );
  const ctxMatch = [ctxRef?.url, ctxRef?.detailUrl].find(
    (u) => u && mountaintopPathKey(u) === pathKey,
  );
  return pickElevationReferenceUrl(pageMatch, ctxMatch);
}

function blueprintAssetPriority(url: string): number {
  const path = (mountaintopAssetPathname(url) ?? url).toLowerCase();
  if (path.includes("elevation-sgm")) return 110;
  if (path.includes("sgh-s1")) return 100;
  if (path.includes("blueprint")) return 80;
  if (path.includes("elevation-bw") || path.includes("sutro_bw")) return 5;
  return 40;
}

export function collectReferenceUrlsByKind(
  pageRef?: TowerElevationReferenceImage | null,
  ctxRef?: TowerElevationReferenceImage | null,
): { silhouette?: string; blueprint?: string } {
  const pool = [pageRef?.url, pageRef?.detailUrl, ctxRef?.url, ctxRef?.detailUrl];
  const seen = new Set<string>();
  let silhouette: string | undefined;
  const blueprintCandidates: string[] = [];

  for (const raw of pool) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const pathKey = mountaintopPathKey(trimmed);
    if (!pathKey || seen.has(pathKey)) continue;
    seen.add(pathKey);
    const kind = classifyElevationReferenceAsset(trimmed);
    const resolved = pickUrlForMountaintopPath(pathKey, pageRef, ctxRef) ?? trimmed;
    if (kind === "silhouette" && !silhouette) silhouette = resolved;
    if (kind === "blueprint") blueprintCandidates.push(rewriteSutroBlueprintUrl(resolved));
  }

  const blueprint =
    blueprintCandidates.length > 0
      ? rewriteSutroBlueprintUrl(
          [...blueprintCandidates].sort((a, b) => blueprintAssetPriority(b) - blueprintAssetPriority(a))[0]!,
        )
      : undefined;

  return { silhouette, blueprint };
}

/** Resolve profile underlay from page + trackIT context (ignores stale single-field page urls). */
export function hasBlueprintElevationAsset(
  pageRef?: TowerElevationReferenceImage | null,
  context?: TrackItTowerSiteContext | null,
): boolean {
  const { blueprint } = collectReferenceUrlsByKind(pageRef, context?.elevationReferenceImage);
  return !!blueprint || isSutroTowerContextOrPage(context, pageRef);
}

export function resolveProfileElevationReference(
  page: TowerDraftPage,
  variant: TowerElevationReferenceVariant,
  context?: TrackItTowerSiteContext | null,
): TowerElevationReferenceImage | null {
  let { silhouette, blueprint } = collectReferenceUrlsByKind(
    page.elevationReferenceImage,
    context?.elevationReferenceImage,
  );
  if (!blueprint && isSutroTowerContextOrPage(context, page.elevationReferenceImage)) {
    blueprint = defaultSutroBlueprintUrl(context);
  }
  const merged = mergeTowerElevationReference(page.elevationReferenceImage, context?.elevationReferenceImage);
  if (!silhouette && !blueprint && !merged) return null;
  const base: TowerElevationReferenceImage = {
    ...(merged ?? { url: silhouette ?? blueprint ?? "" }),
    url: silhouette ?? merged?.url ?? blueprint ?? "",
    detailUrl: blueprint ?? merged?.detailUrl,
    detailImageAspectRatio:
      merged?.detailImageAspectRatio ?? SUTRO_ELEVATION_BLUEPRINT_ASPECT,
  };
  if (!base.url?.trim()) return null;
  return resolveActiveElevationReference(base, variant, context);
}

function absoluteUrlForMountaintopPath(
  pathKey: string,
  context?: TrackItTowerSiteContext | null,
): string | undefined {
  const ctxRef = context?.elevationReferenceImage;
  if (!ctxRef) return undefined;
  return [ctxRef.url, ctxRef.detailUrl].find(
    (u) => u && mountaintopPathKey(u) === pathKey && isAbsoluteHttpUrl(u),
  );
}

/** Default SGH blueprint URL (trackIT opener origin when embedded, else current host). */
export function defaultSutroBlueprintUrl(context?: TrackItTowerSiteContext | null): string {
  const pathKey = SUTRO_ELEVATION_SGM_BLUEPRINT_PATH.toLowerCase();
  const fromCtx = absoluteUrlForMountaintopPath(pathKey, context);
  if (fromCtx) return rewriteSutroBlueprintUrl(fromCtx);
  try {
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      const openerOrigin = new URL(window.opener.location.href).origin;
      return rewriteSutroBlueprintUrl(`${openerOrigin}${SUTRO_ELEVATION_SGM_BLUEPRINT_URL}`);
    }
  } catch {
    /* cross-origin opener */
  }
  if (typeof window !== "undefined") {
    return rewriteSutroBlueprintUrl(`${window.location.origin}${SUTRO_ELEVATION_SGM_BLUEPRINT_URL}`);
  }
  return SUTRO_ELEVATION_SGM_BLUEPRINT_URL;
}

function resolveBlueprintDisplayUrl(
  ref: TowerElevationReferenceImage,
  context?: TrackItTowerSiteContext | null,
): string | undefined {
  const fromDetail = ref.detailUrl?.trim();
  if (fromDetail && classifyElevationReferenceAsset(fromDetail) === "blueprint") {
    const pathKey = mountaintopPathKey(fromDetail);
    const resolved =
      (pathKey ? absoluteUrlForMountaintopPath(pathKey, context) : undefined) ?? fromDetail;
    return rewriteSutroBlueprintUrl(resolved);
  }
  if (isSutroTowerContextOrPage(context, ref)) {
    return defaultSutroBlueprintUrl(context);
  }
  return undefined;
}

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
  if (
    url.includes("sutro-elevation-sgm") ||
    url.includes("sutro-elevation-sgh") ||
    url.includes("sutro-elevation-blueprint")
  ) {
    return SUTRO_ELEVATION_BLUEPRINT_ASPECT;
  }
  if (url.includes("sutro-elevation-ref")) {
    return SUTRO_ELEVATION_IMAGE_ASPECT;
  }
  if (url.includes("sutro-elevation")) {
    return SUTRO_ELEVATION_IMAGE_ASPECT;
  }
  return undefined;
}

/** Active underlay URL + aspect for profile (primary silhouette vs blueprint detail). */
export function resolveActiveElevationReference(
  ref: TowerElevationReferenceImage,
  variant: TowerElevationReferenceVariant = "primary",
  context?: TrackItTowerSiteContext | null,
): TowerElevationReferenceImage {
  const canonical = canonicalizeElevationReference(ref);
  if (variant === "blueprint") {
    const blueprintUrl = resolveBlueprintDisplayUrl(canonical, context);
    if (blueprintUrl) {
      const aspect =
        canonical.detailImageAspectRatio ??
        inferReferenceImageAspectRatio({ ...canonical, url: blueprintUrl });
      return enrichTowerElevationReference({
        ...canonical,
        url: blueprintUrl,
        detailUrl: canonical.url,
        imageAspectRatio: aspect,
        label: canonical.label?.includes("blueprint")
          ? canonical.label
          : `${canonical.label ?? "Tower elevation"} · SGH S1.0 blueprint`,
        opacity: canonical.detailOpacity ?? canonical.opacity,
      });
    }
  }
  return enrichTowerElevationReference(canonical);
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
  const { silhouette, blueprint } = collectReferenceUrlsByKind(pageRef, ctxRef);
  if (!silhouette) return null;
  const merged: TowerElevationReferenceImage = {
    ...ctxRef,
    ...pageRef,
    url: silhouette,
    detailUrl: blueprint,
    label: pageRef?.label ?? ctxRef?.label,
    imageAspectRatio: pageRef?.imageAspectRatio ?? ctxRef?.imageAspectRatio,
    detailImageAspectRatio: pageRef?.detailImageAspectRatio ?? ctxRef?.detailImageAspectRatio,
    fullBleed: pageRef?.fullBleed ?? ctxRef?.fullBleed,
    contentScale: pageRef?.contentScale ?? ctxRef?.contentScale,
    opacity: pageRef?.opacity ?? ctxRef?.opacity,
    detailOpacity: pageRef?.detailOpacity ?? ctxRef?.detailOpacity,
    blendMode: pageRef?.blendMode ?? ctxRef?.blendMode,
    align: pageRef?.align ?? ctxRef?.align,
  };
  return enrichTowerElevationReference(canonicalizeElevationReference(merged));
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
