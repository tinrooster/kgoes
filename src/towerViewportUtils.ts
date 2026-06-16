import type { TowerDraftViewportPreset } from "./types";

export function defaultTowerDraftViewports(): TowerDraftViewportPreset[] {
  return [{ id: "overview", label: "Overview", fit: "all" }];
}

export function isPersistedTowerViewport(vp: { id: string; fit?: string }): boolean {
  return vp.id !== "overview" && vp.fit === "custom";
}

export function mergeTowerViewportOptions(
  saved: TowerDraftViewportPreset[] | undefined,
): TowerDraftViewportPreset[] {
  const byId = new Map<string, TowerDraftViewportPreset>();
  for (const vp of saved ?? []) byId.set(vp.id, vp);

  const overview = byId.get("overview") ?? defaultTowerDraftViewports()[0];
  const merged: TowerDraftViewportPreset[] = [overview];

  for (const vp of saved ?? []) {
    if (vp.id === "overview") continue;
    if (vp.fit === "custom") merged.push(vp);
  }

  return merged;
}
