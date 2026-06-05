/**
 * Schematic drawing layout + optional fanout wiring for tower datacom hub jack fields.
 */

import { rackDesignationFromLabel, resolveRackDesignation } from "./rackDesignation";
import type { DistributionPlan } from "./distributionPlan";
import { resolveMasterPanelForDestRack } from "./distributionPlan";
import type { JackFieldPlacementPlan } from "./rackDistributionPresets";
import type {
  ConnectionEdge,
  ConnectionData,
  DeviceData,
  DeviceNode,
  Port,
  RackData,
  SchematicNode,
} from "./types";
import { SIGNAL_COLORS } from "./types";

/** Horizontal pitch between hub jack-field devices in a linked room (px). */
export const HUB_DRAWING_CELL_W = 220;
/** Vertical pitch — fits 12 passthrough rows at h-7 plus install header/footer. */
export const HUB_DRAWING_CELL_H = 400;

export function estimateHubJackFieldNodeHeight(portCount: number): number {
  const header = 72;
  const rowH = portCount > 8 ? 28 : 20;
  const portRows = portCount + (portCount > 0 ? 1 : 0); // Rear/Front column header
  const footer = 36;
  return header + portRows * rowH + footer + 16;
}

function rackSortKey(rack: RackData, designationPrefix: string): string {
  return rack.designation ?? rackDesignationFromLabel(rack.label, designationPrefix);
}

/**
 * Schematic room for a jack-field device: the rack's linked room, or the master rack's
 * linked room (typical "Master drawing" — one room on SR01 for the whole hub).
 */
export function resolveHubDrawingRoomId(
  rack: RackData | undefined,
  masterRack: RackData | undefined,
): string | undefined {
  return rack?.linkedRoomId ?? masterRack?.linkedRoomId;
}

/** Default canvas origin when no schematic room is linked to the master rack. */
export const HUB_DRAWING_OPEN_CANVAS_ORIGIN = { x: 80, y: 80 };

export type HubJackFieldLayoutResult = {
  layoutByNode: Map<string, { x: number; y: number }>;
  /** Room that owns jack-field devices (when master rack is linked). */
  hubRoomId?: string;
  placedInLinkedRoom: boolean;
};

/**
 * Grid positions for hub jack-field device nodes on the Drawing page.
 * Uses the linked schematic room when Rack 1 (or master) has linkedRoomId;
 * otherwise places all panels on the open Drawing canvas.
 */
export function layoutHubJackFieldsForDrawing(opts: {
  jackFields: JackFieldPlacementPlan[];
  racks: RackData[];
  masterRackId: string;
  masterRack?: RackData;
  plan?: DistributionPlan | null;
}): HubJackFieldLayoutResult {
  const layoutByNode = new Map<string, { x: number; y: number }>();
  const fieldsByRoom = new Map<string, JackFieldPlacementPlan[]>();

  for (const jf of opts.jackFields) {
    const rack = opts.racks.find((r) => r.id === jf.placement.rackId);
    const roomId = resolveHubDrawingRoomId(rack, opts.masterRack);
    if (!roomId) continue;
    const list = fieldsByRoom.get(roomId) ?? [];
    list.push(jf);
    fieldsByRoom.set(roomId, list);
  }

  if (fieldsByRoom.size > 0) {
    for (const [, fields] of fieldsByRoom) {
      const roomLayout = layoutHubJackFieldsInRoom({
        jackFields: fields,
        racks: opts.racks,
        masterRackId: opts.masterRackId,
        plan: opts.plan,
      });
      for (const [id, pos] of roomLayout) layoutByNode.set(id, pos);
    }
    return {
      layoutByNode,
      hubRoomId: opts.masterRack?.linkedRoomId,
      placedInLinkedRoom: true,
    };
  }

  if (opts.jackFields.length === 0) {
    return { layoutByNode, placedInLinkedRoom: false };
  }

  const openLayout = layoutHubJackFieldsInRoom({
    jackFields: opts.jackFields,
    racks: opts.racks,
    masterRackId: opts.masterRackId,
    plan: opts.plan,
    roomOrigin: HUB_DRAWING_OPEN_CANVAS_ORIGIN,
  });
  for (const [id, pos] of openLayout) layoutByNode.set(id, pos);
  return { layoutByNode, placedInLinkedRoom: false };
}

