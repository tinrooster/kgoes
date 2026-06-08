import type { CableSegment } from "./domain/types";

/** Replace any segment touching either port, then add the new patch. */
export function mergePairPatch(
  segments: CableSegment[],
  sourcePortId: string,
  destPortId: string,
  newSegment: CableSegment,
): CableSegment[] {
  const filtered = segments.filter(
    (s) =>
      s.sourcePortId !== sourcePortId
      && s.destinationPortId !== sourcePortId
      && s.sourcePortId !== destPortId
      && s.destinationPortId !== destPortId,
  );
  return [...filtered, newSegment];
}

export function removePairPatch(segments: CableSegment[], segmentId: string): CableSegment[] {
  return segments.filter((s) => s.id !== segmentId);
}
