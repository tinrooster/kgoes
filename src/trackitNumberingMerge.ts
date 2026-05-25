import type { TrackItNumberBlock, TrackItNumberingState } from "./types";

export function blockIdentity(b: TrackItNumberBlock): string {
  return b.reservationId ?? `${b.start}-${b.end}-${b.updatedAt}`;
}

/** Upsert one block; returns merged blocks array. */
export function upsertTrackItBlock(
  blocks: TrackItNumberBlock[],
  next: TrackItNumberBlock,
): TrackItNumberBlock[] {
  if (!next.reservationId) {
    return [...blocks, next];
  }
  const idx = blocks.findIndex((b) => b.reservationId === next.reservationId);
  if (idx < 0) return [...blocks, next];
  const copy = [...blocks];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

/** Replace reserved blocks from trackIT snapshot; keep allocated/released history. */
export function mergeNumberingSnapshot(
  prev: TrackItNumberingState | null,
  _organizationId: string,
  incoming: TrackItNumberBlock[],
): TrackItNumberBlock[] {
  const existing = prev?.blocks ?? [];
  const kept = existing.filter((b) => b.status !== "reserved");
  const reserved = incoming.map((b) => ({ ...b, status: "reserved" as const }));
  return sortBlocksForDisplay([...reserved, ...kept]);
}

export function sortBlocksForDisplay(blocks: TrackItNumberBlock[]): TrackItNumberBlock[] {
  return [...blocks].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
