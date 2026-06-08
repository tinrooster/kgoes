import type { CableSegment, PatchActionRecord } from "./domain/types";

export function recordPatchAdd(
  history: PatchActionRecord[],
  segment: CableSegment,
): PatchActionRecord[] {
  return [...history, { type: "ADD_CABLE", segment, timestamp: Date.now() }];
}

export function recordPatchRemove(
  history: PatchActionRecord[],
  segment: CableSegment,
): PatchActionRecord[] {
  return [...history, { type: "REMOVE_CABLE", segment, timestamp: Date.now() }];
}

export function hasSessionChanges(history: PatchActionRecord[]): boolean {
  return history.length > 0;
}
