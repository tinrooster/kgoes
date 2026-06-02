import { describe, expect, it } from "vitest";
import { packBlankRun, planFillPlacements } from "../rackFillPacking";
import { normalizeFillOrderSummary, rollupFillOrderLines } from "../rackFillCatalog";

describe("packBlankRun", () => {
  it("uses 6U and 4U panels for a 10U run", () => {
    const p = packBlankRun(10, 1, [6, 4, 2, 1]);
    expect(p.map((x) => x.heightU)).toEqual([6, 4]);
    expect(p.reduce((s, x) => s + x.heightU, 0)).toBe(10);
  });
});

describe("planFillPlacements", () => {
  it("places vents at every 6U and packs blanks between", () => {
    const freeU = Array.from({ length: 12 }, (_, i) => i + 1);
    const p = planFillPlacements({
      freeU,
      ventEveryNU: 6,
      ventPanelHeightU: 1,
      blankSizesU: [6, 4, 2, 1],
    });
    const vents = p.filter((x) => x.kind === "vent");
    expect(vents.some((v) => v.uPosition === 6)).toBe(true);
    expect(p.reduce((s, x) => s + x.heightU, 0)).toBe(12);
  });
});

describe("normalizeFillOrderSummary", () => {
  it("upgrades legacy blank/vent counts to lines", () => {
    const bom = normalizeFillOrderSummary({ blank: 2, vent: 1, totalU: 3 });
    expect(bom?.lines.length).toBeGreaterThan(0);
    expect(bom?.totalPanels).toBe(3);
  });
});

describe("rollupFillOrderLines", () => {
  it("totals screws and cost", () => {
    const summary = rollupFillOrderLines([
      { kind: "blank", heightU: 6 },
      { kind: "blank", heightU: 6 },
      { kind: "vent", heightU: 1 },
    ]);
    expect(summary.totalPanels).toBe(3);
    expect(summary.totalU).toBe(13);
    expect(summary.totalScrews).toBeGreaterThan(0);
    expect(summary.estimatedCostUsd).toBeGreaterThan(0);
    expect(summary.lines.length).toBeGreaterThan(0);
  });
});
