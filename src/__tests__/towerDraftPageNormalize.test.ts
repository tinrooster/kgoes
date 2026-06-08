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

  it("upgrades Sutro starter height from reference art when context is absent", () => {
    const next = normalizeTowerDraftPage(sutroPage, null);
    expect(next.towerHeightFtAgl).toBe(977);
    expect(next.elevationReferenceImage?.url).toContain("sutro-elevation-ref.png");
  });

  it("keeps generic starter height without reference art or context", () => {
    const generic = {
      ...sutroPage,
      towerHeightFtAgl: 150,
      elevationReferenceImage: undefined,
    };
    const next = normalizeTowerDraftPage(generic, null);
    expect(next.towerHeightFtAgl).toBe(150);
  });

  it("downgrades stale AMSL-scale page height even without trackIT context", () => {
    const stale = { ...sutroPage, towerHeightFtAgl: 1811 };
    const next = normalizeTowerDraftPage(stale, null);
    expect(next.towerHeightFtAgl).toBe(977);
  });

  it("replaces stale guide bands when trackIT context arrives", () => {
    const stale = {
      ...sutroPage,
      guideBandsFt: [
        { ftAgl: 751, label: "751′ · L6 — upper platform" },
        { ftAgl: 564, label: "564′ · L5 — approx" },
      ],
    };
    const next = normalizeTowerDraftPage(stale, {
      ...trackItContext,
      elevationViewport: {
        tallTowerMode: true,
        guideBandsFt: [
          { ftAgl: 762, label: "762′ · L6 — 6th level" },
          { ftAgl: 630, label: "630′ · L5 — 5th level" },
        ],
      },
    });
    expect(next.guideBandsFt?.some((b) => b.ftAgl === 762)).toBe(true);
    expect(next.guideBandsFt?.some((b) => b.ftAgl === 751)).toBe(false);
  });
});
