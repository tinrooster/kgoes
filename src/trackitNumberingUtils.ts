import type { ConnectionEdge, TrackItNumberBlock } from "./types";

/** Slot numbers in a reserved block (matches trackIT blockSlotNumbers). */
export function blockSlotNumbers(start: number, blockSize: number, offset: number): number[] {
  const size = Math.max(1, blockSize);
  const step = Math.max(1, offset);
  return Array.from({ length: size }, (_, i) => start + i * step);
}

export function formatCableNumber(n: number): string {
  return String(n);
}

export function formatBlockRange(block: TrackItNumberBlock): string {
  return block.start === block.end
    ? formatCableNumber(block.start)
    : `${formatCableNumber(block.start)}–${formatCableNumber(block.end)}`;
}

/** Parse edge cableId as a plant cable number (digits only). */
export function parseCableNumberFromId(cableId: string | undefined): number | null {
  if (!cableId) return null;
  const trimmed = cableId.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

const slotSetForBlock = (block: TrackItNumberBlock): Set<number> =>
  new Set(blockSlotNumbers(block.start, block.blockSize, block.offset));

/** Numbers from this block already used on schematic edges. */
export function numbersUsedOnDrawing(
  edges: ConnectionEdge[],
  block: TrackItNumberBlock,
): Set<number> {
  const slots = slotSetForBlock(block);
  const used = new Set<number>();
  for (const e of edges) {
    const n = parseCableNumberFromId(e.data?.cableId as string | undefined);
    if (n != null && slots.has(n)) used.add(n);
  }
  return used;
}

/** Numbers consumed per trackIT registry / allocate event (not on drawing). */
export function numbersUsedInTrackIt(block: TrackItNumberBlock): Set<number> {
  return new Set(block.usedNumbers ?? []);
}

export function numbersUnavailable(block: TrackItNumberBlock): Set<number> {
  const out = numbersUsedInTrackIt(block);
  if (block.status === "released") {
    for (const n of blockSlotNumbers(block.start, block.blockSize, block.offset)) {
      out.add(n);
    }
  }
  return out;
}

export function freeSlotsForBlock(
  block: TrackItNumberBlock,
  edges: ConnectionEdge[],
): number[] {
  if (block.status !== "reserved") return [];
  const unavailable = numbersUnavailable(block);
  const onDrawing = numbersUsedOnDrawing(edges, block);
  return blockSlotNumbers(block.start, block.blockSize, block.offset).filter(
    (n) => !unavailable.has(n) && !onDrawing.has(n),
  );
}

export function activeReservedBlocks(blocks: TrackItNumberBlock[]): TrackItNumberBlock[] {
  return blocks.filter((b) => b.status === "reserved");
}

export function pickDefaultActiveBlock(blocks: TrackItNumberBlock[]): TrackItNumberBlock | null {
  const reserved = activeReservedBlocks(blocks);
  if (reserved.length === 0) return null;
  return reserved[reserved.length - 1];
}
