import { resolveDeviceLabel } from "./displayName";
import { towerHalfWidthAtY } from "./towerDraftElevationLayout";
import {
  feedlineStrokeColor,
  resolveFeedTypeForDevice,
  towerFeedTypeShortLabel,
} from "./towerDraftFeedType";
import {
  ftAglToY,
  TOWER_DRAFT_PX_PER_FT,
  towerDraftGroundY,
  towerDraftTowerCenterX,
} from "./towerDraftUtils";
import type {
  ConnectionEdge,
  DeviceData,
  RackElevationPage,
  SchematicNode,
  SchematicPage,
  SignalType,
  TowerDeviceFeedType,
  TowerDraftPage,
  TowerDraftPlacement,
  TowerDraftPolyline,
  TrackItTowerSiteContext,
} from "./types";

/** Profile tower footprint (px half-width) — matches design handoff tower-data.js. */
const TOWER_PROFILE_BASE_HALF_W = 66;
const TOWER_PROFILE_TOP_HALF_W = 13;

export type TowerFeedlineKind = "hop" | "structure";

export interface SuggestTowerFeedlinesResult {
  polylines: TowerDraftPolyline[];
  added: number;
  structureCount: number;
  hopCount: number;
  primaryDestinationLabel?: string;
}

export interface SuggestTowerFeedlinesOpts {
  page: TowerDraftPage;
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
  pages: SchematicPage[];
  context?: TrackItTowerSiteContext | null;
  useShortNames?: boolean;
  nextPolylineId: () => string;
  pxPerFt?: number;
}

function nodeDeviceData(nodes: SchematicNode[], nodeId: string): DeviceData | undefined {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.type !== "device") return undefined;
  return node.data as DeviceData;
}

function placementByNodeId(page: TowerDraftPage): Map<string, TowerDraftPlacement> {
  return new Map(page.placements.map((p) => [p.deviceNodeId, p]));
}

function connectedPeers(
  deviceNodeId: string,
  edges: ConnectionEdge[],
): { nodeId: string; signalType?: SignalType | string }[] {
  const out: { nodeId: string; signalType?: SignalType | string }[] = [];
  for (const edge of edges) {
    const data = edge.data as { signalType?: SignalType | string } | undefined;
    if (edge.source === deviceNodeId) {
      out.push({ nodeId: edge.target as string, signalType: data?.signalType });
    } else if (edge.target === deviceNodeId) {
      out.push({ nodeId: edge.source as string, signalType: data?.signalType });
    }
  }
  return out;
}

function isMicrowaveRadiator(deviceType?: string): boolean {
  return deviceType === "microwave-dish" || deviceType === "microwave-horn" || deviceType === "microwave-parabolic";
}

function isTowerRelayDevice(deviceType?: string): boolean {
  return deviceType === "microwave-odu" || deviceType === "microwave-radio-odu";
}

function findRackDestinationLabel(
  nodeId: string,
  pages: SchematicPage[],
  nodes: SchematicNode[],
  useShortNames: boolean,
): string | undefined {
  for (const page of pages) {
    if (page.type !== "rack-elevation") continue;
    const rackPage = page as RackElevationPage;
    const placement = rackPage.placements.find((p) => p.deviceNodeId === nodeId);
    if (!placement) continue;
    const rack = rackPage.racks.find((r) => r.id === placement.rackId);
    const data = nodeDeviceData(nodes, nodeId);
    const deviceLabel = data
      ? resolveDeviceLabel(data, { useShortNames }).text
      : nodeId;
    const rackLabel = rack?.label?.trim() || "Rack";
    return `${deviceLabel} · ${rackLabel} · ${placement.uPosition}U`;
  }
  return undefined;
}

function structureDestinationLabel(
  deviceNodeId: string,
  edges: ConnectionEdge[],
  pages: SchematicPage[],
  nodes: SchematicNode[],
  useShortNames: boolean,
): { label: string; toNodeId?: string } {
  for (const peer of connectedPeers(deviceNodeId, edges)) {
    const rackLabel = findRackDestinationLabel(peer.nodeId, pages, nodes, useShortNames);
    if (rackLabel) return { label: rackLabel, toNodeId: peer.nodeId };
    const data = nodeDeviceData(nodes, peer.nodeId);
    if (data && !isTowerRelayDevice(data.deviceType) && !isMicrowaveRadiator(data.deviceType)) {
      return {
        label: resolveDeviceLabel(data, { useShortNames }).text,
        toNodeId: peer.nodeId,
      };
    }
  }
  return { label: "Equip. bldg" };
}

