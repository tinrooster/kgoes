import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { viewportFromFlowBounds } from "../drawingViewportBounds";
import { useSchematicStore } from "../store";
import type { InitialViewportMode } from "../drawingSetupDefaults";

/** Apply overview or origin-centered viewport after new drawing setup. */
export function usePendingInitialViewport(): void {
  const pending = useSchematicStore((s) => s.pendingInitialViewport);
  const loadSeq = useSchematicStore((s) => s.loadSeq);
  const schematicCanvasReady = useSchematicStore((s) => s.schematicCanvasReady);
  const clearPendingInitialViewport = useSchematicStore((s) => s.clearPendingInitialViewport);
  const { setViewport, fitView } = useReactFlow();

  useEffect(() => {
    if (!pending || !schematicCanvasReady) return;

    const apply = (mode: InitialViewportMode) => {
      const host = document.querySelector(".react-flow__viewport")?.parentElement;
      if (!host) return;
      const cw = host.clientWidth;
      const ch = host.clientHeight;
      if (mode === "origin") {
        const vp = viewportFromFlowBounds(
          { minX: -120, minY: -120, maxX: 880, maxY: 680 },
          cw,
          ch,
          { padding: 48, maxZoom: 1.2, minZoom: 0.15 },
        );
        setViewport(vp, { duration: 0 });
        return;
      }
      fitView({ duration: 0, padding: 0.12 });
    };

    const id = window.requestAnimationFrame(() => {
      apply(pending);
      clearPendingInitialViewport();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pending, loadSeq, schematicCanvasReady, clearPendingInitialViewport, fitView, setViewport]);
}
