import { describe, expect, it } from "vitest";
import { mergeRackElevationViewportOptions } from "../rackElevationViewportUtils";

describe("mergeRackElevationViewportOptions", () => {
  it("includes overview, row presets, and per-rack entries for a 2-row site", () => {
    const racks = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i + 1}`,
      label: `Rack ${i + 1}`,
      heightU: 42,
      position: { x: (i % 6) * 320, y: Math.floor(i / 6) * 1200 },
    }));
    const options = mergeRackElevationViewportOptions([], racks);
    expect(options[0].id).toBe("overview");
    expect(options.some((o) => o.id === "top-row")).toBe(true);
    expect(options.some((o) => o.id === "bottom-row")).toBe(true);
    expect(options.filter((o) => o.fit === "rack")).toHaveLength(12);
  });
});
