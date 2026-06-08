import { describe, expect, it } from "vitest";
import {
  canonicalizeElevationReference,
  mergeTowerElevationReference,
  pickElevationReferenceUrl,
  resolveActiveElevationReference,
  resolveProfileElevationReference,
  rewriteSutroBlueprintUrl,
  SUTRO_ELEVATION_BLUEPRINT_ASPECT,
  SUTRO_ELEVATION_IMAGE_ASPECT,
  SUTRO_ELEVATION_SGM_BLUEPRINT_URL,
} from "../towerElevationReference";

describe("rewriteSutroBlueprintUrl", () => {
  it("rewrites legacy screenshot blueprint filename to canonical SGM", () => {
    expect(
      rewriteSutroBlueprintUrl("/assets/mountaintops/sutro/sutro-elevation-blueprint.png"),
    ).toBe(SUTRO_ELEVATION_SGM_BLUEPRINT_URL);
    expect(
      rewriteSutroBlueprintUrl(
        "http://localhost:5173/assets/mountaintops/sutro/sutro-elevation-sgh-s1.png",
      ),
    ).toBe(`http://localhost:5173${SUTRO_ELEVATION_SGM_BLUEPRINT_URL}`);
  });
});

describe("pickElevationReferenceUrl", () => {
  it("prefers absolute trackIT context URL over relative page path", () => {
    expect(
      pickElevationReferenceUrl(
        "/assets/mountaintops/sutro/sutro-elevation-ref.png",
        "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      ),
    ).toBe("https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png");
  });

  it("keeps absolute page URL when present", () => {
    expect(
      pickElevationReferenceUrl(
        "https://cdn.example/tower.png",
        "https://trackit.example/assets/tower.png",
      ),
    ).toBe("https://cdn.example/tower.png");
  });

  it("prefers trackIT context over stale absolute ES host for same mountaintop path", () => {
    expect(
      pickElevationReferenceUrl(
        "https://kgoes.vercel.app/assets/mountaintops/sutro/sutro-elevation-ref.png",
        "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      ),
    ).toBe("https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png");
  });
});

describe("mergeTowerElevationReference", () => {
  it("keeps context blueprint when page detailUrl is a stale silhouette", () => {
    const ctx = {
      url: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      detailUrl: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-sgm.png?v=6",
      imageAspectRatio: SUTRO_ELEVATION_IMAGE_ASPECT,
      detailImageAspectRatio: SUTRO_ELEVATION_BLUEPRINT_ASPECT,
    };
    const merged = mergeTowerElevationReference(
      {
        url: "https://es.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
        detailUrl: "https://es.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      },
      ctx,
    );
    expect(merged?.url).toContain("sutro-elevation-ref.png");
    expect(merged?.detailUrl).toContain("sutro-elevation-sgm.png");
    const blueprint = resolveActiveElevationReference(merged!, "blueprint", {
      siteCode: "SUTRO",
      elevationReferenceImage: ctx,
    } as import("../types").TrackItTowerSiteContext);
    expect(blueprint.url).toBe(ctx.detailUrl);
  });

  it("merges Sutro ref with absolute context URL", () => {
    const merged = mergeTowerElevationReference(
      {
        url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
        imageAspectRatio: 245 / 1024,
      },
      {
        url: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
        label: "Sutro Tower · reference elevation",
      },
    );
    expect(merged?.url).toBe(
      "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
    );
    expect(merged?.label).toBe("Sutro Tower · reference elevation");
  });
});

describe("resolveActiveElevationReference", () => {
  const ref = {
    url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
    detailUrl: "/assets/mountaintops/sutro/sutro-elevation-sgm.png",
    label: "Sutro Tower · reference elevation",
    imageAspectRatio: SUTRO_ELEVATION_IMAGE_ASPECT,
    detailImageAspectRatio: SUTRO_ELEVATION_BLUEPRINT_ASPECT,
    fullBleed: true,
    opacity: 0.85,
    detailOpacity: 0.92,
  };

  it("keeps primary silhouette by default", () => {
    const active = resolveActiveElevationReference(ref, "primary");
    expect(active.url).toContain("sutro-elevation-ref.png");
    expect(active.imageAspectRatio).toBe(SUTRO_ELEVATION_IMAGE_ASPECT);
  });

  it("switches to blueprint detailUrl with its aspect ratio", () => {
    const active = resolveActiveElevationReference(ref, "blueprint");
    expect(active.url).toContain("sutro-elevation-sgm.png");
    expect(active.imageAspectRatio).toBe(SUTRO_ELEVATION_BLUEPRINT_ASPECT);
    expect(active.opacity).toBe(0.92);
    expect(active.label).toContain("blueprint");
  });
});

describe("resolveProfileElevationReference", () => {
  it("falls back to bundled SGH asset for Sutro when pack detailUrl is missing", () => {
    const page = {
      id: "td-1",
      label: "Tower",
      type: "tower-draft" as const,
      towerHeightFtAgl: 977,
      guideBandsFt: [],
      placements: [],
      polylines: [],
      elevationReferenceImage: {
        url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
      },
    };
    const blueprint = resolveProfileElevationReference(page, "blueprint", {
      siteCode: "SUTRO",
      elevationReferenceImage: {
        url: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
      },
    } as import("../types").TrackItTowerSiteContext);
    expect(blueprint?.url).toContain("sutro-elevation-sgm.png");
  });

  it("uses context SGH blueprint even when page only stores silhouette urls", () => {
    const ctx = {
      url: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      detailUrl: "https://trackit.example/assets/mountaintops/sutro/sutro-elevation-sgm.png?v=6",
    };
    const page = {
      id: "td-1",
      label: "Tower",
      type: "tower-draft" as const,
      towerHeightFtAgl: 977,
      guideBandsFt: [],
      placements: [],
      polylines: [],
      elevationReferenceImage: {
        url: "https://es.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
        detailUrl: "https://es.example/assets/mountaintops/sutro/sutro-elevation-ref.png",
      },
    };
    const blueprint = resolveProfileElevationReference(page, "blueprint", {
      siteCode: "SUTRO",
      elevationReferenceImage: ctx,
    } as import("../types").TrackItTowerSiteContext);
    expect(blueprint?.url).toBe(ctx.detailUrl);
    const silhouette = resolveProfileElevationReference(page, "primary", {
      siteCode: "SUTRO",
      elevationReferenceImage: ctx,
    } as import("../types").TrackItTowerSiteContext);
    expect(silhouette?.url).toContain("sutro-elevation-ref.png");
  });
});

describe("canonicalizeElevationReference", () => {
  it("repairs swapped silhouette and blueprint urls on stale pages", () => {
    const fixed = canonicalizeElevationReference({
      url: "/assets/mountaintops/sutro/sutro-elevation-sgm.png",
      detailUrl: "/assets/mountaintops/sutro/sutro-elevation-ref.png",
      imageAspectRatio: SUTRO_ELEVATION_IMAGE_ASPECT,
      detailImageAspectRatio: SUTRO_ELEVATION_BLUEPRINT_ASPECT,
    });
    expect(fixed.url).toContain("sutro-elevation-ref.png");
    expect(fixed.detailUrl).toContain("sutro-elevation-sgm.png");

    const primary = resolveActiveElevationReference(fixed, "primary");
    const blueprint = resolveActiveElevationReference(fixed, "blueprint");
    expect(primary.url).toContain("sutro-elevation-ref.png");
    expect(blueprint.url).toContain("sutro-elevation-sgm.png");
  });
});
