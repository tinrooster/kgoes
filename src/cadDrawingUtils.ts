import type { DeviceData, SchematicNode, TrackItLinkContext } from "./types";

const CAD_DRAWING_TYPES = new Set(["tower_stack", "compound", "line_diagram"]);

const TOWER_DEVICE_TYPES = new Set([
  "tower-lattice",
  "site-rest-platform",
  "site-equipment-shelter",
  "site-access-gate",
  "site-generator-pad",
  "site-cable-tray",
  "site-obstruction-light",
  "site-transformer",
]);

export function isCadFriendlyDrawingType(drawingType?: string | null): boolean {
  return !!drawingType && CAD_DRAWING_TYPES.has(drawingType);
}

export function schematicHasTowerSiteContent(nodes: SchematicNode[]): boolean {
  return nodes.some((n) => {
    if (n.type !== "device") return false;
    const dt = (n.data as DeviceData).deviceType;
    return !!dt && TOWER_DEVICE_TYPES.has(dt);
  });
}

/** Whether this drawing is a tower/site CAD context (wireframe refresh, mountaintop tooling). */
export function isCadContextDrawing(opts: {
  trackItLink?: TrackItLinkContext | null;
  nodes: SchematicNode[];
  schematicName?: string;
}): boolean {
  if (isCadFriendlyDrawingType(opts.trackItLink?.drawingType)) return true;
  if (schematicHasTowerSiteContent(opts.nodes)) return true;
  const name = (opts.schematicName ?? "").toLowerCase();
  return (
    name.includes("tower") ||
    name.includes("mountaintop") ||
    name.includes("mnt-") ||
    name.includes("site plan") ||
    name.includes("elevation")
  );
}

/** @deprecated Use panel visibility prefs; kept for callers that auto-suggest CAD UI. */
export function shouldShowCadTools(opts: {
  trackItLink?: TrackItLinkContext | null;
  nodes: SchematicNode[];
  schematicName?: string;
}): boolean {
  return isCadContextDrawing(opts);
}
