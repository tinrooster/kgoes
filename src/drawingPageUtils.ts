import type {
  ConnectionEdge,
  DrawingPage,
  DrawingViewportPreset,
  RoomData,
  SchematicNode,
  SchematicPage,
} from "./types";
import { computeSchematicContentBounds, type ContentBounds } from "./viewNavUtils";

export const LEGACY_SCHEMATIC_PAGE_ID = "schematic";

export function isDrawingCanvasPage(page: SchematicPage | undefined): page is DrawingPage {
  return page?.type === "drawing";
}

/** True when the main signal-flow React Flow canvas should be shown. */
export function isDrawingCanvasActive(activePage: string, pages: SchematicPage[]): boolean {
  if (activePage === LEGACY_SCHEMATIC_PAGE_ID) return true;
  return pages.some((p) => p.id === activePage && p.type === "drawing");
}

/** Drawing page id whose in-memory graph should be flushed when leaving the canvas. */
export function activeDrawingPageId(activePage: string, pages: SchematicPage[]): string | null {
  if (activePage !== LEGACY_SCHEMATIC_PAGE_ID) {
    const page = pages.find((p) => p.id === activePage && p.type === "drawing");
    return page?.id ?? null;
  }
  return pages.find((p) => p.type === "drawing")?.id ?? null;
}

/** Resolve which drawing page owns saved viewports (legacy tab → first drawing page). */
export function resolveActiveDrawingPage(
  activePage: string,
  pages: SchematicPage[],
): DrawingPage | null {
  if (activePage !== LEGACY_SCHEMATIC_PAGE_ID) {
    const page = pages.find((p) => p.id === activePage && p.type === "drawing");
    if (page && page.type === "drawing") return page;
  }
  const first = pages.find((p): p is DrawingPage => p.type === "drawing");
  return first ?? null;
}

export function stripEdgesForPersist(edges: ConnectionEdge[]): ConnectionEdge[] {
  return edges.map(({ zIndex: _, selected: _s, ...rest }) => rest) as ConnectionEdge[];
}

/**
 * Copy hub jack-field device nodes (and their room parents + cable edges) onto every
 * Drawing page. Required when hub layout runs on a Rack Elevations tab — live
 * state.nodes is not the Drawing sheet graph until persisted here.
 */
