import { useSchematicStore } from "./store";
import { useSidebarStore } from "./sidebarStore";
import type { DeviceData, RoomData, SchematicNode, ConnectionEdge } from "./types";
import { countUnnumberedEdges } from "./kgoCableState";

export function openNumberingPanel(): void {
  useSidebarStore.getState().expandRightPanel("trackIt");
}

export function selectEdgeById(edgeId: string): void {
  useSchematicStore.setState({
    nodes: useSchematicStore.getState().nodes.map((n) => ({ ...n, selected: false })),
    edges: useSchematicStore.getState().edges.map((e) => ({
      ...e,
      selected: e.id === edgeId,
    })),
  });
}

export function clearCanvasSelection(): void {
  useSchematicStore.setState({
    nodes: useSchematicStore.getState().nodes.map((n) => ({ ...n, selected: false })),
    edges: useSchematicStore.getState().edges.map((e) => ({ ...e, selected: false })),
  });
}

export function openNumberingForEdge(edgeId: string): void {
  selectEdgeById(edgeId);
  openNumberingPanel();
}

export function focusNodeOnCanvas(nodeId: string): void {
  useSchematicStore.getState().requestSchematicFocus(nodeId);
}

export interface DeviceLocationCrumb {
  plantLabel: string;
  roomLabel?: string;
  rackLabel?: string;
  deviceLabel: string;
}

/** Resolve Plant › room › device breadcrumb from React Flow parent chain. */
export function resolveDeviceLocationCrumb(
  nodeId: string,
  nodes: SchematicNode[],
): DeviceLocationCrumb | null {
  const node = nodes.find((n) => n.id === nodeId && n.type === "device");
  if (!node) return null;
  const data = node.data as DeviceData;

  let roomNode: SchematicNode | undefined;
  let rackNode: SchematicNode | undefined;
  let parentId = node.parentId;
  while (parentId) {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) break;
    if (parent.type === "room") {
      const roomData = parent.data as RoomData;
      if (roomData.isEquipmentRack) rackNode = parent;
      else roomNode = parent;
    }
    parentId = parent.parentId;
  }

  return {
    plantLabel: "Plant",
    roomLabel: roomNode ? ((roomNode.data as RoomData).label ?? "Room") : undefined,
    rackLabel: rackNode ? ((rackNode.data as RoomData).label ?? "Rack") : undefined,
    deviceLabel: data.label ?? "Device",
  };
}

export type DeviceSyncTone = "success" | "info" | "warning";

export interface DeviceSyncSummary {
  tone: DeviceSyncTone;
  label: string;
  hint: string;
  showOpenTrackIt: boolean;
}

export function resolveDeviceSyncSummary(
  nodeId: string,
  edges: ConnectionEdge[],
  drawingLinked: boolean,
): DeviceSyncSummary {
  const unnumberedOnDevice = countUnnumberedEdges(
    edges.filter((e) => e.source === nodeId || e.target === nodeId),
  );

  if (!drawingLinked) {
    return {
      tone: "info",
      label: "Local schematic",
      hint: "Open from TrackIt Plant → Drawings to sync asset records and cable numbers.",
      showOpenTrackIt: false,
    };
  }

  if (unnumberedOnDevice > 0) {
    return {
      tone: "warning",
      label: `${unnumberedOnDevice} unnumbered run${unnumberedOnDevice !== 1 ? "s" : ""}`,
      hint: "Assign cable numbers from reserved blocks in the Numbering panel.",
      showOpenTrackIt: true,
    };
  }

  return {
    tone: "success",
    label: "Linked & numbered",
    hint: "Device cable runs match the linked plant drawing register.",
    showOpenTrackIt: true,
  };
}
