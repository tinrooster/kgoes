import type { DeviceData, Port, SignalType } from "./types";
import { mdfPanelCircuits } from "./devices/mdf";
import { isMdfDevice } from "./mdfDisplay";

const PAIR_LABEL_RE = /^Pair\s*(\d+)$/i;

export const MDF_ELEMENTS_CATEGORY = "MDF Elements";

/** Infer row × port grid from passthrough count (CAD panel sizes). */
export function inferMdfGrid(passthroughCount: number): { rows: number; portsPerRow: number } {
  if (passthroughCount <= 1) return { rows: 1, portsPerRow: 1 };
  if (passthroughCount === 12) return { rows: 2, portsPerRow: 6 };
  if (passthroughCount === 24) return { rows: 2, portsPerRow: 12 };
  const portsPerRow = Math.min(12, passthroughCount);
  const rows = Math.ceil(passthroughCount / portsPerRow);
  return { rows, portsPerRow };
}

export function resolveMdfLayout(device: DeviceData): { rows: number; portsPerRow: number } {
  const passthrough = (device.ports ?? []).filter((p) => p.direction === "passthrough");
  if (device.mdfRows != null && device.mdfPortsPerRow != null) {
    return { rows: device.mdfRows, portsPerRow: device.mdfPortsPerRow };
  }
  return inferMdfGrid(passthrough.length || 1);
}

/** Row-port label from 1-based pair index (row-major). */
export function mdfRowPortLabel(pairIndex: number, portsPerRow: number): string {
  const row = Math.floor((pairIndex - 1) / portsPerRow) + 1;
  const col = ((pairIndex - 1) % portsPerRow) + 1;
  return `${row}-${col}`;
}

export function normalizeMdfPortLabel(
  label: string | undefined,
  pairIndex: number,
  portsPerRow: number,
): string {
  const trimmed = label?.trim() ?? "";
  const m = PAIR_LABEL_RE.exec(trimmed);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) {
      return mdfRowPortLabel(n, portsPerRow);
    }
  }
  if (trimmed) return trimmed;
  return mdfRowPortLabel(pairIndex, portsPerRow);
}

export function mdfConnectorForSignal(signalType: SignalType): Port["connectorType"] {
  switch (signalType) {
    case "sdi":
      return "bnc";
    case "ethernet":
      return "rj45";
    case "analog-audio":
    case "aes":
      return "xlr-3";
    default:
      return "other";
  }
}

export function resolveMdfSignalType(device: DeviceData): SignalType {
  if (device.mdfSignalType) return device.mdfSignalType;
  const passthrough = (device.ports ?? []).find((p) => p.direction === "passthrough");
  return (passthrough?.signalType as SignalType) ?? "custom";
}

/** Label shown on canvas / in editor (migrates legacy Pair N on read). */
export function displayMdfPortLabel(
  device: DeviceData,
  port: Port,
  pairIndex: number,
): string {
  const { portsPerRow } = resolveMdfLayout(device);
  return normalizeMdfPortLabel(port.label, pairIndex, portsPerRow);
}

export function deviceHasLegacyMdfPairLabels(device: DeviceData): boolean {
  if (!isMdfDevice(device)) return false;
  return (device.ports ?? []).some(
    (p) => p.direction === "passthrough" && PAIR_LABEL_RE.test(p.label?.trim() ?? ""),
  );
}

/** Rewrite passthrough port labels to row-port; preserve port ids for wiring. */
export function migrateMdfDevicePorts(device: DeviceData): DeviceData {
  if (!isMdfDevice(device) || !deviceHasLegacyMdfPairLabels(device)) return device;

  const layout = resolveMdfLayout(device);
  let pairIndex = 0;
  const ports = (device.ports ?? []).map((p) => {
    if (p.direction !== "passthrough") return p;
    pairIndex += 1;
    const label = normalizeMdfPortLabel(p.label, pairIndex, layout.portsPerRow);
    return {
      ...p,
      label,
      section: `Row ${Math.floor((pairIndex - 1) / layout.portsPerRow) + 1}`,
    };
  });

  let mdfPairLabel = device.mdfPairLabel?.trim();
  if (mdfPairLabel && PAIR_LABEL_RE.test(mdfPairLabel)) {
    const n = parseInt(PAIR_LABEL_RE.exec(mdfPairLabel)![1], 10);
    mdfPairLabel = mdfRowPortLabel(n, layout.portsPerRow);
  }

  return {
    ...device,
    ports,
    mdfRows: layout.rows,
    mdfPortsPerRow: layout.portsPerRow,
    ...(mdfPairLabel ? { mdfPairLabel } : {}),
  };
}

/** Rebuild passthrough grid; keeps existing port ids by index so edges stay attached. */
export function rebuildMdfPassthroughPorts(
  existing: Port[],
  rows: number,
  portsPerRow: number,
  signalType: SignalType,
): Port[] {
  const connector = mdfConnectorForSignal(signalType);
  const templatePorts = mdfPanelCircuits(rows, portsPerRow, {
    signalType,
    rearConnectorType: connector,
    frontConnectorType: connector,
  });
  const oldPassthrough = existing.filter((p) => p.direction === "passthrough");
  const other = existing.filter((p) => p.direction !== "passthrough");

  const rebuilt = templatePorts.map((tpl, i) => {
    const prev = oldPassthrough[i];
    return {
      ...tpl,
      id: prev?.id ?? tpl.id,
      inheritsSignal: prev?.inheritsSignal ?? tpl.inheritsSignal,
    };
  });

  return [...other, ...rebuilt];
}
