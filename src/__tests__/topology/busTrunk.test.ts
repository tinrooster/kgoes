import { describe, expect, it } from "vitest";
import { pointsToSvgPath, routeBusTrunk } from "../../topology/routing/busTrunk";

describe("routeBusTrunk", () => {
  it("assigns unique vertical lanes per track index", () => {
    const conn = {
      id: "c1",
      source: { x: 40, y: 100 },
      destination: { x: 520, y: 200 },
    };
    const path0 = routeBusTrunk(conn, 0, 300, 8);
    const path1 = routeBusTrunk(conn, 1, 300, 8);
    expect(path0[1].x).toBe(300);
    expect(path1[1].x).toBe(308);
    expect(path0).toHaveLength(4);
  });

  it("builds valid SVG path strings", () => {
    const points = routeBusTrunk(
      { id: "c", source: { x: 0, y: 0 }, destination: { x: 100, y: 50 } },
      0,
      50,
    );
    expect(pointsToSvgPath(points)).toBe("M 0 0 L 50 0 L 50 50 L 100 50");
  });
});
