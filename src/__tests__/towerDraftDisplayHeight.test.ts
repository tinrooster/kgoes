import { describe, expect, it } from "vitest";
import {
  resolveCatalogTowerHeightFtAgl,
  resolveTowerDraftLayoutHeightFt,
} from "../towerDraftDisplayHeight";
import type { TowerDraftPage, TrackItTowerSiteContext } from "../types";
import { guideBandsForDisplay, isStructuralGuideBand, resolveTowerDraftGuideBands } from "../towerDraftGuideBands";

const tallContext: TrackItTowerSiteContext = {
  siteCode: "SUTRO",
  siteName: "Sutro Tower",
  towerHeightFt: 977,
  faceLayoutHeightFtAgl: 800,
  antennaLevels: [],
};

describe("towerDraftLayoutHeight", () => {
  const tallPage: TowerDraftPage = {
    id: "td-1",
    label: "Tall tower",
    type: "tower-draft",
    towerHeightFtAgl: 977,
    guideBandsFt: [],
    placements: [],
    polylines: [],
    elevationReferenceImage: { url: "/assets/mountaintops/sutro/sutro-elevation-ref.png" },
  };

  it("profile uses full catalog height from context", () => {
    expect(resolveTowerDraftLayoutHeightFt(tallPage, tallContext, "profile")).toBe(977);
  });

  it("prefers context tower height over generic 150 ft page height", () => {
    const starter = { ...tallPage, towerHeightFtAgl: 150 };
    expect(resolveCatalogTowerHeightFtAgl(starter, tallContext)).toBe(977);
    expect(resolveTowerDraftLayoutHeightFt(starter, tallContext, "profile")).toBe(977);
  });

  it("face views cap at faceLayoutHeightFtAgl from pack context", () => {
    expect(resolveTowerDraftLayoutHeightFt(tallPage, tallContext, "all-faces")).toBe(800);
    expect(resolveTowerDraftLayoutHeightFt(tallPage, tallContext, "N")).toBe(800);
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
