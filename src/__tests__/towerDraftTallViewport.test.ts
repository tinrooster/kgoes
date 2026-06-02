import { describe, expect, it } from "vitest";
import { computeGlyphViewportBoost } from "../towerDraftTallViewport";
import { isTowerSectionElevationView, towerSectionPanCenterX } from "../towerDraftFaces";
import { towerDraftTowerCenterX } from "../towerDraftUtils";

describe("towerDraftTallViewport", () => {
  it("boosts glyphs when tall tower is zoomed out", () => {
    expect(computeGlyphViewportBoost(true, 0.4)).toBeGreaterThan(1.5);
    expect(computeGlyphViewportBoost(true, 2)).toBe(1);
    expect(computeGlyphViewportBoost(false, 0.2)).toBe(1);
  });
});

describe("towerSectionElevation", () => {
  it("treats profile and faces as section views", () => {
    expect(isTowerSectionElevationView("profile")).toBe(true);
    expect(isTowerSectionElevationView("all-faces")).toBe(true);
    expect(isTowerSectionElevationView("N")).toBe(true);
    expect(isTowerSectionElevationView("site")).toBe(false);
  });

  it("pan center for all-faces is between columns", () => {
    const cx = towerSectionPanCenterX("all-faces", towerDraftTowerCenterX());
    expect(cx).toBeGreaterThan(200);
    expect(cx).toBeLessThan(700);
  });
});
