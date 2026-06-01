import type { TrackItLocationSnapshotEntry } from "./types";

export function mergeLocationSnapshot(
  prev: TrackItLocationSnapshotEntry[] | null | undefined,
  organizationId: string,
  incoming: TrackItLocationSnapshotEntry[],
): TrackItLocationSnapshotEntry[] {
  if (!incoming.length) return prev ?? [];
  const byId = new Map<string, TrackItLocationSnapshotEntry>();
  for (const row of prev ?? []) {
    byId.set(row.id, row);
  }
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function findLocationByCode(
  locations: TrackItLocationSnapshotEntry[] | null | undefined,
  code: string,
): TrackItLocationSnapshotEntry | undefined {
  const key = code.trim().toUpperCase();
  if (!key) return undefined;
  return locations?.find((l) => l.code.trim().toUpperCase() === key);
}
