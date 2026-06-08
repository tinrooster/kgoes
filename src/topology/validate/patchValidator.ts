import type { CableSegment } from "../domain/types";
import { detectNetworkLoop } from "./loopDetector";

export type PatchBlockReason = "SELF_LOOP" | "PORT_OCCUPIED" | "NETWORK_LOOP";

export interface PatchValidationResult {
  allowed: boolean;
  reason?: PatchBlockReason;
  message?: string;
}

/**
 * Validates a proposed patch before commit (loop storm + port occupancy).
 */
export function validatePatchCandidate(
  segments: CableSegment[],
  sourcePortId: string,
  destPortId: string,
  opts?: { allowReplace?: boolean },
): PatchValidationResult {
  if (sourcePortId === destPortId) {
    return {
      allowed: false,
      reason: "SELF_LOOP",
      message: "Cannot patch a port into itself.",
    };
  }

  if (!opts?.allowReplace) {
    const occupied = new Set<string>();
    for (const seg of segments) {
      occupied.add(seg.sourcePortId);
      occupied.add(seg.destinationPortId);
    }

    if (occupied.has(sourcePortId)) {
      return {
        allowed: false,
        reason: "PORT_OCCUPIED",
        message: "That MDF port is already patched — remove it first or click to replace.",
      };
    }
    if (occupied.has(destPortId)) {
      return {
        allowed: false,
        reason: "PORT_OCCUPIED",
        message: "That satellite port is already patched — remove it first or click to replace.",
      };
    }
  }

  if (detectNetworkLoop({ segments }, sourcePortId, destPortId)) {
    return {
      allowed: false,
      reason: "NETWORK_LOOP",
      message: "This patch would create a network loop.",
    };
  }

  return { allowed: true };
}
