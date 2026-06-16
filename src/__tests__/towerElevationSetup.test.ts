import { describe, expect, it } from "vitest";
import {
  buildGuideBandsForHeight,
  buildTowerDraftPageOptsFromSetup,
  clampTowerElevationHeightFt,
  SUTRO_FORMAT_THRESHOLD_FT,
  TOWER_ELEVATION_HEIGHT_MAX_FT,
  usesSutroStructuralFormatting,
  validateTowerElevationSetup,
} from "../towerElevationSetup";

describe("towerElevationSetup", () => {
  it("clamps height to 1200 ft maximum", () => {
    expect(clampTowerElevationHeightFt(1500)).toBe(TOWER_ELEVATION_HEIGHT_MAX_FT);
    expect(clampTowerElevationHeightFt(180)).toBe(180);
  });

  it("uses quartile guide bands for typical heights", () => {
    const bands = buildGuideBandsForHeight(180);
    expect(bands.some((b) => b.ftAgl === 180)).toBe(true);
    expect(bands.some((b) => b.label?.includes("L6"))).toBe(false);
  });

  it("uses Sutro structural bands at 1000 ft without reference art", () => {
    expect(usesSutroStructuralFormatting(1000)).toBe(true);
    expect(usesSutroStructuralFormatting(SUTRO_FORMAT_THRESHOLD_FT - 1)).toBe(false);

    const opts = buildTowerDraftPageOptsFromSetup({ heightFtAgl: 1000 });
    expect(opts.profileVisual).toBe("generated_self_support");
    expect(opts.elevationReferenceImage).toBeUndefined();
    expect(opts.guideBandsFt?.some((b) => b.label?.includes("L6"))).toBe(true);
    expect(opts.faceLayoutHeightFtAgl).toBeGreaterThan(750);
    expect(opts.elevationViewport?.tallTowerMode).toBe(true);
  });

  it("stores optional site metadata on the page", () => {
    const opts = buildTowerDraftPageOptsFromSetup({
      heightFtAgl: 200,
      latitude: 37.75,
      longitude: -122.45,
      accessNotes: "Call ahead",
      details: "KGO mountaintop",
    });
    expect(opts.siteSetup?.latitude).toBe(37.75);
    expect(opts.siteSetup?.accessNotes).toBe("Call ahead");
  });

  it("validates height and coordinates", () => {
    expect(validateTowerElevationSetup({ heightFtAgl: 1300 }).ok).toBe(false);
    expect(validateTowerElevationSetup({ heightFtAgl: 200, latitude: 95 }).ok).toBe(false);
    expect(validateTowerElevationSetup({ heightFtAgl: 200 }).ok).toBe(true);
  });
});
