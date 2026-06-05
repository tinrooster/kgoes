import { describe, expect, it } from "vitest";
import { computeHubMatrixLayout } from "../../topology/layout/matrixLayout";

describe("computeHubMatrixLayout", () => {
  it("fits 2x6 panels side by side without 640px dead zone", () => {
    const layout = computeHubMatrixLayout({ portsPerPanel: 12, columns: 6 });
    expect(layout.width).toBeLessThan(450);
    expect(layout.sourcePositionsByIndex[0].x).toBeLessThan(layout.trunkX);
    expect(layout.destPositionsByIndex[0].x).toBeGreaterThan(layout.trunkX);
    expect(layout.destPositionsByIndex[5].x).toBeLessThan(layout.width);
  });
});
