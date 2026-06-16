import type { DeviceData, MdfDisplayMode, Port } from "./types";

const MDF_PANEL_CODE = /^MD[A-Z]+$/i;

/** True for MDF / main-distribution panel devices (inline-capable). */
export function isMdfDevice(device: DeviceData): boolean {
  if (device.deviceType === "mdf") return true;
  const code = device.deviceTypeCode?.trim();
  return !!code && MDF_PANEL_CODE.test(code);
}

export function isMdfPanelTypeCode(code: string | undefined): boolean {
  if (!code?.trim()) return false;
  return MDF_PANEL_CODE.test(code.trim());
}

/** Port-pair suffix for MDF housename (e.g. 1-29 in TK05 MDA 1-29). Omitted for multi-pair panels. */
export function resolveMdfPairLabel(device: DeviceData): string | undefined {
  const explicit = device.mdfPairLabel?.trim();
  if (explicit) return explicit;
  const passthrough = (device.ports ?? []).filter((p) => p.direction === "passthrough");
  if (passthrough.length === 1) return passthrough[0].label?.trim() || undefined;
  return undefined;
}

/** True when MDF device is a multi-pair panel (block mode), not a single inline pair. */
export function isMdfMultiPairPanel(device: DeviceData): boolean {
  if (!isMdfDevice(device)) return false;
  return (device.ports ?? []).filter((p) => p.direction === "passthrough").length > 1;
}

export function mdfPassthroughIsConnected(
  portId: string,
  connectedHandles: Set<string>,
): boolean {
  return connectedHandles.has(`${portId}-rear`) || connectedHandles.has(`${portId}-front`);
}

/** Passthrough ports with at least one cable attached (rear or front). */
export function connectedMdfPassthroughPorts(
  device: DeviceData,
  connectedHandles: Set<string>,
): Port[] {
  return (device.ports ?? []).filter(
    (p) => p.direction === "passthrough" && mdfPassthroughIsConnected(p.id, connectedHandles),
  );
}

/** Per-device override, then schematic-wide default. */
export function resolveEffectiveMdfDisplayMode(
  device: DeviceData,
  schematicDefault: MdfDisplayMode,
): MdfDisplayMode {
  return device.mdfDisplayMode ?? schematicDefault;
}

export function shouldRenderMdfInline(
  data: DeviceData,
  schematicDefault: MdfDisplayMode,
): boolean {
  if (!isMdfDevice(data)) return false;
  return resolveEffectiveMdfDisplayMode(data, schematicDefault) === "inline";
}
