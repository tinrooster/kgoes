/** Rack elevation canvas layout (matches RackRenderer / viewNavUtils spacing). */

import { rackDesignationFromLabel } from "./rackDesignation";

/** Extra top inset so cross-link bus lanes sit above rack labels. */
export const RACK_LAYOUT_TOP_BUS_MARGIN = 56;

export const RACK_LAYOUT_ORIGIN = { x: 40, y: RACK_LAYOUT_TOP_BUS_MARGIN + 40 };
/** Horizontal gap between rack columns (px). */
export const RACK_LAYOUT_H_SPACING = 320;
/** Extra vertical gap between grid rows (px), below the tallest rack footprint. */
export const RACK_LAYOUT_ROW_GAP = 48;

/** Max racks per horizontal row before wrapping (auto layout). */
export const RACK_AUTO_LAYOUT_MAX_PER_ROW = 8;

const RACK_PAD_Y = 40;
const LABEL_HEIGHT = 24;
const PX_PER_U = 24;

/** Full footprint height for a rack row given the page max U (shared ruler alignment). */
export function rackRowFootprintPx(maxHeightU: number): number {
  return RACK_PAD_Y + LABEL_HEIGHT + maxHeightU * PX_PER_U + RACK_PAD_Y;
}

export type RackLayoutMode = "row" | "grid";

export interface RackLayoutInput {
  id: string;
  position: { x: number; y: number };
  heightU: number;
}

export interface LayoutRackPositionsOptions {
  /** `row` = single horizontal row; `grid` = wrap after `columns` racks. */
  mode?: RackLayoutMode;
  /** Columns per row when mode is `grid` (default 6). */
  columns?: number;
  /** When true, odd rows (2nd, 4th, …) run right-to-left — serpentine / wrap layout. */
  serpentineRows?: boolean;
  maxHeightU?: number;
  origin?: { x: number; y: number };
}

/** Whether bottom row should run right-to-left when laying out a grid. */
export function rackLayoutReverseOrder(
  page: { rackLayoutReverseOrder?: boolean; rackLayoutSerpentine?: boolean },
): boolean {
  return page.rackLayoutReverseOrder ?? page.rackLayoutSerpentine ?? false;
}
export function sortRacksForLayout<T extends RackLayoutInput>(racks: T[]): T[] {
  return [...racks].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
}

export type RackLabelSortInput = RackLayoutInput & {
  label: string;
  designation?: string;
};

export type RackAutoLayoutInput = RackLabelSortInput & {
  linkedRoomId?: string;
  layoutRow?: number;
  layoutOrder?: number;
};

/** Plant-style prefix from rack label (TD05 → TD, Rack 3 → RACK). */
export function extractRackLabelPrefix(label: string): string {
  const t = label.trim();
  if (!t) return "";
  if (/^rack\s+\d+$/i.test(t)) return "RACK";
  const plant = t.match(/^([A-Za-z]{1,6})[\s_-]*\d/i);
  if (plant) return plant[1].toUpperCase();
  const letters = t.match(/^([A-Za-z]+)/);
  return letters ? letters[1].toUpperCase() : t.toUpperCase();
}

/** Numeric suffix for sort (TD05 → 5, Rack 10 → 10). */
export function rackNumericSuffix(label: string): number {
  const fromLabel = rackDesignationFromLabel(label);
  if (fromLabel) return parseInt(fromLabel, 10);
  const any = label.match(/(\d+)/);
  return any ? parseInt(any[1], 10) : Number.MAX_SAFE_INTEGER;
}

function rackNumericSortKey(rack: RackLabelSortInput): number {
  const fromDesignation = rack.designation?.match(/(\d+)/);
  if (fromDesignation) return parseInt(fromDesignation[1], 10);
  const fromLabel = rackDesignationFromLabel(rack.label);
  if (fromLabel) return parseInt(fromLabel, 10);
  return Number.MAX_SAFE_INTEGER;
}

