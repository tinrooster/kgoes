import type { CableSegment, CircuitPath } from "../domain/types";

export type ValidationErrorType = "DUPLICATE_PORT" | "BROKEN_CHAIN" | "INVALID_PORT_COUNT";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  affectedIds: string[];
}

export function validateNetworkTopology(
  segments: CableSegment[],
  circuits: CircuitPath[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const portUsageMap = new Map<string, string>();

  for (const seg of segments) {
    if (portUsageMap.has(seg.sourcePortId)) {
      errors.push({
        type: "DUPLICATE_PORT",
        message: `Port ${seg.sourcePortId} is occupied by multiple cable segments.`,
        affectedIds: [seg.id, portUsageMap.get(seg.sourcePortId)!],
      });
    }
    if (portUsageMap.has(seg.destinationPortId)) {
      errors.push({
        type: "DUPLICATE_PORT",
        message: `Port ${seg.destinationPortId} is occupied by multiple cable segments.`,
        affectedIds: [seg.id, portUsageMap.get(seg.destinationPortId)!],
      });
    }
    portUsageMap.set(seg.sourcePortId, seg.id);
    portUsageMap.set(seg.destinationPortId, seg.id);
  }

  for (const circuit of circuits) {
    const { orderedSegmentIds } = circuit;
    for (let i = 0; i < orderedSegmentIds.length - 1; i += 1) {
      const currentSeg = segments.find((s) => s.id === orderedSegmentIds[i]);
      const nextSeg = segments.find((s) => s.id === orderedSegmentIds[i + 1]);

      if (!currentSeg || !nextSeg) {
        errors.push({
          type: "BROKEN_CHAIN",
          message: `Circuit ${circuit.id} references missing cable segments.`,
          affectedIds: [circuit.id],
        });
        continue;
      }

      if (currentSeg.destinationPortId !== nextSeg.sourcePortId) {
        errors.push({
          type: "BROKEN_CHAIN",
          message: `Circuit ${circuit.id} has a broken bridge between ${currentSeg.id} and ${nextSeg.id}.`,
          affectedIds: [circuit.id, currentSeg.id, nextSeg.id],
        });
      }
    }
  }

  return errors;
}