function resolveTowerHopTarget(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  page: TowerDraftPage,
  edges: ConnectionEdge[],
  nodes: SchematicNode[],
): TowerDraftPlacement | undefined {
  if (!isMicrowaveRadiator(data?.deviceType)) return undefined;
  const byNode = placementByNodeId(page);
  let oduTarget: TowerDraftPlacement | undefined;
  let nearest: TowerDraftPlacement | undefined;
  let nearestDelta = Infinity;

  for (const peer of connectedPeers(placement.deviceNodeId, edges)) {
    const hop = byNode.get(peer.nodeId);
    if (!hop) continue;
    const hopData = nodeDeviceData(nodes, peer.nodeId);
    if (isTowerRelayDevice(hopData?.deviceType)) {
      oduTarget = hop;
      break;
    }
    const delta = Math.abs(hop.mountHeightFtAgl - placement.mountHeightFtAgl);
    if (delta <= 25 && delta < nearestDelta) {
      nearest = hop;
      nearestDelta = delta;
    }
  }
  return oduTarget ?? nearest;
}

function shouldSkipStructureFeedline(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  page: TowerDraftPage,
  edges: ConnectionEdge[],
  nodes: SchematicNode[],
): boolean {
  if (!isMicrowaveRadiator(data?.deviceType)) return false;
  return !!resolveTowerHopTarget(placement, data, page, edges, nodes);
}

export function placementProfileX(
  placement: TowerDraftPlacement,
  centerX: number,
): number {
  return centerX + (placement.offsetX ?? 0);
}

export function profileTowerEdgeX(
  centerX: number,
  deviceX: number,
  y: number,
  topY: number,
  groundY: number,
): number {
  const hw = towerHalfWidthAtY(y, topY, groundY, TOWER_PROFILE_BASE_HALF_W, TOWER_PROFILE_TOP_HALF_W);
  return centerX + (deviceX >= centerX ? 1 : -1) * Math.min(hw - 2, 18);
}

export function polylinePathLengthPx(points: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.hypot(dx, dy);
  }
  return len;
}

/** Documented run length: path + 10% slack + 15 ft building entry. */
export function estimateFeedlineRunFt(pathLengthFt: number): number {
  return Math.round(pathLengthFt * 1.1 + 15);
}

export function fallbackFeedlineEstimateFt(mountHeightFtAgl: number): number {
  return estimateFeedlineRunFt(mountHeightFtAgl);
}

export function polylineToRunFt(
  points: { x: number; y: number }[],
  pxPerFt = TOWER_DRAFT_PX_PER_FT,
): number {
  return estimateFeedlineRunFt(polylinePathLengthPx(points) / pxPerFt);
}

function buildStructurePath(
  startX: number,
  startY: number,
  centerX: number,
  topY: number,
  groundY: number,
  bldgX: number,
  bldgY: number,
): { x: number; y: number }[] {
  const edgeX = profileTowerEdgeX(centerX, startX, startY, topY, groundY);
  return [
    { x: startX, y: startY },
    { x: edgeX, y: startY },
    { x: edgeX, y: groundY },
    { x: bldgX, y: bldgY },
  ];
}

function buildHopPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  topY: number,
  groundY: number,
): { x: number; y: number }[] {
  const edgeX = profileTowerEdgeX(centerX, startX, startY, topY, groundY);
  const midY = startY;
  return [
    { x: startX, y: startY },
    { x: edgeX, y: midY },
    { x: edgeX, y: endY },
    { x: endX, y: endY },
  ];
}

function makeFeedlinePolyline(
  opts: SuggestTowerFeedlinesOpts,
  input: {
    points: { x: number; y: number }[];
    fromNodeId: string;
    toNodeId?: string;
    toLabel: string;
    feedType: TowerDeviceFeedType;
    kind: TowerFeedlineKind;
  },
): TowerDraftPolyline {
  const pxPerFt = opts.pxPerFt ?? TOWER_DRAFT_PX_PER_FT;
  const estFt = polylineToRunFt(input.points, pxPerFt);
  return {
    id: opts.nextPolylineId(),
    points: input.points,
    strokeColor: feedlineStrokeColor(input.feedType),
    strokeWidth: input.kind === "hop" ? 1 : 1.25,
    lineStyle: input.kind === "hop" ? "dotted" : "dashed",
    cadLayer: "generated",
    feedlineFromNodeId: input.fromNodeId,
    feedlineToNodeId: input.toNodeId,
    feedlineToLabel: input.toLabel,
    feedType: input.feedType,
    feedlineKind: input.kind,
    feedlineEstFt: estFt,
  };
}

