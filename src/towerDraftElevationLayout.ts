/** Layout helpers for tower elevation SVG (design handoff: tower.jsx). */

export const TOWER_DRAFT_TITLE_H = 40;
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
