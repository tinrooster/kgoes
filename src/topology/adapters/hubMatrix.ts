/**
 * Bridge hub jack-field elevation + schematic edges ↔ topology matrix view.
 */

import { resolveMasterPanelForDestRack } from "../../distributionPlan";
import type { DistributionPlan } from "../../distributionPlan";
import { resolveRackDesignation } from "../../rackDesignation";
import type {
  CableSegment,
  NetworkPanel,
  NetworkPort,
  Point,
  PortDetails,
  TopologyDatabase,
} from "../domain/types";
import { columnsForGridPreset, type GridLayoutPreset } from "../layout/panelGrid";
import { computeHubMatrixLayout, type HubMatrixLayout } from "../layout/matrixLayout";
import { normalizeServiceType, signalTypeForService } from "../serviceSchema";
import type { ServiceType } from "../serviceSchema";
import type {
  ConnectionEdge,
  DeviceData,
  DeviceNode,
  Port,
  RackElevationPage,
  SchematicNode,
} from "../../types";
import { SIGNAL_COLORS } from "../../types";
import { resolveServiceStyle } from "../serviceSchema";

export interface HubJackFieldBinding {
  deviceNodeId: string;
  rackId: string;
  panelIndex: number;
  isMaster: boolean;
  rackCode: string;
  deviceLabel: string;
  ports: Port[];
}

export interface HubMatrixPairContext {
  masterRackId: string;
  destRackId: string;
  masterBinding: HubJackFieldBinding;
  destBinding: HubJackFieldBinding;
  plan: DistributionPlan | null;
}

export interface HubMatrixViewModel {
  db: TopologyDatabase;
  pair: HubMatrixPairContext;
  destRackIds: string[];
  sourcePorts: PortDetails[];
  destPorts: PortDetails[];
  sourcePortPositions: Map<string, Point>;
  destPortPositions: Map<string, Point>;
  layout: HubMatrixLayout;
  pairSegments: CableSegment[];
  gridPreset: GridLayoutPreset;
  portsPerPanel: 12 | 24 | 48;
}

function parsePortIdFromHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const m = handle.match(/^(.+)-(front|rear)$/);
  return m ? m[1] : null;
}

function passthroughPorts(ports: Port[]): Port[] {
  const pt = ports.filter((p) => p.direction === "passthrough");
  return pt.length > 0 ? pt : ports;
}

function findPassthroughPort(ports: Port[], index: number, portStart: number): Port | undefined {
  const num = portStart + index;
  const byLabel = ports.find((p) => p.label === `Port ${num}` || p.label === `Port ${num} `);
  if (byLabel) return byLabel;
  const list = passthroughPorts(ports);
  return list[index];
}

export function collectHubJackFieldBindings(
  page: RackElevationPage,
  nodes: SchematicNode[],
  masterRackId: string,
  designationPrefix: string,
): HubJackFieldBinding[] {
  const jackPlacements = page.placements.filter((p) => p.distributionPresetRole === "jack-field");
  const bindings: HubJackFieldBinding[] = [];

  for (const pl of jackPlacements) {
    const node = nodes.find((n) => n.id === pl.deviceNodeId && n.type === "device") as DeviceNode | undefined;
    if (!node) continue;
    const rack = page.racks.find((r) => r.id === pl.rackId);
    if (!rack) continue;
    const data = node.data as DeviceData;
    bindings.push({
      deviceNodeId: pl.deviceNodeId,
      rackId: pl.rackId,
      panelIndex: pl.distributionPresetPanelIndex ?? 1,
      isMaster: pl.rackId === masterRackId,
      rackCode: resolveRackDesignation(rack, designationPrefix),
      deviceLabel: data.label?.trim() || rack.label,
      ports: data.ports ?? [],
    });
  }

  return bindings.sort((a, b) => {
    if (a.rackId !== b.rackId) return a.rackCode.localeCompare(b.rackCode, undefined, { numeric: true });
    return a.panelIndex - b.panelIndex;
  });
}

