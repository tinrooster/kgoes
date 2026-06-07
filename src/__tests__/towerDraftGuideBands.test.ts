import { describe, expect, it } from "vitest";
import {
  guideBandsStaleVsContext,
  resolveTowerDraftGuideBands,
} from "../towerDraftGuideBands";
import type { TowerDraftPage } from "../types";

describe("towerDraftGuideBands", () => {
  const stalePage: TowerDraftPage = {
    id: "td",
    label: "Tower",
    type: "tower-draft",
    towerHeightFtAgl: 977,
    guideBandsFt: [
      { ftAgl: 751, label: "751′ · L6 — upper platform" },
      { ftAgl: 564, label: "564′ · L5 — approx" },
      { ftAgl: 326, label: "326′ · L4 — waist" },
      { ftAgl: 0, label: "Base" },
    ],
    placements: [],
    polylines: [],
  };

  const freshContextBands = [
    { ftAgl: 762, label: "762′ · L6 — 6th level" },
    { ftAgl: 630, label: "630′ · L5 — 5th level" },
    { ftAgl: 558, label: "558′ · L4 — waist" },
    { ftAgl: 0, label: "Base" },
  ];

  it("detects stale structural elevations vs context", () => {
    expect(guideBandsStaleVsContext(stalePage.guideBandsFt, freshContextBands)).toBe(true);
    expect(guideBandsStaleVsContext(freshContextBands, freshContextBands)).toBe(false);
  });

  it("prefers trackIT context bands when page bands are stale", () => {
    const resolved = resolveTowerDraftGuideBands(stalePage, {
      siteCode: "SUTRO",
      siteName: "Sutro Tower",
      towerHeightFt: 977,
      antennaLevels: [],
      elevationViewport: { tallTowerMode: true, guideBandsFt: freshContextBands },
    });
    expect(resolved.some((b) => b.ftAgl === 762)).toBe(true);
    expect(resolved.some((b) => b.ftAgl === 751)).toBe(false);
  });
});
