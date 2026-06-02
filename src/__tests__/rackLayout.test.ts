import { describe, expect, it } from "vitest";
import { layoutRackPositions, nextRackPosition, sortRacksForLayout } from "../rackLayout";

function mockRacks(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    position: { x: i * 10, y: 0 },
    heightU: 42,
  }));
}

describe("layoutRackPositions", () => {
  it("lays out a single horizontal row", () => {
    const racks = mockRacks(4);
    const pos = layoutRackPositions(racks, { mode: "row" });
    expect(pos.get("r0")).toEqual({ x: 40, y: 96 });
    expect(pos.get("r3")!.x).toBeGreaterThan(pos.get("r0")!.x);
    expect(pos.get("r3")!.y).toBe(96);
  });

  it("lays out 12 racks in 2 rows of 6", () => {
    const racks = mockRacks(12);
    const pos = layoutRackPositions(racks, { mode: "grid", columns: 6, maxHeightU: 42 });
    expect(pos.get("r0")).toEqual({ x: 40, y: 96 });
    expect(pos.get("r5")!.y).toBe(96);
    expect(pos.get("r5")!.x).toBeGreaterThan(pos.get("r0")!.x);
    expect(pos.get("r6")!.y).toBeGreaterThan(96);
    expect(pos.get("r6")!.x).toBe(40);
    expect(pos.get("r11")!.y).toBe(pos.get("r6")!.y);
  });
});

describe("nextRackPosition", () => {
  it("places the 7th rack on a second row when using 6 columns", () => {
    const racks = mockRacks(6);
    const next = nextRackPosition(racks, { columns: 6, maxHeightU: 42 });
    expect(next.y).toBeGreaterThan(96);
    expect(next.x).toBe(40);
  });
});

describe("sortRacksForLayout", () => {
  it("sorts by x then y", () => {
    const racks = [
      { id: "b", position: { x: 100, y: 0 }, heightU: 42 },
      { id: "a", position: { x: 0, y: 0 }, heightU: 42 },
    ];
    expect(sortRacksForLayout(racks).map((r) => r.id)).toEqual(["a", "b"]);
  });
});
