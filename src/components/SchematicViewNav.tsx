import { useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import ViewNavBar from "./ViewNavBar";
import { stepViewZoom } from "../viewZoomUtils";

/** Zoom / fit toolbar for the main drawing (React Flow) canvas. */
export default function SchematicViewNav() {
  const { zoom } = useViewport();
  const rf = useReactFlow();

  const zoomIn = useCallback(() => {
    const next = stepViewZoom(rf.getZoom(), "in");
    void rf.zoomTo(next, { duration: 150 });
  }, [rf]);

  const zoomOut = useCallback(() => {
    const next = stepViewZoom(rf.getZoom(), "out");
    void rf.zoomTo(next, { duration: 150 });
  }, [rf]);

  const fitAll = useCallback(() => {
    void rf.fitView({ duration: 200, padding: 0.12 });
  }, [rf]);

  return (
    <ViewNavBar
      zoom={zoom}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onFitAll={fitAll}
    />
  );
}
