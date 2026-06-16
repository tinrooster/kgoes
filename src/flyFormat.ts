import type { DeviceData, FlyDirection, FlyEndpointData, Port, SignalType } from "./types";
import { composeHousename, resolveDeviceTypeCode } from "./housename";

export const FLY_W_EST = 280;
export const FLY_H_EST = 22;
export const FLY_GAP = 64;

export function composeFlyDesignation(device: DeviceData): string {
  if (device.designation?.trim()) return device.designation.trim();
  const typeCode = resolveDeviceTypeCode(device);
  const rackCode = device.rackLocation?.trim();
  if (rackCode || typeCode) {
    return composeHousename({ rackCode, typeCode });
  }
  return device.label?.trim() || "DEVICE";
}

export function composeFlyNotation(port: Port): string {
  const dir =
    port.direction === "input" ? "IN" : port.direction === "output" ? "OUT" : "IO";
  const label = port.label?.trim();
  return label ? `${dir} ${label}` : dir;
}

/** CAD-style fly strip text for rack / transmission drawings. */
export function formatFlyEndpointLabel(data: FlyEndpointData): string {
  const remote = data.remoteDwgNumber.trim();
  const designation = data.designation.trim();
  const notation = data.notation.trim();
  const remoteDes = data.remoteDesignation?.trim();
  const remoteNote = data.remoteNotation?.trim();

  if (data.direction === "in") {
    const left = [remote, remoteDes, remoteNote].filter(Boolean).join(" ");
    const right = [designation, notation].filter(Boolean).join(" ");
    return `${left} ------> ${right}`.trim();
  }

  const left = [designation, notation].filter(Boolean).join(" ");
  const right = [remote, remoteDes, remoteNote].filter(Boolean).join(" ");
  return `------> ${left}${right ? ` ${right}` : ""}`.trim();
}

export function validateFlyEndpoint(data: FlyEndpointData): string[] {
  const issues: string[] = [];
  if (!data.remoteDwgNumber.trim()) issues.push("Remote drawing number is required");
  if (!data.designation.trim() && data.direction === "out") {
    issues.push("Local designation (housename) is recommended for fly-off");
  }
  if (data.direction === "in" && !data.remoteDesignation?.trim()) {
    issues.push("Remote designation is recommended for fly-in");
  }
  return issues;
}

export function defaultFlyEndpointData(opts: {
  direction: FlyDirection;
  signalType: SignalType;
  device: DeviceData;
  port: Port;
  trackItDwgNumber?: string;
}): FlyEndpointData {
  const { direction, signalType, device, port, trackItDwgNumber } = opts;
  return {
    direction,
    signalType,
    designation: composeFlyDesignation(device),
    notation: composeFlyNotation(port),
    remoteDwgNumber: trackItDwgNumber ?? "",
    deviceNodeId: undefined,
    portId: undefined,
  };
}

export function defaultFlyPlacement(
  handlePos: { x: number; y: number },
  portSide: "left" | "right",
): { pos: { x: number; y: number }; handle: "l" | "r" } {
  if (portSide === "right") {
    return {
      pos: { x: handlePos.x + FLY_GAP, y: handlePos.y - FLY_H_EST / 2 },
      handle: "l",
    };
  }
  return {
    pos: { x: handlePos.x - FLY_GAP - FLY_W_EST, y: handlePos.y - FLY_H_EST / 2 },
    handle: "r",
  };
}