export function resolveHubMatrixPair(
  bindings: HubJackFieldBinding[],
  page: RackElevationPage,
  masterRackId: string,
  destRackId: string,
  plan: DistributionPlan | null,
): HubMatrixPairContext | null {
  const masterRack = page.racks.find((r) => r.id === masterRackId);
  const destRack = page.racks.find((r) => r.id === destRackId);
  if (!masterRack || !destRack) return null;

  const destBinding = bindings.find((b) => b.rackId === destRackId && !b.isMaster);
  if (!destBinding) return null;

  let masterPanel = 1;
  if (plan) {
    const resolved = resolveMasterPanelForDestRack(masterRack, destRack, plan);
    if (resolved != null) masterPanel = resolved;
  }

  const masterBinding = bindings.find(
    (b) => b.isMaster && b.panelIndex === masterPanel,
  ) ?? bindings.find((b) => b.isMaster);

  if (!masterBinding) return null;

  return {
    masterRackId,
    destRackId,
    masterBinding,
    destBinding,
    plan,
  };
}

function serviceTypeFromEdge(edge: ConnectionEdge): ServiceType {
  const tagged = edge.data?.matrixServiceType as string | undefined;
  if (tagged) return normalizeServiceType(tagged);
  return normalizeServiceType(edge.data?.signalType as string | undefined);
}

/** Read port-pair segments between two jack-field device nodes from schematic edges. */
export function segmentsFromHubJackEdges(
  edges: ConnectionEdge[],
  pair: HubMatrixPairContext,
): CableSegment[] {
  const { masterBinding, destBinding, plan } = pair;
  const portStart = plan?.fanout?.portStart ?? 1;
  const portsPerDest = plan?.fanout?.portsPerDest ?? plan?.jackFields.portsPerPanel ?? 12;

  const between = edges.filter(
    (e) =>
      (e.source === masterBinding.deviceNodeId && e.target === destBinding.deviceNodeId)
      || (e.source === destBinding.deviceNodeId && e.target === masterBinding.deviceNodeId),
  );

  const segments: CableSegment[] = [];

  for (const edge of between) {
    const trunkMeta = edge.data?.hubPortPairTrunk as
      | {
          portsPerDest: number;
          portStart: number;
        }
      | undefined;

    if (trunkMeta && between.length === 1) {
      const count = trunkMeta.portsPerDest ?? portsPerDest;
      const start = trunkMeta.portStart ?? portStart;
      for (let i = 0; i < count; i += 1) {
        const mp = findPassthroughPort(masterBinding.ports, i, start);
        const dp = findPassthroughPort(destBinding.ports, i, start);
        if (!mp || !dp) continue;
        segments.push({
          id: `${edge.id}-p${i}`,
          tagNumber: edge.data?.cableId ?? edge.data?.label ?? `TRUNK-${i + 1}`,
          category: "Cat6A",
          sourcePortId: mp.id,
          destinationPortId: dp.id,
          serviceType: serviceTypeFromEdge(edge),
        });
      }
      continue;
    }

    const srcPortId = parsePortIdFromHandle(edge.sourceHandle);
    const tgtPortId = parsePortIdFromHandle(edge.targetHandle);
    if (!srcPortId || !tgtPortId) continue;

    const masterPortIds = new Set(masterBinding.ports.map((p) => p.id));
    const sourcePortId = masterPortIds.has(srcPortId) ? srcPortId : tgtPortId;
    const destinationPortId = masterPortIds.has(srcPortId) ? tgtPortId : srcPortId;

    segments.push({
      id: edge.id,
      tagNumber: edge.data?.cableId ?? edge.data?.label ?? edge.id,
      category: "Cat6A",
      sourcePortId,
      destinationPortId,
      serviceType: serviceTypeFromEdge(edge),
    });
  }

  return segments;
}

