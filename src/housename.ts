import { resolveRackDesignation } from "./rackDesignation";
import { isMdfDevice, isMdfPanelTypeCode, resolveMdfPairLabel } from "./mdfDisplay";
import { inferRackHeightU } from "./rackUtils";
import type {
  DeviceData,
  RackData,
  RackDevicePlacement,
  RackElevationPage,
  SchematicNode,
  SchematicPage,
} from "./types";

/**
 * CAD plant drawing housename type codes (abbreviation column).
 * @see AutoCAD DEVICE TYPES block in plant drawing standards.
 */
export const HOUSENAME_CODE_TO_LABEL: Record<string, string> = {
  RSW: "VIDEO ROUTER",
  MXR: "PRODUCTION AUDIO MIXER",
  SWR: "PRODUCTION VIDEO SWITCHER",
  ESW: "ETHERNET SWITCH",
  FW: "FIREWALL",
  VJF: "VIDEO JACK FIELD",
  EJF: "ETHERNET JACK FIELD",
  EWJ: "ETHERNET WALL JACK",
  MON: "MONITOR",
  QC: "QC STATION",
  MIP: "MULTI IMAGE PROCESSOR",
  QUAD: "QUAD SPLIT",
  RX: "RECEIVER",
  TX: "TRANSMITTER",
  DEC: "DECODER",
  ENC: "ENCODER",
  FS: "FRAME SYNC",
  DA: "VIDEO DISTRIBUTION AMPLIFIER",
  MDA: "MAIN DISTRIBUTION PANEL A",
  MDB: "MAIN DISTRIBUTION PANEL B",
  MDC: "MAIN DISTRIBUTION PANEL C",
  MDD: "MAIN DISTRIBUTION PANEL D",
  MDE: "MAIN DISTRIBUTION PANEL E",
  MDF: "MAIN DISTRIBUTION PANEL F",
  CONV: "SIGNAL CONVERTER",
  "D/A": "DIGITAL TO ANALOG CONVERTER",
  "A/D": "ANALOG TO DIGITAL CONVERTER",
};

/** ES deviceType slug → CAD housename abbreviation. */
export const DEVICE_TYPE_TO_HOUSENAME: Record<string, string> = {
  da: "DA",
  "distribution-amplifier": "DA",
  "hdmi-splitter": "DA",
  "video-wall-controller": "QUAD",
  router: "RSW",
  "network-router": "RSW",
  switcher: "SWR",
  "network-switch": "ESW",
  "ndi-encoder": "ENC",
  "streaming-encoder": "ENC",
  "video-encoder": "ENC",
  "ip-encoder-gateway": "ENC",
  codec: "ENC",
  "ndi-decoder": "DEC",
  monitor: "MON",
  tv: "MON",
  display: "MON",
  "video-scope": "MON",
  "studio-monitor": "MON",
  "rf-transmitter": "TX",
  "iem-transmitter": "TX",
  "fiber-transmitter": "TX",
  "wireless-video": "TX",
  "rf-receiver": "RX",
  "wireless-mic-receiver": "RX",
  "eng-receiver-ird": "RX",
  "frame-sync": "FS",
  multiviewer: "MIP",
  converter: "CONV",
  scaler: "CONV",
  "audio-mixer": "MXR",
  "power-mixer": "MXR",
  "patch-panel": "VJF",
  "wall-plate": "EWJ",
  "audio-embedder": "A/D",
  "audio-interface": "A/D",
  "audio-dsp": "CONV",
  recorder: "ENC",
  "media-server": "ENC",
  "presentation-system": "SWR",
  "video-bar": "ENC",
};

/** Sorted CAD type codes for housename picker (Installation setup). */
export const HOUSENAME_TYPE_CODES: string[] = Object.keys(HOUSENAME_CODE_TO_LABEL).sort();

/** Position letters for devices placed above the main A–Z cluster. */
export const ABOVE_CLUSTER_SLOTS = ["X", "Y", "Z"] as const;

export function isAboveClusterSlot(slot: string): boolean {
  return (ABOVE_CLUSTER_SLOTS as readonly string[]).includes(slot.trim().toUpperCase());
}

