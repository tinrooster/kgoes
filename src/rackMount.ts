import type { DeviceData, RackDevicePlacement, RackElevationPage } from "./types";
import type { RackForm } from "./rackUtils";
import { MM_PER_U, mmToU } from "./rackUtils";

export type MountingClass =
  | "rack-full"
  | "rack-half"
  | "shelf"
  | "tabletop"
  | "not-rackable";

export type RackMetadataSource = "explicit" | "estimated" | "library";

export interface RackMountSummary {
  heightU: number;
  mountingClass: MountingClass;
  mountingLabel: string;
  source: RackMetadataSource;
  canPlaceInRack: boolean;
  showInRackSidebar: boolean;
}

export const MOUNTING_LABELS: Record<MountingClass, string> = {
  "rack-full": "Full rack",
  "rack-half": "Half rack",
  shelf: "Shelf",
  tabletop: "Tabletop",
  "not-rackable": "Not rackable",
};

export function mountingClassToRackForm(mc: MountingClass): RackForm | "oversize" {
  switch (mc) {
    case "rack-full":
      return "full";
    case "rack-half":
      return "half";
    case "shelf":
      return "shelf-only";
    case "tabletop":
    case "not-rackable":
      return "oversize";
    default:
      return "unknown";
  }
}

export function rackFormToMountingClass(form: RackForm): MountingClass | null {
  switch (form) {
    case "full":
      return "rack-full";
    case "half":
      return "rack-half";
    case "shelf-only":
      return "shelf";
    case "oversize":
      return "not-rackable";
    default:
      return null;
  }
}

function inferMountingClassHeuristic(device: DeviceData): MountingClass | null {
  if (device.deviceType === "adapter" || device.isCableAccessory) return "not-rackable";
  const w = device.widthMm;
  const h = device.heightMm;
  if (w == null && h == null) return null;

  let fitsU = false;
  if (h != null) {
    const u = h / MM_PER_U;
    const nearest = Math.round(u);
    fitsU = Math.abs(u - nearest) < 0.15 && nearest >= 1 && nearest <= 12;
  }

  if (fitsU && w != null && w >= 440 && w <= 510) return "rack-full";
  if (fitsU && w != null && w >= 200 && w <= 260) return "rack-half";
  if (w != null && w > 482) return "not-rackable";
  if (w != null) return "shelf";
  return null;
}

export function resolveMountingClass(device: DeviceData): MountingClass {
  if (device.mountingClass) return device.mountingClass;
  if (device.rackForm) {
    const mapped = rackFormToMountingClass(device.rackForm);
    if (mapped) return mapped;
  }
  return inferMountingClassHeuristic(device) ?? "rack-full";
}

function inferHeightUHeuristic(device: DeviceData): number {
  const portCount = device.ports?.length ?? 0;
  const dt = device.deviceType?.toLowerCase() ?? "";

  if (dt.includes("patch-panel") || dt === "vjf") {
    if (portCount > 48) return 3;
    if (portCount > 32) return 2;
    return 1;
  }
  if (dt.includes("matrix") || dt.includes("router")) {
    return portCount > 32 ? 4 : portCount > 16 ? 3 : 2;
  }
  if (dt.includes("mixing-console") || dt.includes("mixer")) return 3;
  if (dt.includes("amplifier") || dt.includes("amp")) return 2;
  if (dt.includes("power-distribution") || dt.includes("pdu")) return 1;
  if (dt.includes("media-server") || dt.includes("server")) return 2;
  if (dt.includes("network-switch")) return portCount > 24 ? 2 : 1;

  if (portCount <= 8) return 1;
  if (portCount <= 20) return 2;
  if (portCount <= 40) return 3;
  return 4;
}

/** Snap rack U to nearest 0.5U (standard panels are whole U; some gear is 1.5U, etc.). */
export function normalizeRackHeightU(u: number): number {
  return Math.min(60, Math.max(0.5, Math.round(u * 2) / 2));
}

/** Legacy `rackForm` field kept in sync with `mountingClass` for older code paths. */
export function mountingClassToDeviceRackForm(
  mc: MountingClass,
): NonNullable<DeviceData["rackForm"]> | undefined {
  switch (mc) {
    case "rack-full":
      return "full";
    case "rack-half":
      return "half";
    case "shelf":
      return "shelf-only";
    default:
      return undefined;
  }
}

export type RackMetadataPatch = Pick<
  DeviceData,
  "rackHeightU" | "mountingClass" | "rackMetadataSource" | "rackForm" | "heightMm"
>;

/** Build explicit rack metadata for persistence (editor save, batch apply). */
export function buildExplicitRackMetadata(
  rackHeightU: number | undefined,
  mountingClass: MountingClass,
  heightMm?: number,
): RackMetadataPatch {
  const patch: RackMetadataPatch = {
    mountingClass,
    rackMetadataSource: "explicit",
  };
  const rackForm = mountingClassToDeviceRackForm(mountingClass);
  if (rackForm) patch.rackForm = rackForm;
  if (rackHeightU != null && Number.isFinite(rackHeightU)) {
    patch.rackHeightU = normalizeRackHeightU(rackHeightU);
  }
  if (heightMm != null) patch.heightMm = heightMm;
  return patch;
}

