import type { SchematicNode } from "./types";
import { nodeBelongsToRoom } from "./containerLayers";

export interface CanvasLayerPresentation {
  showContainers: boolean;
  sigSolo: string;
  roomSolo: string;
  hiddenRoomIds: string;
  roomLayerOpacity?: Record<string, number>;
}

export function applyCanvasLayerPresentation(
  nodes: SchematicNode[],
  layers: CanvasLayerPresentation,
): SchematicNode[] {
  const hiddenRooms = layers.hiddenRoomIds
    ? new Set(layers.hiddenRoomIds.split(",").filter(Boolean))
    : null;

  return nodes.map((node) => {
    let opacity = 1;
    let hidden = false;

    const roomOpacity = layers.roomLayerOpacity?.[node.parentId ?? ""] ?? layers.roomLayerOpacity?.[node.id];

    if (node.type === "room") {
      if (!layers.showContainers || hiddenRooms?.has(node.id)) {
        hidden = true;
      } else {
        if (layers.roomLayerOpacity?.[node.id] != null) {
          opacity = layers.roomLayerOpacity[node.id]!;
        }
        if (
          layers.roomSolo &&
          node.id !== layers.roomSolo &&
          !nodeBelongsToRoom(node.id, layers.roomSolo, nodes)
        ) {
          opacity = Math.min(opacity, 0.45);
        }
      }
    } else if (layers.roomSolo && !nodeBelongsToRoom(node.id, layers.roomSolo, nodes)) {
      opacity = 0.35;
    } else if (roomOpacity != null) {
      opacity = roomOpacity;
    }

    return {
      ...node,
      hidden: hidden || undefined,
      style: { ...node.style, opacity },
    };
  });
}
