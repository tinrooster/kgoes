import type { CableSegment } from "../domain/types";

interface TopologyGraph {
  segments: CableSegment[];
}

function buildAdjacency(segments: CableSegment[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!adjacency.has(u)) adjacency.set(u, []);
    if (!adjacency.has(v)) adjacency.set(v, []);
    adjacency.get(u)!.push(v);
    adjacency.get(v)!.push(u);
  };
  for (const seg of segments) {
    addEdge(seg.sourcePortId, seg.destinationPortId);
  }
  return adjacency;
}

function hasUndirectedCycle(adjacency: Map<string, string[]>, start: string): boolean {
  const visited = new Set<string>();

  function dfs(node: string, parent: string | null): boolean {
    visited.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== parent) {
        return true;
      }
    }
    return false;
  }

  return dfs(start, null);
}

/**
 * Returns true when adding a patch would create a circular loop in the physical graph.
 */
export function detectNetworkLoop(
  graph: TopologyGraph,
  candidateSourcePortId: string,
  candidateDestPortId: string,
): boolean {
  if (candidateSourcePortId === candidateDestPortId) return true;

  const adjacency = buildAdjacency(graph.segments);
  const addEdge = (u: string, v: string) => {
    if (!adjacency.has(u)) adjacency.set(u, []);
    if (!adjacency.has(v)) adjacency.set(v, []);
    adjacency.get(u)!.push(v);
    adjacency.get(v)!.push(u);
  };
  addEdge(candidateSourcePortId, candidateDestPortId);

  return hasUndirectedCycle(adjacency, candidateSourcePortId);
}
