import type { TowerDraftPage, TowerElevationReferenceImage, TrackItTowerSiteContext } from "./types";
import { ftAglToY, TOWER_DRAFT_PX_PER_FT, towerDraftGroundY } from "./towerDraftUtils";

/** Default content scale for full-bleed reference profile (2.5× px/ft). */
export const REFERENCE_ELEVATION_CONTENT_SCALE = 2.5;

export function resolveTowerElevationReference(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
): TowerElevationReferenceImage | null {
  const ref = page.elevationReferenceImage ?? context?.elevationReferenceImage;
  if (!ref?.url?.trim()) return null;
  return ref;
}

export function resolveProfilePxPerFt(
  ref: TowerElevationReferenceImage | null,
  tallTowerMode: boolean,
): number {
  if (!ref?.fullBleed) return TOWER_DRAFT_PX_PER_FT;
  const scale = ref.contentScale ?? (tallTowerMode ? REFERENCE_ELEVATION_CONTENT_SCALE : 1);
  return TOWER_DRAFT_PX_PER_FT * Math.max(1, scale);
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
} {
  const topY = ftAglToY(opts.towerHeightFt, opts.towerHeightFt, opts.pxPerFt);
  const groundY = towerDraftGroundY(opts.towerHeightFt, opts.pxPerFt);
  const height = groundY - topY;
  const margin = 16;
  const fullBleed = opts.ref.fullBleed === true;
  const width = fullBleed
    ? Math.max(160, opts.contentWidth - opts.rulerX - margin * 2)
    : Math.min(220, Math.max(96, height * 0.2));
  const align = opts.ref.align ?? "center";
  const x =
    align === "left"
      ? opts.rulerX + margin
      : fullBleed
        ? opts.rulerX + margin
        : opts.centerX - width / 2;
  return {
    x,
    y: topY,
    width,
    height,
    opacity: opts.ref.opacity ?? 0.94,
    blendMode: opts.ref.blendMode ?? "normal",
  };
}
