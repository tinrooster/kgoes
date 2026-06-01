/**
 * Import a drawing graph from an ES JSON file into the active drawing sheet (merge, not replace).
 */

import { migrateSchematic } from "./migrations";
import { createDrawingPage, ensureDrawingPageGraphs } from "./drawingPageUtils";
import { computeSchematicContentBounds } from "./viewNavUtils";
import type { ConnectionEdge, DeviceData, DeviceNode, DrawingPage, Port, SchematicFile, SchematicNode } from "./types";

export interface ExtractedDrawingGraph {
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
  /** Label of the source drawing sheet or file (for toasts). */
  sourceLabel: string;
}

export interface ImportIdGenerators {
  nextNodeId: () => string;
  nextRoomId: () => string;
  nextNoteId: () => string;
  nextEdgeId: () => string;
  clonePorts: (ports: Port[]) => Port[];
}

/** Parse + migrate file and return the primary drawing sheet graph. */
export function extractDrawingGraphFromFile(raw: SchematicFile): ExtractedDrawingGraph {
  const data = migrateSchematic(raw) as SchematicFile;
  let nodes = data.nodes ?? [];
  let edges = data.edges ?? [];
  let pages = data.pages ?? [];

  if (!pages.some((p) => p.type === "drawing")) {
    pages = [createDrawingPage("Drawing", "drawing-import-src", { nodes, edges }), ...pages];
  }
  pages = ensureDrawingPageGraphs(pages, nodes, edges);
  const drawing = pages.find((p): p is DrawingPage => p.type === "drawing");
  if (!drawing) {
    return { nodes: [], edges: [], sourceLabel: data.name ?? "Imported" };
  }

  return {
    nodes: structuredClone(drawing.nodes ?? []),
    edges: structuredClone(drawing.edges ?? []),
    sourceLabel: drawing.label || data.name || "Imported",
  };
}

function newNodeIdForType(type: SchematicNode["type"], gen: ImportIdGenerators): string {
  if (type === "room") return gen.nextRoomId();
  if (type === "note") return gen.nextNoteId();
  return gen.nextNodeId();
}

/** Clone nodes/edges with fresh ids (same approach as paste). */
export function remapImportedGraph(
  nodes: SchematicNode[],
  edges: ConnectionEdge[],
  gen: ImportIdGenerators,
): { nodes: SchematicNode[]; edges: ConnectionEdge[] } {
  const nodeIdMap = new Map<string, string>();
  const portIdMap = new Map<string, string>();

  for (const n of nodes) {
    nodeIdMap.set(n.id, newNodeIdForType(n.type, gen));
  }

  const remappedNodes: SchematicNode[] = nodes.map((n) => {
    const newId = nodeIdMap.get(n.id)!;

    if (n.type === "device") {
      const deviceData = n.data as DeviceData;
      const newPorts = gen.clonePorts(deviceData.ports);
      deviceData.ports.forEach((oldPort, i) => {
        portIdMap.set(oldPort.id, newPorts[i].id);
      });
      const remappedHidden = deviceData.hiddenPorts?.length
        ? deviceData.hiddenPorts
            .map((id) => portIdMap.get(id) ?? id)
            .filter((id) => newPorts.some((p) => p.id === id))
        : undefined;
      return {
        ...n,
        id: newId,
        parentId: n.parentId ? nodeIdMap.get(n.parentId) ?? n.parentId : undefined,
        data: {
          ...deviceData,
          ports: newPorts,
          hiddenPorts: remappedHidden && remappedHidden.length > 0 ? remappedHidden : undefined,
        },
      } as DeviceNode;
    }

    return {
      ...n,
      id: newId,
      parentId: n.parentId ? nodeIdMap.get(n.parentId) ?? n.parentId : undefined,
    };
  });

  const remappedEdges: ConnectionEdge[] = edges.map((e) => ({
    ...e,
    id: gen.nextEdgeId(),
    source: nodeIdMap.get(e.source) ?? e.source,
    target: nodeIdMap.get(e.target) ?? e.target,
    sourceHandle: e.sourceHandle ? portIdMap.get(e.sourceHandle) ?? e.sourceHandle : e.sourceHandle,
    targetHandle: e.targetHandle ? portIdMap.get(e.targetHandle) ?? e.targetHandle : e.targetHandle,
  }));

  return { nodes: remappedNodes, edges: remappedEdges };
}

/** Place imported content to the right of existing content (align tops). */
export function computeImportPlacementOffset(
  existing: SchematicNode[],
  imported: SchematicNode[],
  gap = 96,
): { dx: number; dy: number } {
  if (existing.length === 0) return { dx: 0, dy: 0 };
  const existingBounds = computeSchematicContentBounds(existing, 48);
  const importedBounds = computeSchematicContentBounds(imported, 48);
  if (!existingBounds) return { dx: 400, dy: 0 };
  if (!importedBounds) return { dx: 400, dy: 0 };
  return {
    dx: existingBounds.maxX + gap - importedBounds.minX,
    dy: existingBounds.minY - importedBounds.minY,
  };
}

export function offsetImportedNodes(nodes: SchematicNode[], dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  for (const n of nodes) {
    n.position = { x: n.position.x + dx, y: n.position.y + dy };
  }
}
