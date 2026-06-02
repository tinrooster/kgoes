/**
 * Orthogonal routes for rack cross-links on facility elevation sheets.
 * Buses above the rack grid so arrows do not cut through other columns.
 */

import { RACK_LAYOUT_H_SPACING } from "./rackLayout";

/** Matches RackRenderer layout constants. */
export const CROSS_LINK_RACK_PAD_X = 20;
export const CROSS_LINK_RULER_W = 28;
export const CROSS_LINK_RACK_W = 260;
export const CROSS_LINK_RACK_PAD_Y = 40;

export interface RackCrossLinkAnchor {
  id: string;
  position: { x: number; y: number };
}

export interface CrossLinkRoute {
  pathD: string;
  labelX: number;
  labelY: number;
  labelWidth: number;
}

function rackTopCenter(rack: RackCrossLinkAnchor): { x: number; y: number } {
  return {
    x: rack.position.x + CROSS_LINK_RACK_PAD_X + CROSS_LINK_RULER_W + CROSS_LINK_RACK_W / 2,
    y: rack.position.y + CROSS_LINK_RACK_PAD_Y - 6,
  };
}

/** Lane above the top row; stagger multiple links vertically. */
function busYForLink(
  racks: RackCrossLinkAnchor[],
  linkIndex: number,
): number {
  const minTop = racks.reduce((m, r) => Math.min(m, r.position.y), Infinity);
  const base = (Number.isFinite(minTop) ? minTop : 40) - 28;
  return base - linkIndex * 16;
}

/**
 * Build an orthogonal path: up from source → bus → across → down to target.
 */
export function routeRackCrossLink(
  from: RackCrossLinkAnchor,
  to: RackCrossLinkAnchor,
  allRacks: RackCrossLinkAnchor[],
  linkIndex: number,
  label: string,
): CrossLinkRoute {
  const a = rackTopCenter(from);
  const b = rackTopCenter(to);
  const busY = busYForLink(allRacks, linkIndex);

  const pathD = `M ${a.x} ${a.y} L ${a.x} ${busY} L ${b.x} ${busY} L ${b.x} ${b.y}`;

  const labelChars = Math.max(label.length, 4);
  const labelWidth = Math.min(220, Math.max(48, labelChars * 5.5 + 12));
  const labelX = (a.x + b.x) / 2;
  const labelY = busY - 5;

  return { pathD, labelX, labelY, labelWidth };
}

/** Minimum canvas width when laying out racks so bus lanes have room. */
export function crossLinkBusMarginPx(_rackCount: number, columns = 6): number {
  return Math.max(48, columns * 0);
}

/** Extra top margin when auto-layout should leave room for cross-link buses. */
export function crossLinkTopMarginPx(linkCount: number): number {
  return 32 + Math.max(0, linkCount) * 16;
}

export { RACK_LAYOUT_H_SPACING };
