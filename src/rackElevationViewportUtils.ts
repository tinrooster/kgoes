import { sortRacksForLayout } from "./rackLayout";
import type { RackElevationViewportPreset } from "./types";
import {
  rackContentBoundsForRack,
  rackPageContentBounds,
  type ContentBounds,
} from "./viewNavUtils";

export function defaultRackElevationViewports(): RackElevationViewportPreset[] {
  return [{ id: "overview", label: "Overview", fit: "all" }];
}

function rowYValues(racks: { position: { x: number; y: number } }[]): number[] {
  const ys = [...new Set(racks.map((r) => r.position.y))].sort((a, b) => a - b);
  return ys;
}

export function mergeRackElevationViewportOptions(
  saved: RackElevationViewportPreset[],
  racks: { id: string; label: string; position: { x: number; y: number }; heightU: number }[],
): RackElevationViewportPreset[] {
  const byId = new Map<string, RackElevationViewportPreset>();
  for (const vp of saved) byId.set(vp.id, vp);

  const overview = byId.get("overview") ?? defaultRackElevationViewports()[0];
  const merged: RackElevationViewportPreset[] = [overview];

  const rows = rowYValues(racks);
  if (rows.length >= 2) {
    merged.push(
      byId.get("top-row") ?? { id: "top-row", label: "Top row", fit: "top-row" },
      byId.get("bottom-row") ?? { id: "bottom-row", label: "Bottom row", fit: "bottom-row" },
    );
  }

  for (const rack of sortRacksForLayout(racks)) {
    const id = `rack-${rack.id}`;
    if (!byId.has(id)) {
      merged.push({ id, label: rack.label, fit: "rack", rackId: rack.id });
    } else {
      merged.push(byId.get(id)!);
    }
  }

  for (const vp of saved) {
    if (vp.fit === "custom" && !merged.some((m) => m.id === vp.id)) {
      merged.push(vp);
    }
  }

  return merged;
}

function boundsForRackRow(
  racks: { position: { x: number; y: number }; heightU: number }[],
  maxHeightU: number,
  rowY: number,
): ContentBounds | null {
  const rowRacks = racks.filter((r) => r.position.y === rowY);
  if (rowRacks.length === 0) return null;
  return rackPageContentBounds(rowRacks, maxHeightU);
}

export function boundsForRackElevationViewport(
  preset: RackElevationViewportPreset,
  racks: { id: string; position: { x: number; y: number }; heightU: number }[],
  maxHeightU: number,
): ContentBounds | null {
  if (racks.length === 0) return null;
  if (preset.fit === "custom" && preset.viewport) {
    return rackPageContentBounds(racks, maxHeightU);
  }
  if (preset.fit === "rack" && preset.rackId) {
    const rack = racks.find((r) => r.id === preset.rackId);
    if (!rack) return null;
    return rackContentBoundsForRack(rack, maxHeightU, 48);
  }
  const rows = rowYValues(racks);
  if (preset.fit === "top-row" && rows.length > 0) {
    return boundsForRackRow(racks, maxHeightU, rows[0]);
  }
  if (preset.fit === "bottom-row" && rows.length > 1) {
    return boundsForRackRow(racks, maxHeightU, rows[rows.length - 1]);
  }
  return rackPageContentBounds(racks, maxHeightU);
}

export function isPersistedRackElevationViewport(preset: { id: string; fit: string }): boolean {
  return preset.fit === "custom";
}
