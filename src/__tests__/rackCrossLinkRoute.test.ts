import { describe, expect, it } from "vitest";
import { routeRackCrossLink } from "../rackCrossLinkRoute";

describe("routeRackCrossLink", () => {
  it("routes above racks with a horizontal bus segment", () => {
    const racks = [
      { id: "a", position: { x: 40, y: 40 } },
      { id: "b", position: { x: 360, y: 40 } },
      { id: "c", position: { x: 40, y: 1200 } },
    ];
    const route = routeRackCrossLink(racks[0], racks[2], racks, 0, "Datacom");
    expect(route.pathD).toContain("L");
    expect(route.pathD).not.toMatch(/Q /);
    expect(route.labelX).toBeGreaterThan(0);
    expect(route.labelWidth).toBeGreaterThan(40);
  });
});
