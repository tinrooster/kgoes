import { describe, expect, it } from "vitest";
import {
  buildGuideBandsForHeight,
  buildTowerDraftPageOptsFromSetup,
  clampTowerElevationHeightFt,
  hasGenericSutroLevelGuideLabels,
  migrateGenericTowerGuideBands,
  TALL_TOWER_FORMAT_THRESHOLD_FT,
  TOWER_ELEVATION_HEIGHT_MAX_FT,
  usesTallTowerFormatting,
  validateTowerElevationSetup,
} from "../towerElevationSetup";
import type { TowerDraftPage } from "../types";

describe("towerElevationSetup", () => {
  it("clamps height to 1200 ft maximum", () => {
    expect(clampTowerElevationHeightFt(1500)).toBe(TOWER_ELEVATION_HEIGHT_MAX_FT);
    expect(clampTowerElevationHeightFt(180)).toBe(180);
  });

  it("uses quartile guide bands for typical and tall heights", () => {
    const bands180 = buildGuideBandsForHeight(180);
    expect(bands180.some((b) => b.ftAgl === 180)).toBe(true);
    expect(bands180.some((b) => b.label?.includes("L6"))).toBe(false);

    const bands1000 = buildGuideBandsForHeight(1000);
    expect(bands1000.some((b) => b.label?.includes("L6"))).toBe(false);
    expect(bands1000.some((b) => b.ftAgl === 1000)).toBe(true);
  });

  it("enables tall-tower formatting at 1000 ft without Sutro level labels", () => {
    expect(usesTallTowerFormatting(1000)).toBe(true);
    expect(usesTallTowerFormatting(TALL_TOWER_FORMAT_THRESHOLD_FT - 1)).toBe(false);

    const opts = buildTowerDraftPageOptsFromSetup({ heightFtAgl: 1000 });
    expect(opts.profileVisual).toBe("generated_self_support");
    expect(opts.elevationReferenceImage).toBeUndefined();
    expect(opts.guideBandsFt?.some((b) => b.label?.includes("L6"))).toBe(false);
    expect(opts.elevationViewport?.guideBandsFt).toBeUndefined();
    expect(opts.faceLayoutHeightFtAgl).toBeGreaterThan(750);
    expect(opts.elevationViewport?.tallTowerMode).toBe(true);
  });

  it("migrates mistaken Sutro level labels on generic tall pages", () => {
    const page: TowerDraftPage = {
      id: "td",
      label: "Tower",
      type: "tower-draft",
      towerHeightFtAgl: 1200,
      guideBandsFt: [{ ftAgl: 936, label: "936′ · L6 — 6th level" }, { ftAgl: 0, label: "Base" }],
      placements: [],
      polylines: [],
    };
    expect(hasGenericSutroLevelGuideLabels(page.guideBandsFt)).toBe(true);
    const next = migrateGenericTowerGuideBands(page);
    expect(next.guideBandsFt?.some((b) => b.label?.includes("L6"))).toBe(false);
    expect(next.guideBandsFt?.some((b) => b.ftAgl === 1200)).toBe(true);
  });

  it("migrates stale Sutro labels stored on elevationViewport", () => {
    const page: TowerDraftPage = {
      id: "td",
      label: "Tower",
      type: "tower-draft",
      towerHeightFtAgl: 1200,
      guideBandsFt: [{ ftAgl: 1200, label: "1200′" }, { ftAgl: 0, label: "Base" }],
      elevationViewport: {
        tallTowerMode: true,
        guideBandsFt: [{ ftAgl: 936, label: "936′ · L6 — 6th level" }],
      },
      placements: [],
      polylines: [],
    };
    const next = migrateGenericTowerGuideBands(page);
    expect(next.elevationViewport?.guideBandsFt).toBeUndefined();
    expect(next.elevationViewport?.tallTowerMode).toBe(true);
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