export function topologyFromHubPage(
  page: RackElevationPage,
  nodes: SchematicNode[],
  edges: ConnectionEdge[],
  masterRackId: string,
): TopologyDatabase {
  const prefix = page.distributionPlan?.layout?.designationPrefix ?? "RACK";
  const bindings = collectHubJackFieldBindings(page, nodes, masterRackId, prefix);

  const panels: NetworkPanel[] = bindings.map((b) => ({
    id: `panel-${b.deviceNodeId}`,
    name: b.deviceLabel,
    type: b.isMaster ? "MDF_PATCH_PANEL" : "DESTINATION_PANEL",
    portsCount: (b.ports.length === 24 ? 24 : b.ports.length >= 48 ? 48 : 12) as 12 | 24 | 48,
    maxPoeBudgetWatts: b.isMaster
      ? (nodes.find((n) => n.id === b.deviceNodeId)?.data as DeviceData | undefined)?.poeBudgetW
      : undefined,
  }));

  const ports: NetworkPort[] = bindings.flatMap((b) =>
    passthroughPorts(b.ports).map((p, i) => ({
      id: p.id,
      panelId: `panel-${b.deviceNodeId}`,
      portNumber: i + 1,
      label: p.label,
    })),
  );

  const segments: CableSegment[] = [];
  const destRacks = [...new Set(bindings.filter((b) => !b.isMaster).map((b) => b.rackId))];
  for (const destRackId of destRacks) {
    const pair = resolveHubMatrixPair(bindings, page, masterRackId, destRackId, page.distributionPlan ?? null);
    if (!pair) continue;
    segments.push(...segmentsFromHubJackEdges(edges, pair));
  }

  return { panels, ports, segments, circuits: [] };
}

function matrixPortKey(deviceNodeId: string, portId: string): string {
  return `${deviceNodeId}::${portId}`;
}

function portDetailsForBinding(
  binding: HubJackFieldBinding,
  portStart: number,
): PortDetails[] {
  const list = passthroughPorts(binding.ports);
  return list.map((p, i) => ({
    id: matrixPortKey(binding.deviceNodeId, p.id),
    schematicPortId: p.id,
    deviceNodeId: binding.deviceNodeId,
    portNumber: portStart + i,
    label: p.label,
    category: "Cat6A",
    panelId: `panel-${binding.deviceNodeId}`,
    serviceType: "ETHERNET_DATA",
  }));
}

export function buildHubMatrixView(opts: {
  page: RackElevationPage;
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
  masterRackId: string;
  destRackId: string;
  gridPreset?: GridLayoutPreset;
}): HubMatrixViewModel | null {
  const plan = opts.page.distributionPlan ?? null;
  const prefix = plan?.layout?.designationPrefix ?? "RACK";
  const bindings = collectHubJackFieldBindings(opts.page, opts.nodes, opts.masterRackId, prefix);
  const pair = resolveHubMatrixPair(bindings, opts.page, opts.masterRackId, opts.destRackId, plan);
  if (!pair) return null;

  const portsPerPanel = (plan?.jackFields.portsPerPanel ?? 12) as 12 | 24 | 48;
  const portStart = plan?.fanout?.portStart ?? 1;
  const gridPreset = opts.gridPreset ?? (portsPerPanel === 24 ? "2x12" : "2x6");
  const columns = columnsForGridPreset(portsPerPanel, gridPreset);

  const sourcePorts = portDetailsForBinding(pair.masterBinding, portStart);
  const destPorts = portDetailsForBinding(pair.destBinding, portStart);

  const layout = computeHubMatrixLayout({ portsPerPanel, columns });

  const sourcePortPositions = new Map<string, Point>();
  const destPortPositions = new Map<string, Point>();
  sourcePorts.forEach((p, i) => {
    const pos = layout.sourcePositionsByIndex[i];
    if (pos) sourcePortPositions.set(p.id, pos);
  });
  destPorts.forEach((p, i) => {
    const pos = layout.destPositionsByIndex[i];
    if (pos) destPortPositions.set(p.id, pos);
  });

  const db = topologyFromHubPage(opts.page, opts.nodes, opts.edges, opts.masterRackId);
  const pairSegments = segmentsFromHubJackEdges(opts.edges, pair);

  const destRackIds = bindings
    .filter((b) => !b.isMaster)
    .map((b) => b.rackId)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  return {
    db,
    pair,
    destRackIds,
    sourcePorts,
    destPorts,
    sourcePortPositions,
    destPortPositions,
    layout,
    pairSegments,
    gridPreset,
    portsPerPanel,
  };
}

