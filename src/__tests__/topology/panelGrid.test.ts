import { describe, expect, it } from "vitest";
import { columnsForGridPreset, generatePanelGrid } from "../../topology/layout/panelGrid";

describe("generatePanelGrid", () => {
  it("produces 12 port centers for a 2x6 layout", () => {
    const coords = generatePanelGrid({
      xOffset: 0,
      yOffset: 0,
      portsPerPanel: 12,
      columns: 6,
    });
    expect(coords).toHaveLength(12);
    expect(coords[0].portNumber).toBe(1);
    expect(coords[5].portNumber).toBe(6);
    expect(coords[6].y).toBeGreaterThan(coords[0].y);
    expect(coords[11].portNumber).toBe(12);
  });

  it("maps grid presets to column counts", () => {
    expect(columnsForGridPreset(12, "2x6")).toBe(6);
    expect(columnsForGridPreset(24, "2x12")).toBe(12);
  });
});
