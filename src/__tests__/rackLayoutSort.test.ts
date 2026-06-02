import { describe, expect, it } from "vitest";
import { sortRacksByLabel, sortRacksForLayout } from "../rackLayout";

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
