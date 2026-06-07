/** Layout helpers for tower elevation SVG (design handoff: tower.jsx). */

import { PROFILE_LABEL_RAIL_W } from "./towerElevationReference";

export const TOWER_DRAFT_TITLE_H = 40;
/** Vertical gap between stacked profile callout labels. */
export const PROFILE_LABEL_STACK_GAP = 32;
/** Minimum vertical separation between mount point and label anchor. */
export const PROFILE_LABEL_MIN_V_SEP = 20;
/** offsetX within this range is treated as “on mast”. */
export const PROFILE_LABEL_NEAR_MAST_PX = 10;
/** Default horizontal offset from tower axis to label column. */
export const PROFILE_LABEL_AXIS_OFFSET = 104;
/** Minimum horizontal leader length from device mount to label. */
export const PROFILE_LABEL_MIN_LEADER = 56;
/** Do not place labels farther than this from tower axis. */
export const PROFILE_LABEL_MAX_AXIS_OFFSET = 168;
/** Headroom for face column compass chips above tower top (all face views). */
export const TOWER_DRAFT_FACES_HEADER_H = 56;
/** Gap between compass label chip and top of face column box. */
export const TOWER_DRAFT_FACE_COMPASS_GAP_PX = 22;
/** Height of N/E/S/W compass chip above columns. */
export const TOWER_DRAFT_FACE_COMPASS_CHIP_H = 26;

export function stackLabelY(
  items: { id: string; y: number }[],
  gap: number,
): Record<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  const out: Record<string, number> = {};
  sorted.forEach((it) => {
    const ly = Math.max(it.y, prev + gap);
    out[it.id] = ly;
    prev = ly;
  });
  return out;
}

/** Profile tower half-width (px) at a given canvas Y (taper: wide at base, narrow at top). */
export function towerHalfWidthAtY(
  y: number,
  topY: number,
  groundY: number,
  baseHalfW: number,
  topHalfW: number,
): number {
  if (groundY <= topY) return baseHalfW;
  const t = (groundY - y) / (groundY - topY);
  const clamped = Math.max(0, Math.min(1, t));
  return baseHalfW + (topHalfW - baseHalfW) * clamped;
}

export const TOWER_FACE_TONE: Record<string, string> = {
  N: "info",
  S: "warning",
  E: "accent",
  W: "success",
};

export interface ProfileCalloutInput {
  id: string;
  mountX: number;
  mountY: number;
  offsetX: number;
}

export interface ProfileCalloutLayout {
  labelX: number;
  labelY: number;
}

/** Left edge of the far label rail (upper bound for callout column). */
export function profileLabelRailX(contentWidth: number): number {
  return contentWidth - PROFILE_LABEL_RAIL_W + 36;
}

/** Horizontal anchor for a profile callout — just right of the tower, not the far canvas edge. */
export function profileLabelXForMount(
  mountX: number,
  centerX: number,
  contentWidth?: number,
): number {
  const fromAxis = centerX + PROFILE_LABEL_AXIS_OFFSET;
  const fromDevice = mountX + PROFILE_LABEL_MIN_LEADER;
  const cap =
    contentWidth != null
      ? Math.min(centerX + PROFILE_LABEL_MAX_AXIS_OFFSET, profileLabelRailX(contentWidth) - 24)
      : centerX + PROFILE_LABEL_MAX_AXIS_OFFSET;
  return Math.min(Math.max(fromAxis, fromDevice), cap);
}

/**
 * Profile callout labels: modest offset from tower axis + vertical stacking / mast clearance.
 */
export function resolveProfilePlacementCallouts(
  items: ProfileCalloutInput[],
  centerX: number,
  contentWidth?: number,
  stackGap = PROFILE_LABEL_STACK_GAP,
): Record<string, ProfileCalloutLayout> {
  const minVert = PROFILE_LABEL_MIN_V_SEP;
  const glyphClearance = 24;

  const preferred = items.map((it) => {
    const onMast = Math.abs(it.offsetX) <= PROFILE_LABEL_NEAR_MAST_PX;
    const labelX = profileLabelXForMount(it.mountX, centerX, contentWidth);
    const shortLeader = labelX - it.mountX < 80;
    const bias = onMast || shortLeader ? -Math.max(minVert, glyphClearance) : -minVert;
    return { ...it, preferredY: it.mountY + bias, labelX };
  });

  const sorted = [...preferred].sort((a, b) => a.preferredY - b.preferredY);
  let prev = -Infinity;
  const out: Record<string, ProfileCalloutLayout> = {};

  for (const it of sorted) {
    let ly = Math.max(it.preferredY, prev + stackGap);
    if (Math.abs(ly - it.mountY) < minVert) {
      ly = Math.max(it.mountY - minVert, prev + stackGap);
    }
    out[it.id] = { labelX: it.labelX, labelY: ly };
    prev = ly;
  }
  return out;
}

/** Elbow leader from placement origin to label anchor (local coords). */
export function profileCalloutLeaderPoints(
  labelX: number,
  mountX: number,
  labelY: number,
  mountY: number,
): string {
  const dx = labelX - mountX;
  const dy = labelY - mountY;
  const elbowX = Math.min(Math.max(28, dx * 0.4), Math.max(28, dx - 10));
  if (Math.abs(dy) < 2) {
    return `8,0 ${dx - 4},0`;
  }
  return `8,0 ${elbowX},0 ${dx - 4},${dy}`;
}
