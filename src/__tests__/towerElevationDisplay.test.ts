import { describe, expect, it } from "vitest";
import { formatGuideBandElevationLabel } from "../towerElevationDisplay";

describe("towerElevationDisplay", () => {
  it("formats guide band height in feet even when label stored metric", () => {
    expect(
      formatGuideBandElevationLabel(
        { ftAgl: 800, label: "800 m · upper platform" },
        "imperial",
      ),
    ).toBe("800′ · upper platform");
  });

  it("preserves structural suffix from Sutro-style labels", () => {
    expect(
      formatGuideBandElevationLabel({ ftAgl: 751, label: "751′ · L6 — upper platform" }, "imperial"),
    ).toBe("751′ · L6 — upper platform");
  });

  it("formats major tick heights in feet", () => {
    expect(formatGuideBandElevationLabel({ ftAgl: 244, label: "244 m" }, "imperial")).toBe("244′");
  });
});
