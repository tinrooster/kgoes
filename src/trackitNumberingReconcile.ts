import {
  blockSlotNumbers,
  numbersUsedOnDrawing,
  parseCableNumberFromId,
} from "./trackitNumberingUtils";
import type { ConnectionEdge, TrackItNumberBlock, TrackItNumberingState } from "./types";

/** Merge cable IDs on edges into reserved block usedNumbers (for save + round-trip). */
export function reconcileTrackItNumberingFromEdges(
  state: TrackItNumberingState | null | undefined,
  edges: ConnectionEdge[],
): TrackItNumberingState | null {
  if (!state?.blocks?.length) return state ?? null;

  const blocks = state.blocks.map((block) => {
    if (block.status !== "reserved") return block;
    const used = [...numbersUsedOnDrawing(edges, block)].sort((a, b) => a - b);
    if (used.length === 0 && !(block.usedNumbers?.length)) return block;
    const prev = block.usedNumbers ?? [];
    if (prev.length === used.length && prev.every((n, i) => n === used[i])) return block;
    return {
      ...block,
      usedNumbers: used,
      updatedAt: new Date().toISOString(),
    };
  });

  return { ...state, blocks };
}

/** Infer a reserved block from applied cable numbers when none is synced yet. */
export function inferTrackItBlockFromEdgeAssignments(opts: {
  edges: ConnectionEdge[];
  organizationId?: string;
  project?: string;
  offset?: number;
}): TrackItNumberBlock | null {
  const nums = new Set<number>();
  for (const e of opts.edges) {
    const n = parseCableNumberFromId(e.data?.cableId as string | undefined);
    if (n != null) nums.add(n);
  }
  if (nums.size < 2) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const offset = Math.max(1, opts.offset ?? 1);
  let bestStep = offset;
  if (sorted.length >= 2) {
    const diffs = new Set<number>();
    for (let i = 1; i < sorted.length; i++) {
      const d = sorted[i] - sorted[i - 1];
      if (d > 0) diffs.add(d);
    }
    if (diffs.size === 1) bestStep = [...diffs][0];
  }

  const start = sorted[0];
  const slots = blockSlotNumbers(start, sorted.length, bestStep);
  const allMatch = sorted.every((n, i) => n === slots[i]);
  if (!allMatch) return null;

  const end = slots[slots.length - 1];
  return {
    reservationId: null,
    start,
    end,
    blockSize: sorted.length,
    offset: bestStep,
    project: opts.project ?? "Drawing",
    projectCls: "other",
    status: "reserved",
    usedNumbers: sorted,
    updatedAt: new Date().toISOString(),
  };
}
