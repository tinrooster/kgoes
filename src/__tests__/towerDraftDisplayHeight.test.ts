import { describe, expect, it } from "vitest";
import {
  resolveCatalogTowerHeightFtAgl,
  resolveTowerDraftLayoutHeightFt,
  SUTRO_CATALOG_TOP_FT_AGL,
  SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL,
} from "../towerDraftDisplayHeight";
import type { TowerDraftPage } from "../types";
import { guideBandsForDisplay, isStructuralGuideBand, resolveTowerDraftGuideBands } from "../towerDraftGuideBands";

describe("towerDraftLayoutHeight", () => {
  const sutroPage: TowerDraftPage = {
    id: "td-1",
    label: "Sutro",
    type: "tower-draft",
    towerHeightFtAgl: 977,
    guideBandsFt: [],
    placements: [],
    polylines: [],
    elevationReferenceImage: { url: "/assets/mountaintops/sutro/sutro-elevation-ref.png" },
  };

  it("profile uses full catalog height", () => {
    expect(resolveTowerDraftLayoutHeightFt(sutroPage, null, "profile")).toBe(977);
  });

  it("sanitizes polluted Sutro page height (AMSL mistaken for AGL)", () => {
    const polluted = { ...sutroPage, towerHeightFtAgl: 1811 };
    expect(resolveCatalogTowerHeightFtAgl(polluted, null)).toBe(SUTRO_CATALOG_TOP_FT_AGL);
    expect(resolveTowerDraftLayoutHeightFt(polluted, null, "profile")).toBe(SUTRO_CATALOG_TOP_FT_AGL);
  });

  it("ignores generic 150 ft page height for Sutro profile", () => {
    const starter = { ...sutroPage, towerHeightFtAgl: 150 };
    expect(resolveCatalogTowerHeightFtAgl(starter, null)).toBe(977);
    expect(resolveTowerDraftLayoutHeightFt(starter, null, "profile")).toBe(977);
  });

  it("face views cap Sutro at 800 ft", () => {
    expect(resolveTowerDraftLayoutHeightFt(sutroPage, null, "all-faces")).toBe(
      SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL,
    );
    expect(resolveTowerDraftLayoutHeightFt(sutroPage, null, "N")).toBe(SUTRO_FACE_LAYOUT_HEIGHT_FT_AGL);
  });
});

describe("towerDraftGuideBands", () => {
  it("filters bands above face layout cap", () => {
    const bands = [
      { ftAgl: 977, label: "Spires" },
      { ftAgl: 751, label: "L6" },
      { ftAgl: 0, label: "Base" },
    ];
    expect(guideBandsForDisplay(bands, 800).map((b) => b.ftAgl)).toEqual([751, 0]);
  });

  it("detects L2-L6 structural bands", () => {
    expect(isStructuralGuideBand({ ftAgl: 751, label: "751′ · L6 — upper platform" })).toBe(true);
  });

  it("falls back to context guide bands when page lacks structural labels", () => {
    const page: TowerDraftPage = {
      id: "td",
      label: "x",
      type: "tower-draft",
      towerHeightFtAgl: 977,
      guideBandsFt: [{ ftAgl: 500, label: "500′" }],
      placements: [],
      polylines: [],
    };
    const bands = resolveTowerDraftGuideBands(page, {
      siteCode: "SUTRO",
      siteName: "Sutro",
      towerHeightFt: 977,
      antennaLevels: [],
      elevationViewport: {
        tallTowerMode: true,
        guideBandsFt: [{ ftAgl: 751, label: "751′ · L6" }],
      },
    });
    expect(bands.some((b) => b.label?.includes("L6"))).toBe(true);
  });
});