export function stripHubJackEdgesForPair(
  edges: ConnectionEdge[],
  masterNodeId: string,
  destNodeId: string,
): ConnectionEdge[] {
  return edges.filter(
    (e) =>
      !(
        (e.source === masterNodeId && e.target === destNodeId)
        || (e.source === destNodeId && e.target === masterNodeId)
      ),
  );
}

/** Write matrix port-pair segments back to schematic hub jack-field edges for one destination. */
export function hubEdgesFromMatrixSegments(opts: {
  segments: CableSegment[];
  pair: HubMatrixPairContext;
  existingEdges: ConnectionEdge[];
  nextEdgeId: () => string;
}): ConnectionEdge[] {
  const { pair, segments, existingEdges, nextEdgeId } = opts;
  const { masterBinding, destBinding, plan } = pair;
  const portStart = plan?.fanout?.portStart ?? 1;

  let next = stripHubJackEdgesForPair(
    existingEdges,
    masterBinding.deviceNodeId,
    destBinding.deviceNodeId,
  );

  const trunkLabel = `${masterBinding.rackCode} EJF ${masterBinding.panelIndex} → ${destBinding.rackCode} EJF ${destBinding.panelIndex}`;
  const useTrunkStyle = plan?.fanout?.schematicStyle !== "port-pair";

  if (useTrunkStyle && segments.length > 0) {
    const mp = findPassthroughPort(masterBinding.ports, 0, portStart);
    const dp = findPassthroughPort(destBinding.ports, 0, portStart);
    if (mp && dp) {
      const portsPerDest = segments.length;
      const first = segments[0];
      const media = first.serviceType ?? "ETHERNET_DATA";
      const signalType = signalTypeForService(media);
      const stroke = resolveServiceStyle(media).stroke;
      const data = {
        signalType,
        matrixServiceType: media,
        label: trunkLabel,
        multicableLabel: `${portsPerDest}×`,
        targetLabel: `P${String(portStart).padStart(2, "0")}–${String(portStart + portsPerDest - 1).padStart(2, "0")}`,
        hubPortPairTrunk: {
          portsPerDest,
          portStart,
          masterPanel: masterBinding.panelIndex,
          satPanel: destBinding.panelIndex,
          masterRackCode: masterBinding.rackCode,
          destRackCode: destBinding.rackCode,
        },
        cableId: first.tagNumber,
      };
      next.push({
        id: nextEdgeId(),
        source: masterBinding.deviceNodeId,
        target: destBinding.deviceNodeId,
        sourceHandle: `${mp.id}-front`,
        targetHandle: `${dp.id}-front`,
        data,
        style: { stroke: stroke ?? SIGNAL_COLORS[signalType], strokeWidth: 3 },
      });
      return next;
    }
  }

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const mp = masterBinding.ports.find((p) => p.id === seg.sourcePortId)
      ?? findPassthroughPort(masterBinding.ports, i, portStart);
    const dp = destBinding.ports.find((p) => p.id === seg.destinationPortId)
      ?? findPassthroughPort(destBinding.ports, i, portStart);
    if (!mp || !dp) continue;

    const media = seg.serviceType ?? "ETHERNET_DATA";
    const signalType = signalTypeForService(media);
    const stroke = resolveServiceStyle(media).stroke;
    next.push({
      id: nextEdgeId(),
      source: masterBinding.deviceNodeId,
      target: destBinding.deviceNodeId,
      sourceHandle: `${mp.id}-front`,
      targetHandle: `${dp.id}-front`,
      data: {
        signalType,
        matrixServiceType: media,
        label: i === 0 ? trunkLabel : undefined,
        cableId: seg.tagNumber,
      },
      style: { stroke: stroke ?? SIGNAL_COLORS[signalType], strokeWidth: 2 },
    });
  }

  return next;
}

export function satelliteRackIdsForHub(
  page: RackElevationPage,
  masterRackId: string,
): string[] {
  const jackRacks = new Set(
    page.placements
      .filter((p) => p.distributionPresetRole === "jack-field" && p.rackId !== masterRackId)
      .map((p) => p.rackId),
  );
  return page.racks
    .filter((r) => jackRacks.has(r.id))
    .map((r) => r.id);
}