export function mergeHubGraphIntoDrawingPages(
  pages: SchematicPage[],
  liveNodes: SchematicNode[],
  liveEdges: ConnectionEdge[],
  jackDeviceNodeIds: Iterable<string>,
): SchematicPage[] {
  const jackIds = new Set(jackDeviceNodeIds);
  if (jackIds.size === 0) return pages;

  const jackNodes = liveNodes.filter((n) => jackIds.has(n.id));
  if (jackNodes.length === 0) return pages;

  const parentRoomIds = new Set(
    jackNodes.map((n) => n.parentId).filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  const hubNodes = [
    ...liveNodes.filter((n) => parentRoomIds.has(n.id)),
    ...jackNodes,
  ];
  const hubNodeIds = new Set(hubNodes.map((n) => n.id));
  const hubEdges = liveEdges.filter((e) => hubNodeIds.has(e.source) && hubNodeIds.has(e.target));

  return pages.map((p) => {
    if (p.type !== "drawing") return p;
    const dp = p as DrawingPage;
    const baseNodes = (dp.nodes ?? []).filter((n) => !jackIds.has(n.id));
    const mergedNodes = [...baseNodes];
    for (const n of hubNodes) {
      const idx = mergedNodes.findIndex((x) => x.id === n.id);
      const clone = structuredClone(n);
      if (idx >= 0) mergedNodes[idx] = clone;
      else mergedNodes.push(clone);
    }

    const hubEdgeIds = new Set(hubEdges.map((e) => e.id));
    const baseEdges = (dp.edges ?? []).filter((e) => !hubEdgeIds.has(e.id));
    const mergedEdges = stripEdgesForPersist([...baseEdges, ...hubEdges]);

    return { ...dp, nodes: mergedNodes, edges: mergedEdges };
  });
}

/** Write the live React Flow graph into the active drawing page entry. */
export function persistActiveDrawingGraph(
  pages: SchematicPage[],
  activePage: string,
  nodes: SchematicNode[],
  edges: ConnectionEdge[],
): SchematicPage[] {
  const drawingId = activeDrawingPageId(activePage, pages);
  if (!drawingId) return pages;
  const persistedEdges = stripEdgesForPersist(edges);
  return pages.map((p) =>
    p.id === drawingId && p.type === "drawing"
      ? { ...p, nodes: structuredClone(nodes), edges: structuredClone(persistedEdges) }
      : p,
  );
}

/** Assign file-level nodes/edges onto drawing pages that predate per-sheet graphs. */
export function ensureDrawingPageGraphs(
  pages: SchematicPage[],
  fileNodes: SchematicNode[],
  fileEdges: ConnectionEdge[],
): SchematicPage[] {
  let firstAssigned = false;
  return pages.map((p) => {
    if (p.type !== "drawing") return p;
    const dp = p as DrawingPage;
    if (dp.nodes?.length || dp.edges?.length) return dp;
    if (!firstAssigned) {
      firstAssigned = true;
      return {
        ...dp,
        nodes: structuredClone(fileNodes),
        edges: structuredClone(stripEdgesForPersist(fileEdges)),
      };
    }
    return { ...dp, nodes: dp.nodes ?? [], edges: dp.edges ?? [] };
  });
}

export function defaultDrawingViewports(): DrawingViewportPreset[] {
  return [{ id: "overview", label: "Overview", fit: "all" }];
}

export function createDrawingPage(
  label: string,
  id: string,
  graph?: { nodes?: SchematicNode[]; edges?: ConnectionEdge[] },
): DrawingPage {
  return {
    id,
    label,
    type: "drawing",
    viewports: defaultDrawingViewports(),
    nodes: graph?.nodes ? structuredClone(graph.nodes) : [],
    edges: graph?.edges ? structuredClone(stripEdgesForPersist(graph.edges)) : [],
  };
}

export function roomViewportPresets(nodes: SchematicNode[]): DrawingViewportPreset[] {
  return nodes
    .filter((n) => n.type === "room" && !n.parentId && !(n.data as RoomData).isEquipmentRack)
    .map((n) => ({
      id: `room-${n.id}`,
      label: (n.data as RoomData).label ?? "Room",
      fit: "room" as const,
      roomNodeId: n.id,
    }));
}

/** User-saved custom viewports (not overview or auto room presets). */
export function isPersistedDrawingViewport(preset: { id: string }): boolean {
  return preset.id !== "overview" && !preset.id.startsWith("room-");
}

export function mergeDrawingViewportOptions(
  saved: DrawingViewportPreset[],
  nodes: SchematicNode[],
): DrawingViewportPreset[] {
  const byId = new Map<string, DrawingViewportPreset>();
  for (const v of saved) byId.set(v.id, v);
  for (const room of roomViewportPresets(nodes)) {
    if (!byId.has(room.id)) byId.set(room.id, room);
  }
  const overview = byId.get("overview") ?? defaultDrawingViewports()[0];
  byId.delete("overview");
  const rest = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  return [overview, ...rest];
}

export function roomContentBounds(nodeId: string, nodes: SchematicNode[], padding = 70): ContentBounds | null {
  const room = nodes.find((n) => n.id === nodeId && n.type === "room");
  if (!room) return null;
  const w = room.measured?.width ?? room.width ?? 400;
  const h = room.measured?.height ?? room.height ?? 300;
  let minX = room.position.x - padding;
  let minY = room.position.y - padding;
  let maxX = room.position.x + w + padding;
  let maxY = room.position.y + h + padding;
  for (const n of nodes) {
    if (n.parentId !== nodeId) continue;
    const nw = n.measured?.width ?? 180;
    const nh = n.measured?.height ?? 60;
    minX = Math.min(minX, room.position.x + n.position.x - padding);
    minY = Math.min(minY, room.position.y + n.position.y - padding);
    maxX = Math.max(maxX, room.position.x + n.position.x + nw + padding);
    maxY = Math.max(maxY, room.position.y + n.position.y + nh + padding);
  }
  return { minX, minY, maxX, maxY };
}

export function boundsForDrawingViewport(
  preset: DrawingViewportPreset,
  nodes: SchematicNode[],
): ContentBounds | null {
  if (preset.fit === "all") return computeSchematicContentBounds(nodes);
  if (preset.fit === "room" && preset.roomNodeId) return roomContentBounds(preset.roomNodeId, nodes);
  if (preset.fit === "custom" && preset.viewport) {
    // Custom bounds need canvas size; callers with container dims should use presetFlowBounds().
    const all = computeSchematicContentBounds(nodes);
    if (!all) return null;
    const refW = 1200;
    const refH = 800;
    const { x, y, zoom } = preset.viewport;
    const z = Math.max(zoom, 1e-6);
    return {
      minX: -x / z,
      minY: -y / z,
      maxX: (refW - x) / z,
      maxY: (refH - y) / z,
    };
  }
  return computeSchematicContentBounds(nodes);
}
