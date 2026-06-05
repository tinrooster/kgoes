import { describe, expect, it } from "vitest";
import {
  RACK_LAYOUT_H_SPACING,
  RACK_LAYOUT_ORIGIN,
  flipBottomRackRowPositions,
  layoutRackPositions,
} from "../rackLayout";

function mockRacks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i + 1}`,
    heightU: 42,
    position: { x: 0, y: 0 },
  }));
}

describe("layoutRackPositions serpentine", () => {
  it("places bottom row right-to-left when serpentineRows is true", () => {
    const racks = mockRacks(12);
    const pos = layoutRackPositions(racks, { mode: "grid", columns: 6, serpentineRows: true });

    expect(pos.get("r1")!.x).toBe(RACK_LAYOUT_ORIGIN.x);
    expect(pos.get("r6")!.x).toBe(RACK_LAYOUT_ORIGIN.x + 5 * RACK_LAYOUT_H_SPACING);
    expect(pos.get("r7")!.x).toBe(RACK_LAYOUT_ORIGIN.x + 5 * RACK_LAYOUT_H_SPACING);
    expect(pos.get("r12")!.x).toBe(RACK_LAYOUT_ORIGIN.x);
    expect(pos.get("r7")!.y).toBeGreaterThan(pos.get("r1")!.y);
  });
});

describe("flipBottomRackRowPositions", () => {
  it("mirrors x positions on the bottom row only", () => {
    const racks = mockRacks(12);
    const laidOut = layoutRackPositions(racks, { mode: "grid", columns: 6 });
    const positioned = racks.map((r) => ({
      ...r,
      position: laidOut.get(r.id)!,
    }));

    const flipped = flipBottomRackRowPositions(positioned);
    expect(flipped.get("r7")!.x).toBe(laidOut.get("r12")!.x);
    expect(flipped.get("r12")!.x).toBe(laidOut.get("r7")!.x);
    expect(flipped.has("r1")).toBe(false);
    expect(flipped.has("r6")).toBe(false);
  });
});
