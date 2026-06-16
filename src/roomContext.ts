import { getRoomLabel } from "./packList";
import type { DeviceData, SchematicNode } from "./types";

export interface DeviceRoomContext {
  /** Innermost enclosing schematic room node id. */
  roomId?: string;
  /** Full room label path (e.g. "MDF / Datacom" or "Studio A - Rack Room"). */
  roomLabel: string;
}

/** Walk parentId chain and return the innermost (nearest) room node id, if any. */
export function findInnermostRoomId(
  nodeId: string,
  nodes: SchematicNode[],
): string | undefined {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let cur = nodeMap.get(nodeId);
  while (cur?.parentId) {
    const parent = nodeMap.get(cur.parentId);
    if (!parent) break;
    if (parent.type === "room") return parent.id;
    cur = parent;
  }
  return undefined;
}

export function resolveDeviceRoomContext(
  deviceNodeId: string,
  nodes: SchematicNode[],
): DeviceRoomContext {
  const node = nodes.find((n) => n.id === deviceNodeId);
  const roomId = node ? findInnermostRoomId(deviceNodeId, nodes) : undefined;
  const label = getRoomLabel(nodes, roomId ?? node?.parentId);
  return {
    roomId,
    roomLabel: label === "Unassigned" ? "" : label,
  };
}

/** Patch roomId / roomLocation on a device from current parent chain. Not part of housename. */
export function composeDeviceRoomPatch(
  deviceNodeId: string,
  nodes: SchematicNode[],
  device: DeviceData,
): Partial<DeviceData> | null {
  const ctx = resolveDeviceRoomContext(deviceNodeId, nodes);
  const nextRoomId = ctx.roomId;
  const nextRoomLocation = ctx.roomLabel || undefined;
  const prevRoomId = device.roomId;
  const prevRoomLocation = device.roomLocation?.trim() || undefined;

  if (prevRoomId === nextRoomId && prevRoomLocation === nextRoomLocation) {
    return null;
  }

  return {
    roomId: nextRoomId,
    roomLocation: nextRoomLocation,
  };
}

/** Device node ids that should refresh room fields after a room label change. */
export function affectedDeviceIdsForRoom(roomId: string, nodes: SchematicNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (n.type !== "device") continue;
    if (findInnermostRoomId(n.id, nodes) === roomId) ids.push(n.id);
  }
  return ids;
}
