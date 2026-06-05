import { describe, expect, it } from "vitest";
import {
  feedTypeFromSignal,
  isTowerCameraDeviceType,
  resolveDefaultTowerFeedType,
  resolveFeedTypeForDevice,
  towerFeedTypeShortLabel,
} from "../towerDraftFeedType";

describe("towerDraftFeedType", () => {
  it("defaults cameras to network_poe", () => {
    expect(resolveDefaultTowerFeedType("outdoor-ptz-camera")).toBe("network_poe");
    expect(towerFeedTypeShortLabel(undefined, "ptz-camera")).toBe("PoE");
  });

  it("labels feed categories", () => {
    expect(towerFeedTypeShortLabel("coax")).toBe("COAX");
    expect(towerFeedTypeShortLabel("network_poe")).toBe("PoE");
    expect(isTowerCameraDeviceType("rf-camera-mount")).toBe(true);
  });

  it("maps edge signals to feed types", () => {
    expect(feedTypeFromSignal("fiber")).toBe("network");
    expect(feedTypeFromSignal("coax")).toBe("coax");
    expect(resolveFeedTypeForDevice(undefined, "eth")).toBe("network");
  });
});