export function suggestTowerDraftFeedlinesForPage(
  opts: SuggestTowerFeedlinesOpts,
): SuggestTowerFeedlinesResult {
  const { page, nodes, edges, pages, context, useShortNames = false } = opts;
  const pxPerFt = opts.pxPerFt ?? TOWER_DRAFT_PX_PER_FT;
  const towerHeightFt = page.towerHeightFtAgl;
  const centerX = towerDraftTowerCenterX();
  const groundY = towerDraftGroundY(towerHeightFt, pxPerFt);
  const topY = ftAglToY(towerHeightFt, towerHeightFt, pxPerFt);
  const bldgX = centerX + 18;
  const bldgY = groundY + 14;

  const keptPolylines = page.polylines.filter(
    (pl) => pl.cadLayer !== "generated" || !pl.feedlineFromNodeId,
  );
  const generated: TowerDraftPolyline[] = [];
  let structureCount = 0;
  let hopCount = 0;
  let primaryDestinationLabel: string | undefined;

  for (const placement of page.placements) {
    const data = nodeDeviceData(nodes, placement.deviceNodeId);
    const peers = connectedPeers(placement.deviceNodeId, edges);
    const edgeSignal = peers[0]?.signalType;
    const feedType = resolveFeedTypeForDevice(data, edgeSignal);

    const startX = placementProfileX(placement, centerX);
    const startY = ftAglToY(placement.mountHeightFtAgl, towerHeightFt, pxPerFt);

    const hopTarget = resolveTowerHopTarget(placement, data, page, edges, nodes);
    if (hopTarget) {
      const hopData = nodeDeviceData(nodes, hopTarget.deviceNodeId);
      const hopLabel = hopData
        ? resolveDeviceLabel(hopData, { useShortNames }).text
        : hopTarget.deviceNodeId;
      const endX = placementProfileX(hopTarget, centerX);
      const endY = ftAglToY(hopTarget.mountHeightFtAgl, towerHeightFt, pxPerFt);
      generated.push(
        makeFeedlinePolyline(opts, {
          points: buildHopPath(startX, startY, endX, endY, centerX, topY, groundY),
          fromNodeId: placement.deviceNodeId,
          toNodeId: hopTarget.deviceNodeId,
          toLabel: hopLabel,
          feedType,
          kind: "hop",
        }),
      );
      hopCount++;
      continue;
    }

    if (shouldSkipStructureFeedline(placement, data, page, edges, nodes)) continue;

    const dest = structureDestinationLabel(
      placement.deviceNodeId,
      edges,
      pages,
      nodes,
      useShortNames,
    );
    if (!primaryDestinationLabel) primaryDestinationLabel = dest.label;
    generated.push(
      makeFeedlinePolyline(opts, {
        points: buildStructurePath(startX, startY, centerX, topY, groundY, bldgX, bldgY),
        fromNodeId: placement.deviceNodeId,
        toNodeId: dest.toNodeId,
        toLabel: dest.label,
        feedType,
        kind: "structure",
      }),
    );
    structureCount++;
  }

  return {
    polylines: [...keptPolylines, ...generated],
    added: generated.length,
    structureCount,
    hopCount,
    primaryDestinationLabel,
  };
}

export function feedlineForDevice(
  page: TowerDraftPage,
  deviceNodeId: string,
): TowerDraftPolyline | undefined {
  return page.polylines.find(
    (pl) => pl.cadLayer === "generated" && pl.feedlineFromNodeId === deviceNodeId,
  );
}

export function resolveFeedlineDisplay(
  page: TowerDraftPage,
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
): {
  estFt: number;
  medium: string;
  destinationLabel: string;
  hasSuggestedPath: boolean;
} {
  const polyline = feedlineForDevice(page, placement.deviceNodeId);
  if (polyline) {
    return {
      estFt: polyline.feedlineEstFt ?? polylineToRunFt(polyline.points),
      medium: towerFeedTypeShortLabel(polyline.feedType, data?.deviceType),
      destinationLabel: polyline.feedlineToLabel ?? "Equip. bldg",
      hasSuggestedPath: true,
    };
  }
  const feedType = resolveFeedTypeForDevice(data);
  return {
    estFt: fallbackFeedlineEstimateFt(placement.mountHeightFtAgl),
    medium: towerFeedTypeShortLabel(feedType, data?.deviceType),
    destinationLabel: "Equip. bldg",
    hasSuggestedPath: false,
  };
}

export function formatSuggestFeedlinesToast(result: SuggestTowerFeedlinesResult): string {
  if (result.added === 0) return "No placed devices to suggest feedlines for";
  const parts: string[] = [];
  if (result.structureCount > 0) {
    const dest = result.primaryDestinationLabel ?? "structure";
    parts.push(
      `${result.structureCount} to ${dest}${result.structureCount > 1 ? "" : ""}`,
    );
  }
  if (result.hopCount > 0) parts.push(`${result.hopCount} hop${result.hopCount > 1 ? "s" : ""}`);
  const detail = parts.length ? ` (${parts.join(", ")})` : "";
  return `Suggested ${result.added} feedline run${result.added > 1 ? "s" : ""}${detail} — view on Profile`;
}
