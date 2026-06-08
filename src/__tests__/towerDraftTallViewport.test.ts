import { describe, expect, it } from "vitest";
import {
  computeGlyphViewportBoost,
  computeTallTowerInitialViewport,
} from "../towerDraftTallViewport";
import { isTowerSectionElevationView, towerSectionPanCenterX } from "../towerDraftFaces";
import { towerDraftTowerCenterX } from "../towerDraftUtils";

describe("towerDraftTallViewport", () => {
  it("fits full tower at workingZoomRatio 1", () => {
    const bounds = { minX: 0, minY: 0, maxX: 700, maxY: 2500 };
    const fullTower = computeTallTowerInitialViewport({
      containerWidth: 1200,
      containerHeight: 800,
      fullBounds: bounds,
      towerHeightFt: 977,
      focusFtAgl: 630,
      contentOffsetY: 52,
      centerXContent: 350,
      workingZoomRatio: 1,
    });
    const zoomedIn = computeTallTowerInitialViewport({
      containerWidth: 1200,
      containerHeight: 800,
      fullBounds: bounds,
      towerHeightFt: 977,
      focusFtAgl: 630,
      contentOffsetY: 52,
      centerXContent: 350,
      workingZoomRatio: 3,
    });
    expect(fullTower.zoom).toBeLessThan(zoomedIn.zoom);
    expect(fullTower.zoom).toBeGreaterThan(0.3);
    expect(fullTower.zoom).toBeLessThan(0.55);
  });

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
