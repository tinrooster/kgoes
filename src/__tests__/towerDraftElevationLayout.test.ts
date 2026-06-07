import { describe, expect, it } from "vitest";
import {
  PROFILE_LABEL_AXIS_OFFSET,
  PROFILE_LABEL_MIN_V_SEP,
  profileCalloutLeaderPoints,
  profileLabelXForMount,
  resolveProfilePlacementCallouts,
} from "../towerDraftElevationLayout";

describe("resolveProfilePlacementCallouts", () => {
  const centerX = 280;

  it("nudges mast-mounted labels vertically off the icon", () => {
    const out = resolveProfilePlacementCallouts(
      [{ id: "a", mountX: centerX, mountY: 400, offsetX: 0 }],
      centerX,
      900,
    );
    expect(out.a?.labelX).toBe(centerX + PROFILE_LABEL_AXIS_OFFSET);
    expect(out.a?.labelY).toBeLessThanOrEqual(400 - PROFILE_LABEL_MIN_V_SEP);
  });

  it("keeps labels near the tower axis when device is offset left", () => {
    const mountX = centerX - 88;
    const out = resolveProfilePlacementCallouts(
      [{ id: "a", mountX, mountY: 400, offsetX: -88 }],
      centerX,
      900,
    );
    expect(out.a?.labelX).toBeLessThan(500);
    expect(out.a?.labelX).toBe(centerX + PROFILE_LABEL_AXIS_OFFSET);
  });

  it("stacks labels that share similar heights", () => {
    const out = resolveProfilePlacementCallouts(
      [
        { id: "a", mountX: centerX, mountY: 400, offsetX: 0 },
        { id: "b", mountX: centerX + 10, mountY: 405, offsetX: 10 },
      ],
      centerX,
      900,
    );
    expect(Math.abs(out.b!.labelY - out.a!.labelY)).toBeGreaterThanOrEqual(32);
  });
});

describe("profileLabelXForMount", () => {
  it("does not push labels to the far canvas rail", () => {
    const centerX = 300;
    const x = profileLabelXForMount(centerX - 88, centerX, 1200);
    expect(x).toBeLessThan(600);
  });
});

describe("profileCalloutLeaderPoints", () => {
  it("uses an elbow when label Y differs from mount Y", () => {
    const pts = profileCalloutLeaderPoints(500, 320, 360, 400);
    expect(pts.split(" ").length).toBeGreaterThan(2);
  });
});
