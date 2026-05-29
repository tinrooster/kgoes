import { describe, it, expect } from "vitest";
import { inferRackForm } from "../rackUtils";
import {
  applyGenericThrowdownDimensionsIfMissing,
  shelfThrowdownDimensionsMissing,
  validateRackDimensions,
} from "../rackMount";
import type { DeviceData } from "../types";

describe("FiDO rack metadata", () => {
  it("community FiDO-4R infers shelf-only from dimensions", () => {
    const device: DeviceData = {
      label: "AJA FiDO-4R",
      deviceType: "converter",
      mountingClass: "shelf",
      rackForm: "shelf-only",
      rackHeightU: 1,
      heightMm: 22,
      widthMm: 117,
      depthMm: 102,
      ports: [],
    };
    expect(inferRackForm(device)).toBe("shelf-only");
  });

  it("flags missing mm when shelf mounting is set", () => {
    const device: DeviceData = {
      label: "Throwdown",
      deviceType: "converter",
      mountingClass: "shelf",
      ports: [],
    };
    expect(shelfThrowdownDimensionsMissing(device)).toBe(true);
    expect(validateRackDimensions(device).some((w) => w.includes("typical throwdown"))).toBe(true);
  });

  it("fills generic throwdown dimensions when footprint is unknown", () => {
    const device: DeviceData = {
      label: "Throwdown",
      deviceType: "converter",
      mountingClass: "shelf",
      ports: [],
    };
    const patch = applyGenericThrowdownDimensionsIfMissing(device);
    expect(patch.widthMm).toBe(117);
    expect(patch.heightMm).toBe(22);
    expect(patch.depthMm).toBe(100);
    expect(patch.rackHeightU).toBe(1);
    expect(shelfThrowdownDimensionsMissing({ ...device, ...patch })).toBe(false);
  });
});
