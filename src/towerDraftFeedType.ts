import type { DeviceData, SignalType, TowerDeviceFeedType } from "./types";

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

const STROKE_COLOR: Record<TowerDeviceFeedType, string> = {
  coax: "#64748b",
  waveguide: "#d97706",
  network: "#2563eb",
  network_poe: "#059669",
};

/** Canvas stroke color per feed category. */
export function feedlineStrokeColor(feedType?: TowerDeviceFeedType): string {
  if (!feedType) return "var(--ti-faint)";
  return STROKE_COLOR[feedType];
}

/** Dashed vs dotted by feed type (waveguide = dotted on canvas). */
export function feedlineStrokeDash(feedType?: TowerDeviceFeedType): string | undefined {
  if (feedType === "waveguide") return "2 4";
  return undefined;
}

/** Map schematic edge / port signal to tower feed category. */
export function feedTypeFromSignal(signal?: SignalType | string): TowerDeviceFeedType | undefined {
  if (!signal) return undefined;
  const s = String(signal).toLowerCase();
  if (s.includes("waveguide") || s === "wg") return "waveguide";
  if (s.includes("poe")) return "network_poe";
  if (
    s.includes("fiber") ||
    s.includes("eth") ||
    s.includes("network") ||
    s.includes("sdi") ||
    s.includes("ip") ||
    s.includes("hdmi") ||
    s.includes("aes")
  ) {
    return "network";
  }
  if (s.includes("coax") || s.includes("rf") || s === "if" || s.includes("ifb")) return "coax";
  return undefined;
}

/** Resolved feed category for a tower device (metadata → edge → device-type default). */
export function resolveFeedTypeForDevice(
  data: DeviceData | undefined,
  edgeSignal?: SignalType | string,
): TowerDeviceFeedType {
  if (data?.rfInstallation?.feedType) return data.rfInstallation.feedType;
  const fromEdge = feedTypeFromSignal(edgeSignal);
  if (fromEdge) return fromEdge;
  return resolveDefaultTowerFeedType(data?.deviceType) ?? "coax";
}