/** Identity key for "same device definition" (template or model). */
export function rackDeviceDefinitionKey(data: DeviceData): string | null {
  if (data.templateId) return `tpl:${data.templateId}`;
  const model = data.model ?? data.baseLabel;
  if (model && data.deviceType) return `def:${data.deviceType}:${model}`;
  return null;
}

export function rackMetadataChanged(
  before: DeviceData | undefined,
  rackHeightU: number | undefined,
  mountingClass: MountingClass,
): boolean {
  const nextU = rackHeightU != null && Number.isFinite(rackHeightU) ? normalizeRackHeightU(rackHeightU) : undefined;
  return before?.mountingClass !== mountingClass || before?.rackHeightU !== nextU;
}

/** Authoritative rack U for slot occupancy. */
export function resolveRackHeightU(device: DeviceData): { heightU: number; source: RackMetadataSource } {
  if (device.rackHeightU != null && device.rackHeightU >= 0.5) {
    return {
      heightU: normalizeRackHeightU(device.rackHeightU),
      source: device.rackMetadataSource ?? "explicit",
    };
  }
  if (device.heightMm != null) {
    return { heightU: Math.max(1, mmToU(device.heightMm)), source: "explicit" };
  }
  return { heightU: inferHeightUHeuristic(device), source: "estimated" };
}

export function heightMmFromRackU(rackHeightU: number): number {
  return Math.round(rackHeightU * MM_PER_U);
}

export function getRackMountSummary(device: DeviceData): RackMountSummary {
  const mountingClass = resolveMountingClass(device);
  const { heightU, source } = resolveRackHeightU(device);
  const canPlaceInRack =
    mountingClass !== "tabletop" &&
    mountingClass !== "not-rackable" &&
    mountingClassToRackForm(mountingClass) !== "oversize";

  return {
    heightU,
    mountingClass,
    mountingLabel: MOUNTING_LABELS[mountingClass],
    source,
    canPlaceInRack,
    showInRackSidebar: canPlaceInRack,
  };
}

export function validateRackDimensions(device: DeviceData): string[] {
  const warnings: string[] = [];
  const { heightU } = resolveRackHeightU(device);
  if (device.rackHeightU != null && device.heightMm != null) {
    const fromMm = mmToU(device.heightMm);
    if (Math.abs(fromMm - device.rackHeightU) > 1) {
      warnings.push(`Rack U (${device.rackHeightU}) differs from height mm (~${fromMm}U).`);
    }
  }
  const mc = resolveMountingClass(device);
  if ((mc === "rack-full" || mc === "rack-half") && device.heightMm == null && device.rackHeightU == null) {
    warnings.push(`Set rack U and height mm for accurate ${heightU}U placement.`);
  }
  return warnings;
}

export function normalizePortHandleId(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return handle.replace(/-(in|out|rear|front)$/, "");
}

/** Shelf / throwdown gear mounted in a U slot (not on a shelf accessory). */
export function isShelfThrowdownInSlot(
  device: DeviceData,
  placement: RackDevicePlacement,
): boolean {
  return !placement.mountedOnShelfId && resolveMountingClass(device) === "shelf";
}

/** Half-rack side for elevation rendering (honors placement or auto-splits L/R at same U). */
export function resolveHalfRackSide(
  placement: RackDevicePlacement,
  page: RackElevationPage,
  device: DeviceData,
  deviceDataMap: Map<string, DeviceData>,
): "left" | "right" | undefined {
  if (placement.mountedOnShelfId) return undefined;
  if (placement.halfRackSide) return placement.halfRackSide;
  if (resolveMountingClass(device) !== "rack-half") return undefined;

  const halves = page.placements
    .filter((p) => {
      if (p.rackId !== placement.rackId || p.face !== placement.face || p.mountedOnShelfId) return false;
      if (p.uPosition !== placement.uPosition) return false;
      const dd = deviceDataMap.get(p.deviceNodeId);
      return !!dd && resolveMountingClass(dd) === "rack-half";
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const idx = halves.findIndex((p) => p.id === placement.id);
  if (idx < 0) return "left";
  return idx % 2 === 0 ? "left" : "right";
}

/** Port IDs on a device that have at least one schematic edge attached. */
export function getConnectedPortIds(
  deviceNodeId: string,
  edges: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }[],
): Set<string> {
  const connected = new Set<string>();
  for (const e of edges) {
    if (e.source === deviceNodeId) {
      const pid = normalizePortHandleId(e.sourceHandle);
      if (pid) connected.add(pid);
    }
    if (e.target === deviceNodeId) {
      const pid = normalizePortHandleId(e.targetHandle);
      if (pid) connected.add(pid);
    }
  }
  return connected;
}