export interface HousenameComposeInput {
  rackCode?: string;
  /** Frame/slot text merged after rack code (e.g. FR1 SL9/10). */
  frameSlot?: string;
  typeCode?: string;
  /** When undefined, position letter is omitted (schematic-only / no rack placement). */
  positionIndex?: number;
  /** Stable slot letter (A, B, X, …) — takes precedence over positionIndex. */
  positionSlot?: string;
  /** When true, expand type code to full CAD label. Default false (TD05 SWR A). */
  expandTypeLabel?: boolean;
}

export interface DeviceRackContext {
  pageId: string;
  page: RackElevationPage;
  rack: RackData;
  placement: RackDevicePlacement;
}

export interface HousenameState {
  nodes: SchematicNode[];
  pages: SchematicPage[];
}

export interface HousenamePatch extends Partial<DeviceData> {
  designation?: string;
  deviceTypeCode?: string;
  rackLocation?: string;
  housenameSlot?: string;
}

export interface RecomputeHousenameOpts {
  pageId?: string;
  rackId?: string;
  deviceNodeIds?: string[];
}

/** True when rack label is a plant facility code (TD15, TC-03) rather than a generic name (Rack 3). */
export function isPlantStyleRackLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  if (/^rack\s+\d+$/i.test(t)) return false;
  const compact = t.replace(/[\s_-]+/g, "").toUpperCase();
  if (/^[A-Z]{1,6}\d{1,4}[A-Z]?$/.test(compact)) return true;
  if (/^[A-Z]{2,6}-\d{1,3}$/.test(t.toUpperCase())) return true;
  return false;
}

/**
 * Rack code for housename composition.
 * Prefers plant-style rack.label (e.g. TD15 after elevation rename) over stale auto designation (RACK01).
 */
export function resolveHousenameRackCode(
  rack: RackData | undefined,
  device?: DeviceData,
): string | undefined {
  if (rack) {
    const label = rack.label?.trim();
    if (label && isPlantStyleRackLabel(label)) {
      return label.toUpperCase().replace(/\s+/g, " ").trim();
    }
    const designation = rack.designation?.trim();
    if (designation) return designation.toUpperCase();
    if (label) return resolveRackDesignation(rack);
  }
  return device?.rackLocation?.trim() || undefined;
}

/** Expand CAD abbreviation to full device type label for long housename strings. */
export function resolveHousenameTypeLabel(typeCode: string | undefined): string | undefined {
  if (!typeCode?.trim()) return undefined;
  const code = typeCode.trim().toUpperCase();
  return HOUSENAME_CODE_TO_LABEL[code] ?? code;
}

