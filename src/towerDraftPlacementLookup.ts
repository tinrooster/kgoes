import type { SchematicPage, TowerDraftPage, TowerDraftPlacement } from "./types";

export function findTowerPlacementForDevice(
  pages: SchematicPage[],
  deviceNodeId: string | null | undefined,
): { page: TowerDraftPage; placement: TowerDraftPlacement } | null {
  if (!deviceNodeId) return null;
  for (const page of pages) {
    if (page.type !== "tower-draft") continue;
    const td = page as TowerDraftPage;
    const placement = td.placements.find((p) => p.deviceNodeId === deviceNodeId);
    if (placement) return { page: td, placement };
  }
  return null;
}
