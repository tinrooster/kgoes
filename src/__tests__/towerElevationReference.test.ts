import { describe, expect, it } from "vitest";
import {
  mergeTowerElevationReference,
  pickElevationReferenceUrl,
} from "../towerElevationReference";

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