/** 0 → A, 1 → B, … 25 → Z, 26 → AA. */
export function positionLetter(index: number): string {
  if (index < 0) return "A";
  let n = index;
  let result = "";
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

export function resolveDeviceTypeCode(device: DeviceData): string | undefined {
  const explicit = device.deviceTypeCode?.trim();
  if (explicit) return explicit.toUpperCase();
  const slug = device.deviceType?.trim();
  if (!slug || slug === "mdf") return undefined;
  return DEVICE_TYPE_TO_HOUSENAME[slug]?.toUpperCase();
}

/** True when no CAD housename type code can be resolved — user should pick one in Installation setup. */
export function housenameNeedsTypeSetup(device: DeviceData): boolean {
  return !resolveDeviceTypeCode(device);
}

/** Normalize frame/slot for housename (FRAME 1 SLOT 3/4 → FR1 SL3/4). */
export function formatFrameSlotForHousename(frameSlot?: string): string | undefined {
  const raw = frameSlot?.trim();
  if (!raw) return undefined;
  if (/^FR\d/i.test(raw)) return raw.toUpperCase();
  const m = raw.match(/frame\s*(\d+)\s*(?:slot\s*)?([\d/]+)/i);
  if (m) return `FR${m[1]} SL${m[2]}`.toUpperCase();
  return raw.toUpperCase();
}

/** Compose housename: rack + optional frame/slot + type + optional position letter. */
export function composeHousename(input: HousenameComposeInput): string {
  const rackCode = input.rackCode?.trim();
  const typeCode = input.typeCode?.trim().toUpperCase();
  const expand = input.expandTypeLabel === true;
  const parts: string[] = [];
  if (rackCode) parts.push(rackCode);
  const framePart = formatFrameSlotForHousename(input.frameSlot);
  if (framePart) parts.push(framePart);
  if (typeCode) {
    parts.push(expand ? (resolveHousenameTypeLabel(typeCode) ?? typeCode) : typeCode);
  }
  if (parts.length === 0) return "";
  if (input.positionSlot?.trim()) {
    parts.push(input.positionSlot.trim().toUpperCase());
  } else if (input.positionIndex != null && input.positionIndex >= 0) {
    parts.push(positionLetter(input.positionIndex));
  }
  return parts.join(" ");
}

function appendMdfPairLabel(base: string, device: DeviceData): string {
  const pair = resolveMdfPairLabel(device);
  if (!pair) return base;
  const trimmed = base.trim();
  if (trimmed.toUpperCase().endsWith(pair.toUpperCase())) return trimmed;
  return trimmed ? `${trimmed} ${pair}` : pair;
}

export interface LiveHousenameResult {
  text: string;
  /** Has rack + type; position letter when rack-placed. */
  complete: boolean;
  needsTypeSetup: boolean;
}

/** Live housename for canvas display — reflects current rack rename / placement without stale stored designation. */
export function resolveLiveDeviceHousename(
  deviceNodeId: string,
  device: DeviceData,
  state: HousenameState,
): LiveHousenameResult {
  if (device.designationLocked && device.designation?.trim()) {
    return {
      text: device.designation.trim(),
      complete: true,
      needsTypeSetup: false,
    };
  }

  const typeCode = resolveDeviceTypeCode(device);
  const needsTypeSetup = housenameNeedsTypeSetup(device);
  const ctx = findDeviceRackContext(deviceNodeId, state.pages);
  const rackCode = resolveRackCodeForDevice(ctx, device);
  const deviceDataMap = buildDeviceDataMap(state.nodes);

  if (isMdfDevice(device)) {
    const panelCode = resolveMdfPanelTypeCode(deviceNodeId, device, ctx, deviceDataMap);
    const base = composeHousename({
      rackCode,
      frameSlot: device.frameSlot,
      typeCode: panelCode,
      expandTypeLabel: false,
    });
    const text =
      appendMdfPairLabel(base, device) ||
      device.designation?.trim() ||
      device.rackLocation?.trim() ||
      "";
    return {
      text,
      complete: !!(rackCode && panelCode && (!resolveMdfPairLabel(device) || resolveMdfPairLabel(device))),
      needsTypeSetup: false,
    };
  }

  const positionSlot =
    ctx && typeCode
      ? resolvePositionSlot(deviceNodeId, device, ctx, deviceDataMap)
      : undefined;

  const text =
    composeHousename({
      rackCode,
      frameSlot: device.frameSlot,
      typeCode,
      positionSlot,
      expandTypeLabel: false,
    }) ||
    device.designation?.trim() ||
    device.rackLocation?.trim() ||
    "";

  const complete = !!(rackCode && typeCode && (!ctx || positionSlot));

  return { text, complete, needsTypeSetup };
}

export function findDeviceRackContext(
  deviceNodeId: string,
  pages: SchematicPage[],
): DeviceRackContext | undefined {
  let best: DeviceRackContext | undefined;

  for (const page of pages) {
    if (page.type !== "rack-elevation") continue;
    const elev = page as RackElevationPage;
    const candidates = elev.placements.filter((p) => p.deviceNodeId === deviceNodeId);
    for (const placement of candidates) {
      const rack = elev.racks.find((r) => r.id === placement.rackId);
      if (!rack) continue;
      const ctx: DeviceRackContext = { pageId: page.id, page: elev, rack, placement };
      if (!best) {
        best = ctx;
        continue;
      }
      const faceScore = (p: RackDevicePlacement) => (p.face === "front" ? 0 : 1);
      const bestScore = faceScore(best.placement);
      const candScore = faceScore(placement);
      if (candScore < bestScore) {
        best = ctx;
        continue;
      }
      if (candScore === bestScore && placement.uPosition < best.placement.uPosition) {
        best = ctx;
      }
    }
  }

  return best;
}

export function resolveRackCodeForDevice(ctx: DeviceRackContext | undefined, device: DeviceData): string | undefined {
  return resolveHousenameRackCode(ctx?.rack, device);
}

function buildDeviceDataMap(nodes: SchematicNode[]): Map<string, DeviceData> {
  const map = new Map<string, DeviceData>();
  for (const n of nodes) {
    if (n.type === "device") map.set(n.id, n.data as DeviceData);
  }
  return map;
}

export function computePositionIndex(
  rackId: string,
  typeCode: string,
  deviceNodeId: string,
  page: RackElevationPage,
  deviceDataMap: Map<string, DeviceData>,
): number | undefined {
  const normalizedType = typeCode.trim().toUpperCase();
  const sameTypePlacements = page.placements
    .filter((p) => {
      if (p.rackId !== rackId) return false;
      const data = deviceDataMap.get(p.deviceNodeId);
      if (!data) return false;
      return resolveDeviceTypeCode(data) === normalizedType;
    })
    .sort((a, b) => a.uPosition - b.uPosition || a.deviceNodeId.localeCompare(b.deviceNodeId));

  const idx = sameTypePlacements.findIndex((p) => p.deviceNodeId === deviceNodeId);
  return idx >= 0 ? idx : undefined;
}

function placementTopU(placement: RackDevicePlacement, device: DeviceData | undefined): number {
  const hU = device ? inferRackHeightU(device) : 1;
  return placement.uPosition + hU - 1;
}

/** Assign or return stable housename slot letter for a rack-placed device. */
export function assignHousenameSlot(
  deviceNodeId: string,
  device: DeviceData,
  ctx: DeviceRackContext,
  deviceDataMap: Map<string, DeviceData>,
): string | undefined {
  const existing = device.housenameSlot?.trim().toUpperCase();
  if (existing) return existing;

  const typeCode = resolveDeviceTypeCode(device);
  if (!typeCode) return undefined;

  const page = ctx.page;
  const rackId = ctx.rack.id;
  const normalizedType = typeCode.trim().toUpperCase();
  const myU = ctx.placement.uPosition;

  const peers = page.placements
    .filter((p) => {
      if (p.rackId !== rackId) return false;
      const data = deviceDataMap.get(p.deviceNodeId);
      if (!data) return false;
      return resolveDeviceTypeCode(data) === normalizedType;
    })
    .map((p) => {
      const data = deviceDataMap.get(p.deviceNodeId)!;
      return {
        deviceNodeId: p.deviceNodeId,
        uPosition: p.uPosition,
        slot: data.housenameSlot?.trim().toUpperCase(),
        topU: placementTopU(p, data),
      };
    });

  const others = peers.filter((p) => p.deviceNodeId !== deviceNodeId);
  const usedAZ = new Set(
    others.filter((p) => p.slot && !isAboveClusterSlot(p.slot)).map((p) => p.slot!),
  );
  const usedXZ = new Set(
    others.filter((p) => p.slot && isAboveClusterSlot(p.slot)).map((p) => p.slot!),
  );

  const clusterMaxU = others
    .filter((p) => p.slot && !isAboveClusterSlot(p.slot))
    .reduce((max, p) => Math.max(max, p.uPosition), 0);
  const peerMaxU = others.reduce((max, p) => Math.max(max, p.uPosition), 0);
  const effectiveClusterMaxU = clusterMaxU > 0 ? clusterMaxU : peerMaxU;

  if (effectiveClusterMaxU > 0 && myU > effectiveClusterMaxU) {
    for (const letter of ABOVE_CLUSTER_SLOTS) {
      if (!usedXZ.has(letter)) return letter;
    }
    return ABOVE_CLUSTER_SLOTS[0];
  }

  for (let i = 0; i < 26; i++) {
    const letter = positionLetter(i);
    if (!usedAZ.has(letter)) return letter;
  }
  return positionLetter(usedAZ.size);
}

/** Resolve position suffix for housename (stable slot or newly assigned). */
export function resolvePositionSlot(
  deviceNodeId: string,
  device: DeviceData,
  ctx: DeviceRackContext,
  deviceDataMap: Map<string, DeviceData>,
): string | undefined {
  const existing = device.housenameSlot?.trim().toUpperCase();
  if (existing) return existing;

  const typeCode = resolveDeviceTypeCode(device);
  if (!typeCode) return undefined;

  const normalizedType = typeCode.trim().toUpperCase();
  const rackId = ctx.rack.id;
  const hasPersistedSlot = ctx.page.placements.some((p) => {
    if (p.rackId !== rackId) return false;
    const data = deviceDataMap.get(p.deviceNodeId);
    return data && resolveDeviceTypeCode(data) === normalizedType && data.housenameSlot?.trim();
  });

  if (!hasPersistedSlot) {
    const idx = computePositionIndex(rackId, normalizedType, deviceNodeId, ctx.page, deviceDataMap);
    return idx != null ? positionLetter(idx) : undefined;
  }

  return assignHousenameSlot(deviceNodeId, device, ctx, deviceDataMap);
}

/** True when same-type devices in a rack have non-contiguous A–Z slot letters (after a delete). */
export function rackHasHousenameSlotGaps(
  page: RackElevationPage,
  rackId: string,
  typeCode: string,
  deviceDataMap: Map<string, DeviceData>,
): boolean {
  const normalizedType = typeCode.trim().toUpperCase();
  const slots = page.placements
    .filter((p) => {
      if (p.rackId !== rackId) return false;
      const data = deviceDataMap.get(p.deviceNodeId);
      if (!data?.housenameSlot?.trim()) return false;
      return resolveDeviceTypeCode(data) === normalizedType;
    })
    .map((p) => deviceDataMap.get(p.deviceNodeId)!.housenameSlot!.trim().toUpperCase())
    .filter((s) => !isAboveClusterSlot(s));

  if (slots.length < 2) return false;
  const indices = slots
    .map((s) => {
      if (s.length === 1 && s >= "A" && s <= "Z") return s.charCodeAt(0) - 65;
      return -1;
    })
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length < 2) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] - indices[i - 1] > 1) return true;
  }
  return false;
}