/** Sort by rack label number (Rack 2 before Rack 10), then natural label. */
export function sortRacksByLabel<T extends RackLabelSortInput>(racks: T[]): T[] {
  return [...racks].sort((a, b) => {
    const na = rackNumericSortKey(a);
    const nb = rackNumericSortKey(b);
    if (na !== nb) return na - nb;
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

/**
 * Smart sort for auto side-by-side layout: explicit row, linked room, prefix, suffix, manual order.
 */
export function sortRacksForAutoLayout<T extends RackAutoLayoutInput>(racks: T[]): T[] {
  return [...racks].sort((a, b) => {
    const rowA = a.layoutRow ?? 0;
    const rowB = b.layoutRow ?? 0;
    if (rowA !== rowB) return rowA - rowB;

    const prefixA = extractRackLabelPrefix(a.label);
    const prefixB = extractRackLabelPrefix(b.label);
    if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);

    const numA = rackNumericSuffix(a.label);
    const numB = rackNumericSuffix(b.label);
    if (numA !== numB) return numA - numB;

    const roomA = a.linkedRoomId ?? "";
    const roomB = b.linkedRoomId ?? "";
    if (roomA !== roomB) return roomA.localeCompare(roomB);

    const orderA = a.layoutOrder ?? 0;
    const orderB = b.layoutOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

/** Group sorted racks into canvas rows (explicit layoutRow or max-per-row wrap). */
export function groupRacksIntoLayoutRows<T extends RackAutoLayoutInput>(
  sortedRacks: T[],
  maxPerRow = RACK_AUTO_LAYOUT_MAX_PER_ROW,
): T[][] {
  if (sortedRacks.length === 0) return [];
  const rows: T[][] = [];
  let current: T[] = [];
  let currentExplicitRow: number | undefined;

  for (const rack of sortedRacks) {
    const explicitRow = rack.layoutRow;
    const needBreak =
      current.length > 0
      && (
        (explicitRow != null && currentExplicitRow != null && explicitRow !== currentExplicitRow)
        || (explicitRow != null && currentExplicitRow == null)
        || (explicitRow == null && currentExplicitRow != null)
        || current.length >= maxPerRow
      );

    if (needBreak) {
      rows.push(current);
      current = [];
      currentExplicitRow = undefined;
    }
    current.push(rack);
    if (explicitRow != null) currentExplicitRow = explicitRow;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

export interface AutoLayoutRackPositionsOptions {
  maxPerRow?: number;
  maxHeightU?: number;
  origin?: { x: number; y: number };
  serpentineRows?: boolean;
}

/** Side-by-side auto layout with smart sort and row grouping. */
export function layoutAutoRackPositions(
  racks: RackAutoLayoutInput[],
  options?: AutoLayoutRackPositionsOptions,
): Map<string, { x: number; y: number }> {
  const posById = new Map<string, { x: number; y: number }>();
  if (racks.length === 0) return posById;

  const sorted = sortRacksForAutoLayout(racks);
  const rowBuckets = groupRacksIntoLayoutRows(sorted, options?.maxPerRow ?? RACK_AUTO_LAYOUT_MAX_PER_ROW);
  const origin = options?.origin ?? RACK_LAYOUT_ORIGIN;
  const maxHeightU = options?.maxHeightU ?? Math.max(...racks.map((r) => r.heightU), 1);
  const rowStep = rackRowFootprintPx(maxHeightU) + RACK_LAYOUT_ROW_GAP;
  const serpentineRows = options?.serpentineRows ?? false;

  rowBuckets.forEach((rowRacks, rowIndex) => {
    rowRacks.forEach((rack, colIndex) => {
      let col = colIndex;
      if (serpentineRows && rowIndex % 2 === 1) {
        col = rowRacks.length - 1 - col;
      }
      posById.set(rack.id, {
        x: origin.x + col * RACK_LAYOUT_H_SPACING,
        y: origin.y + rowIndex * rowStep,
      });
    });
  });

  return posById;
}

/**
 * Compute canvas positions for racks on an elevation page.
 * Preserves rack order from the current layout (reading order).
 */
export function layoutRackPositions(
  racks: RackLayoutInput[],
  options?: LayoutRackPositionsOptions,
): Map<string, { x: number; y: number }> {
  const posById = new Map<string, { x: number; y: number }>();
  if (racks.length === 0) return posById;

  const origin = options?.origin ?? RACK_LAYOUT_ORIGIN;
  const maxHeightU = options?.maxHeightU ?? Math.max(...racks.map((r) => r.heightU), 1);
  const rowStep = rackRowFootprintPx(maxHeightU) + RACK_LAYOUT_ROW_GAP;
  const mode = options?.mode ?? (options?.columns != null && options.columns > 1 ? "grid" : "row");
  const columns =
    mode === "grid"
      ? Math.max(1, Math.min(racks.length, options?.columns ?? 6))
      : racks.length;

  const serpentineRows = options?.serpentineRows ?? false;
  const sorted = sortRacksForLayout(racks);
  sorted.forEach((rack, i) => {
    if (mode === "row") {
      posById.set(rack.id, { x: origin.x + i * RACK_LAYOUT_H_SPACING, y: origin.y });
      return;
    }
    const row = Math.floor(i / columns);
    let col = i % columns;
    if (serpentineRows && row % 2 === 1) {
      col = columns - 1 - col;
    }
    posById.set(rack.id, {
      x: origin.x + col * RACK_LAYOUT_H_SPACING,
      y: origin.y + row * rowStep,
    });
  });

  return posById;
}

/** Suggested default position when adding another rack to a page. */
export function nextRackPosition(
  racks: RackLayoutInput[],
  options?: { columns?: number; maxHeightU?: number },
): { x: number; y: number } {
  if (racks.length === 0) return { ...RACK_LAYOUT_ORIGIN };
  const maxHeightU = options?.maxHeightU ?? Math.max(...racks.map((r) => r.heightU), 1);
  const columns = options?.columns ?? (racks.length >= 6 ? 6 : racks.length);
  const positions = layoutRackPositions(racks, { mode: "grid", columns, maxHeightU });
  const sorted = sortRacksForLayout(racks);
  const last = sorted[sorted.length - 1];
  const lastPos = positions.get(last.id) ?? RACK_LAYOUT_ORIGIN;
  const index = sorted.length;
  const col = index % columns;
  if (col === 0 && index > 0) {
    const rowStep = rackRowFootprintPx(maxHeightU) + RACK_LAYOUT_ROW_GAP;
    return { x: RACK_LAYOUT_ORIGIN.x, y: lastPos.y + rowStep };
  }
  return { x: lastPos.x + RACK_LAYOUT_H_SPACING, y: lastPos.y };
}

/** Infer column count from the top row of the current canvas layout. */
export function inferGridColumns(racks: RackLayoutInput[]): number {
  if (racks.length === 0) return 6;
  const sorted = sortRacksForLayout(racks);
  const minY = sorted[0].position.y;
  const topRow = sorted.filter((r) => r.position.y === minY);
  if (topRow.length > 0) return topRow.length;
  return racks.length <= 6 ? racks.length : 6;
}

/**
 * Mirror the bottom row left↔right (e.g. racks 7–12 become 12–7).
 * Returns only racks whose position changed.
 */
export function flipBottomRackRowPositions(
  racks: RackLayoutInput[],
): Map<string, { x: number; y: number }> {
  const posById = new Map<string, { x: number; y: number }>();
  if (racks.length < 2) return posById;

  const sorted = sortRacksForLayout(racks);
  const maxY = Math.max(...sorted.map((r) => r.position.y));
  const bottomRow = sorted
    .filter((r) => r.position.y === maxY)
    .sort((a, b) => a.position.x - b.position.x);
  if (bottomRow.length < 2) return posById;

  const xs = bottomRow.map((r) => r.position.x);
  bottomRow.forEach((rack, i) => {
    const newX = xs[xs.length - 1 - i];
    if (newX !== rack.position.x) {
      posById.set(rack.id, { x: newX, y: rack.position.y });
    }
  });
  return posById;
}
