import { useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useSchematicStore } from "../store";
import ViewNavBar from "./ViewNavBar";

/** Zoom / fit toolbar for the main drawing (React Flow) canvas. */
export default function SchematicViewNav() {
  const { zoom } = useViewport();
  const rf = useReactFlow();
  const hasSelection = useSchematicStore((s) => s.nodes.some((n) => n.selected));

  const zoomIn = useCallback(() => {
    void rf.zoomIn({ duration: 150 });
  }, [rf]);

  const zoomOut = useCallback(() => {
    void rf.zoomOut({ duration: 150 });
  }, [rf]);

  const fitAll = useCallback(() => {
    void rf.fitView({ duration: 200, padding: 0.12 });
  }, [rf]);

  const fitSelection = useCallback(() => {
    const selected = useSchematicStore.getState().nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    void rf.fitView({
      nodes: selected.map((n) => ({ id: n.id })),
      duration: 200,
      padding: 0.2,
    });
  }, [rf]);

  return (
    <ViewNavBar
      className="bottom-2 left-3"
      zoom={zoom}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onFitAll={fitAll}
      onFitSelection={fitSelection}
      selectionDisabled={!hasSelection}
    />
  );
}
