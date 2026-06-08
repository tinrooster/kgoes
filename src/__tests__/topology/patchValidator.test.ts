import { describe, expect, it } from "vitest";
import { validatePatchCandidate } from "../../topology/validate/patchValidator";
import type { CableSegment } from "../../topology/domain/types";

function seg(src: string, dest: string): CableSegment {
  return {
    id: `${src}-${dest}`,
    tagNumber: "T1",
    category: "Cat6A",
    sourcePortId: src,
    destinationPortId: dest,
  };
}

describe("validatePatchCandidate", () => {
  it("rejects self-loop", () => {
    const result = validatePatchCandidate([], "P1", "P1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("SELF_LOOP");
  });

  it("rejects occupied destination port", () => {
    const result = validatePatchCandidate([seg("P1", "P2")], "P3", "P2");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("PORT_OCCUPIED");
  });

  it("allows valid new patch", () => {
    const result = validatePatchCandidate([seg("P1", "P2")], "P3", "P4");
    expect(result.allowed).toBe(true);
  });
});
