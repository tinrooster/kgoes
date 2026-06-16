import type { DeviceData } from "./types";
import { resolveDeviceTypeCode } from "./housename";

/** True for MDF / main-distribution assembly devices (inline-capable). */
export function isMdfDevice(device: DeviceData): boolean {
  if (device.deviceType === "mdf") return true;
  return resolveDeviceTypeCode(device) === "MDA";
}

/** Port-pair suffix for MDF housename (e.g. 1-29 in TK05 MDA 1-29). */
export function resolveMdfPairLabel(device: DeviceData): string | undefined {
  const explicit = device.mdfPairLabel?.trim();
  if (explicit) return explicit;
  const port = (device.ports ?? []).find((p) => p.direction === "passthrough");
  return port?.label?.trim() || undefined;
}
