import type {
  DeviceData,
  RackData,
  RackDevicePlacement,
  RackElevationPage,
  RackElevationSettings,
  RoomData,
  SchematicNode,
  SchematicPage,
} from "./types";
import { DEFAULT_RACK_ELEVATION_SETTINGS } from "./types";
import { findInnermostRoomId } from "./roomContext";
import { inferRackHeightU } from "./rackUtils";

export function getDevicesInRoom(roomId: string, nodes: SchematicNode[]): SchematicNode[] {
  return nodes.filter((n) => n.type === "device" && n.parentId === roomId);
}

export interface ProposalResult {
  placements: Omit<RackDevicePlacement, "id">[];
  skipped: SchematicNode[];
}

export function proposeRackPlacements(
  rack: RackData,
  roomDevices: SchematicNode[],
  existingPlacements: RackDevicePlacement[],
): ProposalResult {
  const placedDeviceIds = new Set(existingPlacements.map((p) => p.deviceNodeId));
  const occupiedSlots = new Set<number>();
  for (const p of existingPlacements) {
    if (p.rackId !== rack.id || p.face !== "front" || p.mountedOnShelfId) continue;
    const data = roomDevices.find((n) => n.id === p.deviceNodeId)?.data as DeviceData | undefined;
    const hU = data ? inferRackHeightU(data) : 1;
    for (let u = p.uPosition; u < p.uPosition + hU; u++) occupiedSlots.add(u);
  }

  const sorted = [...roomDevices]
    .filter((n) => {
      const d = n.data as DeviceData;
      return d.deviceType !== "adapter" && !placedDeviceIds.has(n.id);
    })
    .sort((a, b) => ((a.data as DeviceData).label ?? "").localeCompare((b.data as DeviceData).label ?? ""));

  const placements: Omit<RackDevicePlacement, "id">[] = [];
  const skipped: SchematicNode[] = [];
  let uCursor = 1;

  for (const node of sorted) {
    const data = node.data as DeviceData;
    if (data.heightMm == null) {
      skipped.push(node);
      continue;
    }
    const hU = inferRackHeightU(data);
    let start = uCursor;
    while (start + hU - 1 <= rack.heightU) {
      let fits = true;
      for (let u = start; u < start + hU; u++) {
        if (occupiedSlots.has(u)) { fits = false; break; }
      }
      if (fits) break;
      start++;
    }
    if (start + hU - 1 > rack.heightU) {
      skipped.push(node);
      continue;
    }
    for (let u = start; u < start + hU; u++) occupiedSlots.add(u);
    placements.push({ rackId: rack.id, deviceNodeId: node.id, uPosition: start, face: "front" });
    uCursor = start + hU;
  }

  return { placements, skipped };
}

/** Default bottom-U for room-linked rack placement (scales with rack height). */
export function resolveDefaultPlacementU(
  rack: RackData,
  settings?: RackElevationSettings,
  deviceHeightU = 1,
): number {
  const merged = { ...DEFAULT_RACK_ELEVATION_SETTINGS, ...settings };
  const ratio = merged.defaultPlacementURatio ?? 36 / 42;
  const target = merged.defaultPlacementU ?? Math.round(rack.heightU * ratio);
  const u = Math.max(1, Math.min(target, rack.heightU));
  return Math.max(1, Math.min(u, rack.heightU - deviceHeightU + 1));
}

export interface LinkedRackSyncInput {
  deviceNodeId: string;
  roomId: string;
  nodes: SchematicNode[];
  pages: SchematicPage[];
  settings?: RackElevationSettings;
}

export interface LinkedRackSyncPlan {
  pageId: string;
  rackId: string;
  deviceNodeId: string;
  uPosition: number;
  face: "front";
  removePlacementIds: string[];
  clearHousenameSlot: boolean;
  skipHousenameRecompute: boolean;
}

/** Build placement plan when a device enters an equipment rack room linked to an elevation rack. */
export function planDeviceLinkedRackSync(input: LinkedRackSyncInput): LinkedRackSyncPlan | null {
  const roomNode = input.nodes.find((n) => n.id === input.roomId && n.type === "room");
  if (!roomNode) return null;
  const roomData = roomNode.data as RoomData;
  if (!roomData.isEquipmentRack || !roomData.linkedRackPageId || !roomData.linkedRackId) return null;

  const deviceNode = input.nodes.find((n) => n.id === input.deviceNodeId && n.type === "device");
  if (!deviceNode) return null;
  const device = deviceNode.data as DeviceData;
  if (device.deviceType === "adapter") return null;
  if (device.heightMm == null && device.rackHeightU == null) return null;

  const page = input.pages.find(
    (p) => p.id === roomData.linkedRackPageId && p.type === "rack-elevation",
  ) as RackElevationPage | undefined;
  if (!page) return null;
  const rack = page.racks.find((r) => r.id === roomData.linkedRackId);
  if (!rack) return null;

  const innerRoom = findInnermostRoomId(input.deviceNodeId, input.nodes);
  if (innerRoom !== input.roomId) return null;

  const existingOnTarget = page.placements.find(
    (p) => p.deviceNodeId === input.deviceNodeId && p.rackId === rack.id,
  );
  if (existingOnTarget) return null;

  const hU = inferRackHeightU(device);
  const uPosition = resolveDefaultPlacementU(rack, input.settings, hU);

  const removePlacementIds: string[] = [];
  for (const p of input.pages) {
    if (p.type !== "rack-elevation") continue;
    const elev = p as RackElevationPage;
    for (const pl of elev.placements) {
      if (pl.deviceNodeId === input.deviceNodeId) removePlacementIds.push(pl.id);
    }
  }

  return {
    pageId: page.id,
    rackId: rack.id,
    deviceNodeId: input.deviceNodeId,
    uPosition,
    face: "front",
    removePlacementIds,
    clearHousenameSlot: true,
    skipHousenameRecompute: !!device.designationLocked,
  };
}

export function planDevicesLinkedRackSync(
  deviceNodeIds: string[],
  nodes: SchematicNode[],
  pages: SchematicPage[],
  settings?: RackElevationSettings,
): LinkedRackSyncPlan[] {
  const plans: LinkedRackSyncPlan[] = [];
  const seen = new Set<string>();
  for (const deviceNodeId of deviceNodeIds) {
    const roomId = findInnermostRoomId(deviceNodeId, nodes);
    if (!roomId) continue;
    const key = `${deviceNodeId}:${roomId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const plan = planDeviceLinkedRackSync({
      deviceNodeId,
      roomId,
      nodes,
      pages,
      settings,
    });
    if (plan) plans.push(plan);
  }
  return plans;
}
