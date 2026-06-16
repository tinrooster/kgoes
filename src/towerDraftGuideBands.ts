import type { TowerDraftPage, TowerGuideBandFt, TrackItTowerSiteContext } from "./types";

function structuralFtAgls(bands: TowerGuideBandFt[]): number[] {
  return bands
    .filter((b) => b.ftAgl > 0 && isStructuralGuideBand(b))
    .map((b) => b.ftAgl)
    .sort((a, b) => b - a);
}

/** True when persisted page bands no longer match trackIT / pack context (e.g. after SGH elevation update). */
export function guideBandsStaleVsContext(
  pageBands: TowerGuideBandFt[] | undefined,
  contextBands: TowerGuideBandFt[] | undefined,
): boolean {
  const page = pageBands ?? [];
  const ctx = contextBands ?? [];
  if (!ctx.length) return false;
  const pageHeights = structuralFtAgls(page);
  const ctxHeights = structuralFtAgls(ctx);
  if (!ctxHeights.length) return false;
  if (!pageHeights.length) return true;
  if (pageHeights.length !== ctxHeights.length) return true;
  return pageHeights.some((ft, i) => Math.abs(ft - ctxHeights[i]) > 1);
}

/** Prefer trackIT context when page bands are stale; else persisted structural bands. */
export function resolveTowerDraftGuideBands(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): TowerGuideBandFt[] {
  const pageBands = page.guideBandsFt ?? [];
  const ctxBands =
    (page.elevationViewport?.guideBandsFt as TowerGuideBandFt[] | undefined) ??
    (context?.elevationViewport?.guideBandsFt as TowerGuideBandFt[] | undefined) ??
    [];
  if (ctxBands.length > 0 && guideBandsStaleVsContext(pageBands, ctxBands)) {
    return ctxBands;
  }
  const pageHasStructural = pageBands.some(isStructuralGuideBand);
  if (pageHasStructural) return pageBands;
  if (ctxBands.length > 0) return ctxBands;
  return pageBands;
}

/** L2–L6 structural tiers and base — not spire / quartile markers. */
export function isStructuralGuideBand(band: TowerGuideBandFt): boolean {
  if (band.ftAgl === 0) return true;
  const label = (band.label ?? "").toUpperCase();
  if (/\bL[2-6]\b/.test(label)) return true;
  if (label.includes("BASE")) return true;
  if (label.includes("UPPER PLATFORM") || label.includes("WAIST")) return true;
  return false;
}

export function guideBandsForDisplay(
  bands: TowerGuideBandFt[],
  displayHeightFt: number,
): TowerGuideBandFt[] {
  return bands.filter((b) => b.ftAgl <= displayHeightFt + 0.5);
}

export type GuideBandLineStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  labelFontSize: number;
  labelFontWeight: number;
  labelFill: string;
};

export function guideBandLineStyle(structural: boolean): GuideBandLineStyle {
  if (structural) {
    return {
      stroke: "color-mix(in oklab, var(--ti-ink) 68%, transparent)",
      strokeWidth: 3,
      labelFontSize: 13,
      labelFontWeight: 700,
      labelFill: "var(--ti-ink)",
    };
  }
  return {
    stroke: "color-mix(in oklab, var(--ti-ink) 22%, transparent)",
    strokeWidth: 1,
    strokeDasharray: "4 5",
    labelFontSize: 11.5,
    labelFontWeight: 500,
    labelFill: "var(--ti-muted)",
  };
}

/** Ruler / tick labels — larger than guide-band secondary lines. */
export function elevationTickLabelStyle(): {
  fontSize: number;
  fontWeight: number;
  fill: string;
} {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    fill: "var(--ti-ink-2)",
  };
}

/** Profile split layout: level name sits above the guide line (not on the stroke). */
export const PROFILE_GUIDE_BAND_LABEL_OFFSET_Y = 9;

export function profileGuideBandLevelSuffixStyle(structural: boolean): {
  fontSize: number;
  fontWeight: number;
  fill: string;
} {
  if (structural) {
    return {
      fontSize: 13,
      fontWeight: 700,
      fill: "var(--ti-ink)",
    };
  }
  return {
    fontSize: 11,
    fontWeight: 500,
    fill: "var(--ti-muted)",
  };
}
