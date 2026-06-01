/**
 * Container layer helpers — auto-fit room frames to child device bounds.
 * Mirrors design v2 KGOLayers.computeContainers for React Flow room nodes.
 */

import type { RoomData, SchematicNode } from "./types";

export const CONTAINER_PAD = 24;
export const CONTAINER_LABEL_H = 28;
const DEFAULT_DEVICE_W = 180;
const DEFAULT_DEVICE_H = 60;
const MIN_ROOM_W = 200;
const MIN_ROOM_H = 150;

export function getAbsoluteNodePosition(
  nodeId: string,
  nodes: SchematicNode[],
): { x: number; y: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(nodeId);
  if (!current) return { x: 0, y: 0 };
  let x = current.position.x;
  let y = current.position.y;
  let parentId = current.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

export function nodeBelongsToRoom(
  nodeId: string,
  roomId: string,
  nodes: SchematicNode[],
): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(nodeId);
  while (current) {
    if (current.id === roomId) return true;
    if (!current.parentId) return false;
    current = byId.get(current.parentId);
  }
  return false;
}

interface ChildExtent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Direct-child bounds in room-local coordinates. */
export function getRoomChildExtent(
  roomId: string,
  nodes: SchematicNode[],
): ChildExtent | null {
  const children = nodes.filter((n) => n.parentId === roomId && n.type !== "room");
  if (children.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const w = (child.style?.width as number | undefined) ?? child.measured?.width ?? DEFAULT_DEVICE_W;
    const h = (child.style?.height as number | undefined) ?? child.measured?.height ?? DEFAULT_DEVICE_H;
    minX = Math.min(minX, child.position.x);
    minY = Math.min(minY, child.position.y);
    maxX = Math.max(maxX, child.position.x + w);
    maxY = Math.max(maxY, child.position.y + h);
  }

  return { minX, minY, maxX, maxY };
}

export function snapContainerDim(value: number, gridSize: number): number {
  return Math.max(MIN_ROOM_W, Math.ceil(value / gridSize) * gridSize);
}

export function snapContainerHeight(value: number, gridSize: number): number {
  return Math.max(MIN_ROOM_H, Math.ceil(value / gridSize) * gridSize);
}

/** Resize unlocked rooms to fit children; preserves absolute child positions on canvas. */
export function computeAutoFitRoomUpdates(
  nodes: SchematicNode[],
  gridSize: number,
): SchematicNode[] {
  let changed = false;
  const childShifts = new Map<string, { dx: number; dy: number }>();
  const roomPosShifts = new Map<string, { dx: number; dy: number }>();

  for (const node of nodes) {
    if (node.type !== "room") continue;
    const data = node.data as RoomData;
    if (data.locked) continue;

    const extent = getRoomChildExtent(node.id, nodes);
    if (!extent) continue;

    const targetMinX = CONTAINER_PAD;
    const targetMinY = CONTAINER_PAD + CONTAINER_LABEL_H;
    const dx = targetMinX - extent.minX;
    const dy = targetMinY - extent.minY;

    if (dx !== 0 || dy !== 0) {
      childShifts.set(node.id, { dx, dy });
      roomPosShifts.set(node.id, { dx: -dx, dy: -dy });
      changed = true;
    }
  }

  let updated = nodes.map((node) => {
    if (node.type !== "room") {
      const parentShift = node.parentId ? childShifts.get(node.parentId) : undefined;
      if (!parentShift) return node;
      changed = true;
      return {
        ...node,
        position: {
          x: node.position.x + parentShift.dx,
          y: node.position.y + parentShift.dy,
        },
      };
    }

    const data = node.data as RoomData;
    if (data.locked) return node;

    const extent = getRoomChildExtent(node.id, nodes);
    if (!extent) return node;

    const posShift = roomPosShifts.get(node.id);
    const shiftedMinX = extent.minX + (posShift?.dx ?? 0);
    const shiftedMinY = extent.minY + (posShift?.dy ?? 0);
    const shiftedMaxX = extent.maxX + (posShift?.dx ?? 0);
    const shiftedMaxY = extent.maxY + (posShift?.dy ?? 0);

    const width = snapContainerDim(shiftedMaxX - shiftedMinX + CONTAINER_PAD * 2, gridSize);
    const height = snapContainerHeight(
      shiftedMaxY - shiftedMinY + CONTAINER_PAD * 2 + CONTAINER_LABEL_H,
      gridSize,
    );

    const prevW = (node.style?.width as number | undefined) ?? MIN_ROOM_W;
    const prevH = (node.style?.height as number | undefined) ?? MIN_ROOM_H;
    const nextPos = posShift
      ? { x: node.position.x + posShift.dx, y: node.position.y + posShift.dy }
      : node.position;

    if (
      nextPos.x === node.position.x &&
      nextPos.y === node.position.y &&
      prevW === width &&
      prevH === height
    ) {
      return node;
    }

    changed = true;
    return {
      ...node,
      position: nextPos,
      style: { ...node.style, width, height },
    } as SchematicNode;
  });

  return changed ? updated : nodes;
}
