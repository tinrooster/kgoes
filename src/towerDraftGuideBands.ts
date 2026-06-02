import type { TowerDraftPage, TowerGuideBandFt, TrackItTowerSiteContext } from "./types";

/** Prefer page bands when they include structural L2–L6; else trackIT context. */
export function resolveTowerDraftGuideBands(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): TowerGuideBandFt[] {
  const pageBands = page.guideBandsFt ?? [];
  const ctxBands =
    (context?.elevationViewport?.guideBandsFt as TowerGuideBandFt[] | undefined) ?? [];
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
