import { useEffect } from "react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import { useSchematicStore } from "../store";

/**
 * Ensures routed edge geometry exists for off-screen / print-sheet React Flow instances.
 * Skips when the main drawing already computed routes (avoids overwriting with stale measurements).
 */
export default function DrawingRouteSync() {
  const rf = useReactFlow();
  const ready = useNodesInitialized();
  const edgeCount = useSchematicStore((s) => s.edges.length);
  const routedCount = useSchematicStore((s) => Object.keys(s.routedEdges).length);

  useEffect(() => {
    if (!ready || edgeCount === 0) return;
    if (routedCount > 0) return;

    const timer = window.setTimeout(() => {
      const state = useSchematicStore.getState();
      if (Object.keys(state.routedEdges).length > 0) return;
      if (state.autoRoute) state.recomputeRoutes(rf);
      else state.computeSimpleRoutes(rf);
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, edgeCount, routedCount, rf]);

  return null;
}
