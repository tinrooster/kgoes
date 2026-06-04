import { describe, expect, it } from "vitest";
import { normalizeTowerDraftPage } from "../towerDraftPageNormalize";
import type { TowerDraftPage, TrackItTowerSiteContext } from "../types";

describe("normalizeTowerDraftPage", () => {
  const sutroPage: TowerDraftPage = {
    id: "td-sutro",
    label: "Tower elevation",
    type: "tower-draft",
    towerHeightFtAgl: 150,
    guideBandsFt: [],
    placements: [],
    polylines: [{ id: "p1", points: [] }],
    elevationReferenceImage: {
      url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
      imageAspectRatio: 245 / 1024,
    },
  };

  const trackItContext: TrackItTowerSiteContext = {
    siteCode: "SUTRO",
    siteName: "Sutro Tower",
    towerHeightFt: 977,
    antennaLevels: [],
    elevationReferenceImage: {
      url: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      imageAspectRatio: 245 / 1024,
      fullBleed: true,
    },
  };

  it("upgrades starter height and merges absolute ref from context", () => {
    const next = normalizeTowerDraftPage(sutroPage, trackItContext);
    expect(next.towerHeightFtAgl).toBe(977);
    expect(next.elevationReferenceImage?.url).toBe(
      "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
    );
  });

  it("upgrades Sutro height without trackIT context", () => {
    const next = normalizeTowerDraftPage(sutroPage, null);
    expect(next.towerHeightFtAgl).toBe(977);
    expect(next.elevationReferenceImage?.url).toContain("sutro-elevation-ref.png");
  });
});
