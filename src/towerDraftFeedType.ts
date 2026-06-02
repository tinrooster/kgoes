import type { TowerDeviceFeedType } from "./types";

export const TOWER_FEED_TYPE_OPTIONS: { value: TowerDeviceFeedType; label: string }[] = [
  { value: "coax", label: "Coax" },
  { value: "waveguide", label: "Waveguide" },
  { value: "network", label: "Network" },
  { value: "network_poe", label: "Network / PoE" },
];

const SHORT_LABEL: Record<TowerDeviceFeedType, string> = {
  coax: "COAX",
  waveguide: "WG",
  network: "NET",
  network_poe: "PoE",
};

export function isTowerCameraDeviceType(deviceType?: string): boolean {
  if (!deviceType) return false;
  const d = deviceType.toLowerCase();
  return d.includes("camera") || d === "outdoor-ptz-camera" || d === "ptz-camera";
}

/** Default feed category when none is stored on the device. */
export function resolveDefaultTowerFeedType(
  deviceType?: string,
  existing?: TowerDeviceFeedType,
): TowerDeviceFeedType | undefined {
  if (existing) return existing;
  if (isTowerCameraDeviceType(deviceType)) return "network_poe";
  if (deviceType?.includes("microwave")) return "waveguide";
  return undefined;
}

export function towerFeedTypeShortLabel(
  feedType: TowerDeviceFeedType | undefined,
  deviceType?: string,
): string {
  const resolved = feedType ?? resolveDefaultTowerFeedType(deviceType);
  if (!resolved) return "COAX";
  return SHORT_LABEL[resolved];
}