/** Grid positions for jack-field device nodes inside a linked schematic room. */
export function layoutHubJackFieldsInRoom(opts: {
  jackFields: JackFieldPlacementPlan[];
  racks: RackData[];
  masterRackId: string;
  plan?: DistributionPlan | null;
  roomOrigin?: { x: number; y: number };
}): Map<string, { x: number; y: number }> {
  const columns = opts.plan?.layout?.columns ?? 6;
  const prefix = opts.plan?.layout?.designationPrefix ?? "RACK";
  const origin = opts.roomOrigin ?? { x: 64, y: 64 };

  const rackById = new Map(opts.racks.map((r) => [r.id, r]));
  const sorted = [...opts.jackFields].sort((a, b) => {
    const ra = rackById.get(a.placement.rackId);
    const rb = rackById.get(b.placement.rackId);
    if (!ra || !rb) return 0;
    return rackSortKey(ra, prefix).localeCompare(rackSortKey(rb, prefix), undefined, { numeric: true });
  });

  const positions = new Map<string, { x: number; y: number }>();
  sorted.forEach((jf, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions.set(jf.deviceNodeId, {
      x: origin.x + col * HUB_DRAWING_CELL_W,
      y: origin.y + row * HUB_DRAWING_CELL_H,
    });
  });
  return positions;
}

function findPassthroughPort(ports: Port[], index: number, portStart: number): Port | undefined {
  const num = portStart + index;
  const byLabel = ports.find((p) => p.label === `Port ${num}` || p.label === `Port ${num} `);
  if (byLabel) return byLabel;
  const passthrough = ports.filter((p) => p.direction === "passthrough");
  return passthrough[index];
}

function edgeExists(
  edges: ConnectionEdge[],
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): boolean {
  return edges.some(
    (e) =>
      e.source === source
      && e.target === target
      && e.sourceHandle === sourceHandle
      && e.targetHandle === targetHandle,
  );
}

export type HubPortPairWireResult = {
  edges: ConnectionEdge[];
  added: number;
  skipped: number;
  /** True when schematicStyle is trunk (one line per destination). */
  drewTrunkLines: boolean;
};

function resolveHubSchematicStyle(fanout: DistributionPlan["fanout"]): "trunk" | "port-pair" {
  if (fanout?.schematicStyle) return fanout.schematicStyle;
  return "trunk";
}

function portRangeLabel(portStart: number, portsPerDest: number): string {
  const first = String(portStart).padStart(2, "0");
  const last = String(portStart + portsPerDest - 1).padStart(2, "0");
  return `P${first}–P${last}`;
}

