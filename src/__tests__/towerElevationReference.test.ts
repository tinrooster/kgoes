import { describe, expect, it } from "vitest";
import {
  enrichTowerElevationReference,
  inferReferenceImageAspectRatio,
  mergeTowerElevationReference,
  profileCenterXForReference,
  profileContentWidthForReference,
  referenceImageHeightPx,
  referenceImageWidthPx,
  towerElevationReferenceLayout,
  REFERENCE_ELEVATION_DEFAULT_OPACITY,
  SUTRO_ELEVATION_IMAGE_ASPECT,
} from "../towerElevationReference";
import type { TowerElevationReferenceImage } from "../types";
import { TOWER_DRAFT_RULER_W } from "../towerDraftUtils";

const SUTRO_ASPECT = 260 / 1080;

const sutroRef: TowerElevationReferenceImage = {
  url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
  fullBleed: true,
  imageAspectRatio: SUTRO_ASPECT,
  align: "center",
};

describe("towerElevationReference", () => {
  it("sizes Sutro reference width from aspect ratio (not narrow strip)", () => {
    const towerHeightFt = 977;
    const pxPerFt = 2.4;
    const baseW = 668;
    const heightPx = referenceImageHeightPx(towerHeightFt, pxPerFt);
    const widthPx = referenceImageWidthPx(sutroRef, heightPx, baseW, TOWER_DRAFT_RULER_W);
    expect(widthPx).toBeGreaterThan(500);
    expect(widthPx / heightPx).toBeCloseTo(SUTRO_ASPECT, 5);
  });

  it("widens profile content canvas for full Sutro silhouette", () => {
    const w = profileContentWidthForReference({
      ref: sutroRef,
      towerHeightFt: 977,
      pxPerFt: 2.4,
      baseContentWidth: 668,
    });
    expect(w).toBeGreaterThan(900);
  });

  it("centers placements on reference axis", () => {
    const cx = profileCenterXForReference({
      ref: sutroRef,
      towerHeightFt: 977,
      pxPerFt: 2.4,
      baseContentWidth: 668,
    });
    expect(cx).toBeGreaterThan(200);
  });

  it("defaults full-bleed opacity to 50%", () => {
    const layout = towerElevationReferenceLayout({
      towerHeightFt: 200,
      centerX: 300,
      rulerX: TOWER_DRAFT_RULER_W,
      contentWidth: 1200,
      pxPerFt: 2.4,
      ref: { url: "/x.png", fullBleed: true, imageAspectRatio: 0.3 },
    });
    expect(layout.opacity).toBe(REFERENCE_ELEVATION_DEFAULT_OPACITY);
  });

  it("infers Sutro aspect from URL when legacy page omits imageAspectRatio", () => {
    const legacy = {
      url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
      fullBleed: true,
      opacity: 0.92,
      blendMode: "multiply" as const,
    };
    const merged = mergeTowerElevationReference(legacy, null);
    expect(merged?.imageAspectRatio).toBeCloseTo(SUTRO_ELEVATION_IMAGE_ASPECT, 6);
    expect(merged?.opacity).toBe(0.92);
    expect(merged?.blendMode).toBe("multiply");
    const enriched = enrichTowerElevationReference({ url: legacy.url });
    expect(inferReferenceImageAspectRatio(enriched)).toBeCloseTo(SUTRO_ELEVATION_IMAGE_ASPECT, 6);
  });

  it("uses preserveAspectRatio none when aspect is known", () => {
    const layout = towerElevationReferenceLayout({
      towerHeightFt: 977,
      centerX: 800,
      rulerX: TOWER_DRAFT_RULER_W,
      contentWidth: 1900,
      pxPerFt: 6,
      ref: sutroRef,
    });
    expect(layout.preserveAspectRatio).toBe("none");
    expect(layout.width).toBeGreaterThan(1200);
    expect(layout.height).toBeGreaterThan(5000);
  });
});