/** Rack ordinal → panel code: 0 → MDA, 1 → MDB, 2 → MDC (top-down in rack). */
export function mdfPanelTypeCode(positionIndex: number): string {
  return `MD${positionLetter(positionIndex)}`;
}

/**
 * MDF panel ordinal in rack — top-down (highest U = MDA, next = MDB, …).
 * Unlike switchers (bottom-up A/B/C), MD panels enumerate from the top of the rack.
 */
export function computeMdfPanelPositionIndex(
  rackId: string,
  deviceNodeId: string,
  page: RackElevationPage,
  deviceDataMap: Map<string, DeviceData>,
): number | undefined {
  const mdfPlacements = page.placements
    .filter((p) => {
      if (p.rackId !== rackId) return false;
      const data = deviceDataMap.get(p.deviceNodeId);
      return data && isMdfDevice(data);
    })
    .sort((a, b) => b.uPosition - a.uPosition || a.deviceNodeId.localeCompare(b.deviceNodeId));

  const idx = mdfPlacements.findIndex((p) => p.deviceNodeId === deviceNodeId);
  return idx >= 0 ? idx : undefined;
}

export function resolveMdfPanelTypeCode(
  deviceNodeId: string,
  device: DeviceData,
  ctx: DeviceRackContext | undefined,
  deviceDataMap: Map<string, DeviceData>,
): string {
  if (ctx) {
    const idx = computeMdfPanelPositionIndex(
      ctx.rack.id,
      deviceNodeId,
      ctx.page,
      deviceDataMap,
    );
    if (idx != null) return mdfPanelTypeCode(idx);
  }
  const explicit = device.deviceTypeCode?.trim().toUpperCase();
  if (explicit && isMdfPanelTypeCode(explicit)) return explicit;
  return "MDA";
}