/** Create schematic edges for distribution plan port-pair fanout (master EJF → satellite JKFs). */
export function buildHubPortPairEdges(opts: {
  nodes: SchematicNode[];
  jackFields: JackFieldPlacementPlan[];
  racks: RackData[];
  masterRackId: string;
  plan: DistributionPlan;
  existingEdges: ConnectionEdge[];
  nextEdgeId: () => string;
}): HubPortPairWireResult {
  const fanout = opts.plan.fanout;
  if (fanout?.mode !== "port-pair") {
    return { edges: [], added: 0, skipped: 0, drewTrunkLines: false };
  }

  const schematicStyle = resolveHubSchematicStyle(fanout);
  const portStart = fanout.portStart ?? 1;
  const portsPerDest = fanout.portsPerDest ?? opts.plan.jackFields.portsPerPanel ?? 12;
  const prefix = opts.plan.layout.designationPrefix.trim().toUpperCase();
  const satPanel = opts.plan.jackFields.satellitePanel ?? 1;

  const masterRack = opts.racks.find((r) => r.id === opts.masterRackId);
  if (!masterRack) return { edges: [], added: 0, skipped: 0, drewTrunkLines: false };

  const nodeById = new Map(opts.nodes.filter((n) => n.type === "device").map((n) => [n.id, n as DeviceNode]));
  const rackById = new Map(opts.racks.map((r) => [r.id, r]));

  const destFields = opts.jackFields
    .filter((jf) => jf.placement.rackId !== opts.masterRackId)
    .sort((a, b) => {
      const ra = rackById.get(a.placement.rackId);
      const rb = rackById.get(b.placement.rackId);
      if (!ra || !rb) return 0;
      const da = resolveRackDesignation(ra, prefix);
      const db = resolveRackDesignation(rb, prefix);
      return da.localeCompare(db, undefined, { numeric: true });
    });

  const newEdges: ConnectionEdge[] = [];
  let added = 0;
  let skipped = 0;

  for (const destField of destFields) {
    const destRack = rackById.get(destField.placement.rackId);
    if (!destRack) continue;

    const masterPanel = resolveMasterPanelForDestRack(masterRack, destRack, opts.plan);
    if (masterPanel == null) {
      skipped += schematicStyle === "trunk" ? 1 : portsPerDest;
      continue;
    }

    const masterField = opts.jackFields.find(
      (jf) =>
        jf.placement.rackId === opts.masterRackId
        && (jf.placement.distributionPresetPanelIndex ?? 1) === masterPanel,
    );
    if (!masterField) {
      skipped += schematicStyle === "trunk" ? 1 : portsPerDest;
      continue;
    }

    const masterNode = nodeById.get(masterField.deviceNodeId);
    const destNode = nodeById.get(destField.deviceNodeId);
    if (!masterNode || !destNode) {
      skipped += schematicStyle === "trunk" ? 1 : portsPerDest;
      continue;
    }

    const masterCode = resolveRackDesignation(masterRack, prefix);
    const destCode = resolveRackDesignation(destRack, prefix);
    const trunkLabel = `${masterCode} EJF ${masterPanel} → ${destCode} EJF ${satPanel}`;

    const masterPorts = (masterNode.data as DeviceData).ports ?? [];
    const destPorts = (destNode.data as DeviceData).ports ?? [];

    if (schematicStyle === "trunk") {
      const mp = findPassthroughPort(masterPorts, 0, portStart);
      const dp = findPassthroughPort(destPorts, 0, portStart);
      if (!mp || !dp) {
        skipped += 1;
        continue;
      }
      const sourceHandle = `${mp.id}-front`;
      const targetHandle = `${dp.id}-front`;
      if (
        edgeExists(opts.existingEdges, masterNode.id, sourceHandle, destNode.id, targetHandle)
        || edgeExists(newEdges, masterNode.id, sourceHandle, destNode.id, targetHandle)
      ) {
        skipped += 1;
        continue;
      }
      const rangeLabel = portRangeLabel(portStart, portsPerDest);
      const data: ConnectionData = {
        signalType: "ethernet",
        label: trunkLabel,
        multicableLabel: `${portsPerDest}×`,
        targetLabel: rangeLabel,
        hubPortPairTrunk: {
          portsPerDest,
          portStart,
          masterPanel,
          satPanel,
          masterRackCode: masterCode,
          destRackCode: destCode,
        },
      };
      newEdges.push({
        id: opts.nextEdgeId(),
        source: masterNode.id,
        target: destNode.id,
        sourceHandle,
        targetHandle,
        data,
        style: { stroke: SIGNAL_COLORS.ethernet, strokeWidth: 3 },
      });
      added += 1;
      continue;
    }

    for (let i = 0; i < portsPerDest; i += 1) {
      const mp = findPassthroughPort(masterPorts, i, portStart);
      const dp = findPassthroughPort(destPorts, i, portStart);
      if (!mp || !dp) {
        skipped += 1;
        continue;
      }
      const sourceHandle = `${mp.id}-front`;
      const targetHandle = `${dp.id}-front`;
      if (
        edgeExists(opts.existingEdges, masterNode.id, sourceHandle, destNode.id, targetHandle)
        || edgeExists(newEdges, masterNode.id, sourceHandle, destNode.id, targetHandle)
      ) {
        skipped += 1;
        continue;
      }
      const data: ConnectionData = {
        signalType: "ethernet",
        label: i === 0 ? trunkLabel : undefined,
      };
      newEdges.push({
        id: opts.nextEdgeId(),
        source: masterNode.id,
        target: destNode.id,
        sourceHandle,
        targetHandle,
        data,
        style: { stroke: SIGNAL_COLORS.ethernet, strokeWidth: 2 },
      });
      added += 1;
    }
  }

  return { edges: newEdges, added, skipped, drewTrunkLines: schematicStyle === "trunk" };
}

/** Remove prior port-pair runs between hub jack-field devices (before re-wiring). */
export function stripHubJackFieldEdges(
  edges: ConnectionEdge[],
  jackDeviceNodeIds: Iterable<string>,
): ConnectionEdge[] {
  const jackIds = new Set(jackDeviceNodeIds);
  if (jackIds.size === 0) return edges;
  return edges.filter((e) => !(jackIds.has(e.source) && jackIds.has(e.target)));
}
