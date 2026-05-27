/**
 * AutoCAD-style directional marquee selection.
 * Drag right (window): select only items fully inside the box (blue).
 * Drag left (crossing): select items inside or touching the box (green).
 */

export type MarqueeSelectionMode = "window" | "crossing";

/** Same rule as React Flow schematic: end X left of start X = crossing. */
export function marqueeModeFromDrag(startX: number, endX: number): MarqueeSelectionMode {
  return endX < startX ? "crossing" : "window";
}

export interface NormalizedRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): NormalizedRect {
  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
  };
}

/** Target on-screen stroke width (px) for marquee boxes in zoomed SVG canvases. */
export const MARQUEE_SCREEN_STROKE_PX = 2;
/** White surround drawn behind the colored stroke (schematic CSS uses outline: 1px outside 2px border). */
export const MARQUEE_SCREEN_HALO_PX = 1;
/** Face-plate canvases sit on blue device fills — use a thicker halo so the ring stays visible. */
export const MARQUEE_FACE_PLATE_HALO_PX = 5;

/** Convert a desired screen-pixel stroke to SVG user units at the current zoom. */
export function marqueeStrokeInSvgUnits(zoom: number, screenPx = MARQUEE_SCREEN_STROKE_PX): number {
  return screenPx / Math.max(zoom, 0.25);
}

export const MARQUEE_BOX_STYLES: Record<
  MarqueeSelectionMode,
  {
    fill: string;
    stroke: string;
    strokeDasharray?: string;
    haloStroke: string;
  }
> = {
  window: {
    fill: "rgba(59, 130, 246, 0.08)",
    stroke: "rgba(59, 130, 246, 0.75)",
    haloStroke: "rgba(255, 255, 255, 0.95)",
  },
  crossing: {
    fill: "rgba(34, 197, 94, 0.08)",
    stroke: "rgba(34, 197, 94, 0.75)",
    strokeDasharray: "4 3",
    haloStroke: "rgba(255, 255, 255, 0.9)",
  },
};

export function rectFullyInside(inner: NormalizedRect, outer: NormalizedRect): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

export function rectsIntersect(a: NormalizedRect, b: NormalizedRect): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function hitTestItemRect(
  mode: MarqueeSelectionMode,
  item: NormalizedRect,
  selection: NormalizedRect,
): boolean {
  if (mode === "window") return rectFullyInside(item, selection);
  return rectsIntersect(item, selection);
}

/** Point / label anchor — same rules as a zero-size rect. */
export function hitTestPoint(
  mode: MarqueeSelectionMode,
  px: number,
  py: number,
  rect: NormalizedRect,
): boolean {
  const point: NormalizedRect = { minX: px, maxX: px, minY: py, maxY: py };
  return hitTestItemRect(mode, point, rect);
}
