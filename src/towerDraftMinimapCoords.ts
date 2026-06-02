import { ftAglToY, towerDraftGroundY } from "./towerDraftUtils";

/** Profile main view — layout sets explicit width/height; `none` when aspect is known. */
export const TOWER_REFERENCE_MAIN_PRESERVE_ASPECT = "xMidYMid meet";
/** Minimap thumbnail — fit full tower in band. */
export const TOWER_REFERENCE_MINIMAP_PRESERVE_ASPECT = "xMidYMid meet";

export type TowerBandInSvg = {
  towerTop: number;
  towerGround: number;
  towerSpan: number;
};

export function towerBandInSvg(
  towerHeightFt: number,
  pxPerFt: number,
  contentOffsetY: number,
): TowerBandInSvg {
  const towerTop = ftAglToY(towerHeightFt, towerHeightFt, pxPerFt) + contentOffsetY;
  const towerGround = towerDraftGroundY(towerHeightFt, pxPerFt) + contentOffsetY;
  return {
    towerTop,
    towerGround,
    towerSpan: Math.max(1, towerGround - towerTop),
  };
}

/** Map main-canvas content Y into minimap inner band (grade at bottom). */
export function contentYToMinimapY(
  contentY: number,
  band: TowerBandInSvg,
  miniPad: number,
  innerH: number,
): number {
  const t = (contentY - band.towerTop) / band.towerSpan;
  const clamped = Math.max(0, Math.min(1, t));
  return miniPad + clamped * innerH;
}

export function minimapYToContentY(
  miniLocalY: number,
  band: TowerBandInSvg,
  miniPad: number,
  innerH: number,
): number {
  const t = (miniLocalY - miniPad) / innerH;
  return band.towerTop + Math.max(0, Math.min(1, t)) * band.towerSpan;
}
