import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { useSchematicStore } from "../store";
import { nodeTypes, edgeTypes } from "../nodeTypes";
import { computeFitViewport, type ContentBounds } from "../viewNavUtils";
import { registerDrawingCapture } from "../drawingCapture";
import DrawingRouteSync from "./DrawingRouteSync";

const EXPORT_PADDING = 24;

function waitForRender(ms = 200): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  });
}

function CaptureFlowInner() {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const edgeHitboxSize = useSchematicStore((s) => s.edgeHitboxSize);
  const rf = useReactFlow();
  const hostRef = useRef<HTMLDivElement>(null);

  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: false, draggable: false, selectable: false })),
    [nodes],
  );
  const displayEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: e.type ?? "smoothstep",
        selected: false,
        selectable: false,
      })),
    [edges],
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: "smoothstep" as const, interactionWidth: edgeHitboxSize }),
    [edgeHitboxSize],
  );

  const capture = useCallback(
    async (bounds: ContentBounds, widthPx: number, heightPx: number): Promise<string | null> => {
      const host = hostRef.current;
      if (!host || nodes.length === 0) return null;

      host.style.width = `${widthPx}px`;
      host.style.height = `${heightPx}px`;

      const { zoom, pan } = computeFitViewport(widthPx, heightPx, bounds, {
        padding: EXPORT_PADDING,
        maxZoom: 4,
        minZoom: 0.02,
      });
      rf.setViewport({ x: pan.x, y: pan.y, zoom }, { duration: 0 });
      await waitForRender(400);

      const viewportEl = host.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewportEl) return null;

      document.documentElement.setAttribute("data-export-capturing", "");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const origGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
      CSSStyleDeclaration.prototype.getPropertyValue = function (prop) {
        return origGetPropertyValue.call(this, prop) ?? "";
      };

      try {
        return await toPng(viewportEl, {
          backgroundColor: "#ffffff",
          width: widthPx,
          height: heightPx,
          pixelRatio: 2,
          style: {
            width: `${widthPx}px`,
            height: `${heightPx}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          },
        });
      } finally {
        CSSStyleDeclaration.prototype.getPropertyValue = origGetPropertyValue;
        document.documentElement.removeAttribute("data-export-capturing");
      }
    },
    [nodes.length, rf],
  );

  useEffect(() => {
    registerDrawingCapture(capture);
    return () => registerDrawingCapture(null);
  }, [capture]);

  return (
    <div
      ref={hostRef}
      id="drawing-capture-host"
      style={{
        position: "fixed",
        left: -20000,
        top: 0,
        visibility: "hidden",
        pointerEvents: "none",
        overflow: "hidden",
        width: 800,
        height: 600,
      }}
      aria-hidden
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        preventScrolling
        proOptions={{ hideAttribution: true }}
        style={{ width: "100%", height: "100%", background: "#fff" }}
      >
        <DrawingRouteSync />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e5e5" />
      </ReactFlow>
    </div>
  );
}

/** Off-screen React Flow used to rasterize drawing viewports for print-sheet PDF export. */
export default function DrawingCaptureHost() {
  return (
    <ReactFlowProvider>
      <CaptureFlowInner />
    </ReactFlowProvider>
  );
}