export function composeHousenameForDevice(
  deviceNodeId: string,
  state: HousenameState,
): HousenamePatch | null {
  const node = state.nodes.find((n) => n.id === deviceNodeId && n.type === "device");
  if (!node) return null;

  const device = node.data as DeviceData;
  if (device.designationLocked) return null;

  const typeCode = resolveDeviceTypeCode(device);
  const ctx = findDeviceRackContext(deviceNodeId, state.pages);
  const rackCode = resolveRackCodeForDevice(ctx, device);

  const patch: HousenamePatch = {};
  if (ctx && rackCode) patch.rackLocation = rackCode;

  if (!typeCode) {
    const stale = device.designation?.trim();
    if (stale && rackCode && stale.toUpperCase() === rackCode.toUpperCase()) {
      patch.designation = undefined;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }

  if (isMdfDevice(device)) {
    const deviceDataMap = buildDeviceDataMap(state.nodes);
    const panelCode = resolveMdfPanelTypeCode(deviceNodeId, device, ctx, deviceDataMap);
    const base = composeHousename({
      rackCode,
      frameSlot: device.frameSlot,
      typeCode: panelCode,
      expandTypeLabel: false,
    });
    const designation = appendMdfPairLabel(base, device);
    if (designation) patch.designation = designation;
    patch.deviceTypeCode = panelCode;
    return Object.keys(patch).length > 0 ? patch : null;
  }

  if (!rackCode && !typeCode) return null;

  const deviceDataMap = buildDeviceDataMap(state.nodes);
  const positionSlot =
    ctx && typeCode
      ? resolvePositionSlot(deviceNodeId, device, ctx, deviceDataMap)
      : undefined;

  const designation = composeHousename({
    rackCode,
    frameSlot: device.frameSlot,
    typeCode,
    positionSlot,
    expandTypeLabel: false,
  });

  if (designation) patch.designation = designation;
  const assignedSlot =
    ctx && typeCode
      ? assignHousenameSlot(deviceNodeId, device, ctx, deviceDataMap)
      : undefined;
  if (assignedSlot && assignedSlot !== device.housenameSlot?.trim().toUpperCase()) {
    patch.housenameSlot = assignedSlot;
  }
  if (typeCode && !device.deviceTypeCode?.trim()) patch.deviceTypeCode = typeCode;

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Collect device node IDs whose housenames should refresh after a rack/placement change. */
export function affectedDeviceIdsForRack(page: RackElevationPage, rackId: string): string[] {
  const ids = new Set<string>();
  for (const p of page.placements) {
    if (p.rackId === rackId) ids.add(p.deviceNodeId);
  }
  return [...ids];
}

export function findDuplicateDesignations(
  nodes: SchematicNode[],
  designation: string,
  excludeNodeId?: string,
): string[] {
  const target = designation.trim().toUpperCase();
  if (!target) return [];
  const dupes: string[] = [];
  for (const n of nodes) {
    if (n.type !== "device" || n.id === excludeNodeId) continue;
    const d = (n.data as DeviceData).designation?.trim().toUpperCase();
    if (d === target) dupes.push(n.id);
  }
  return dupes;
}

/** Resolve management IP or first port IP for header display. */
export function resolveDeviceHeaderIp(device: DeviceData): string {
  const mgmt = device.managementIp?.trim();
  if (mgmt) return mgmt;
  const port = (device.ports ?? []).find((p) => p.networkConfig?.ip?.trim());
  return port?.networkConfig?.ip?.trim() ?? "";
}

/** Extra px added to header band when installation block is shown (MAKE/MODEL/IP rows). */
export function installationBlockExtraPx(device: DeviceData): number {
  let extra = 0;
  if (device.manufacturer?.trim()) extra += 12;
  if (device.modelNumber?.trim()) extra += 12;
  if (resolveDeviceHeaderIp(device)) extra += 12;
  return extra;
}

export function deviceShowsInstallationBlock(device: DeviceData): boolean {
  return !!(
    device.designation?.trim()
    || device.manufacturer?.trim()
    || device.modelNumber?.trim()
    || device.rackLocation?.trim()
    || device.frameSlot?.trim()
    || resolveDeviceHeaderIp(device)
    || device.vlanSummary?.trim()
  );
}
