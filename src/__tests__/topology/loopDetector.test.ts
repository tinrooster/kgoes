import { describe, expect, it } from "vitest";
import { detectNetworkLoop } from "../../topology/validate/loopDetector";
import type { CableSegment } from "../../topology/domain/types";

function seg(id: string, src: string, dest: string): CableSegment {
  return {
    id,
    tagNumber: id,
    category: "Cat6A",
    sourcePortId: src,
    destinationPortId: dest,
  };
}

describe("detectNetworkLoop", () => {
  it("blocks self-loop on same port", () => {
    expect(detectNetworkLoop({ segments: [] }, "P1", "P1")).toBe(true);
  });

  it("allows a simple A-B patch with no existing graph", () => {
    expect(detectNetworkLoop({ segments: [] }, "P1", "P2")).toBe(false);
  });

  it("detects triangle loop A-B-C-A", () => {
    const segments = [seg("1", "A", "B"), seg("2", "B", "C")];
    expect(detectNetworkLoop({ segments }, "C", "A")).toBe(true);
  });

  it("allows chain extension without cycle", () => {
    const segments = [seg("1", "A", "B")];
    expect(detectNetworkLoop({ segments }, "C", "D")).toBe(false);
  });
});
