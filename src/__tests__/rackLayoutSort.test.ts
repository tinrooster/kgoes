import { describe, expect, it } from "vitest";
import { sortRacksByLabel, sortRacksForLayout, sortRacksForAutoLayout, layoutAutoRackPositions } from "../rackLayout";

const racks = [
  { id: "a", label: "Rack 10", position: { x: 640, y: 200 }, heightU: 42 },
  { id: "b", label: "Rack 2", position: { x: 360, y: 40 }, heightU: 42 },
  { id: "c", label: "Rack 4", position: { x: 40, y: 200 }, heightU: 42 },
  { id: "d", label: "Rack 7", position: { x: 360, y: 200 }, heightU: 42 },
];

describe("sortRacksByLabel", () => {
  it("orders by numeric label, not canvas position", () => {
    const sorted = sortRacksByLabel(racks);
    expect(sorted.map((r) => r.label)).toEqual(["Rack 2", "Rack 4", "Rack 7", "Rack 10"]);
  });

  it("differs from layout sort on a 2×6-style grid", () => {
    const byLabel = sortRacksByLabel(racks).map((r) => r.label);
    const byLayout = sortRacksForLayout(racks).map((r) => r.label);
    expect(byLabel).not.toEqual(byLayout);
  });
});

describe("sortRacksForAutoLayout", () => {
  it("orders TD05 before TD08 by prefix and suffix", () => {
    const racks = [
      { id: "b", label: "TD08", position: { x: 0, y: 200 }, heightU: 42 },
      { id: "a", label: "TD05", position: { x: 0, y: 0 }, heightU: 42, linkedRoomId: "room-1" },
    ];
    const sorted = sortRacksForAutoLayout(racks);
    expect(sorted.map((r) => r.label)).toEqual(["TD05", "TD08"]);
  });

  it("places racks with different layoutRow on separate canvas rows", () => {
    const racks = [
      { id: "a", label: "TD05", position: { x: 0, y: 0 }, heightU: 42, layoutRow: 1 },
      { id: "b", label: "TD08", position: { x: 0, y: 200 }, heightU: 42, layoutRow: 2 },
    ];
    const positions = layoutAutoRackPositions(racks);
    expect(positions.get("a")!.y).toBeLessThan(positions.get("b")!.y);
    expect(positions.get("a")!.x).toBe(positions.get("b")!.x);
  });

  it("lays out same-row racks side by side", () => {
    const racks = [
      { id: "a", label: "TD05", position: { x: 0, y: 0 }, heightU: 42 },
      { id: "b", label: "TD08", position: { x: 0, y: 400 }, heightU: 25 },
    ];
    const positions = layoutAutoRackPositions(racks);
    expect(positions.get("a")!.y).toBe(positions.get("b")!.y);
    expect(positions.get("b")!.x).toBeGreaterThan(positions.get("a")!.x);
  });
});
