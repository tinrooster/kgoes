import { memo, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useSchematicStore } from "../store";
import { nodeTypes, edgeTypes } from "../nodeTypes";
import { computeFitViewport, type ContentBounds } from "../viewNavUtils";
import DrawingRouteSync from "./DrawingRouteSync";

interface InnerProps {
  widthPx: number;
  heightPx: number;
  region?: ContentBounds | null;
}

function DrawingViewportPreviewInner({ widthPx, heightPx, region }: InnerProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const edgeHitboxSize = useSchematicStore((s) => s.edgeHitboxSize);
  const rf = useReactFlow();

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

  const bounds = region ?? null;

  useEffect(() => {
    if (!bounds || widthPx <= 0 || heightPx <= 0) return;
    const { zoom, pan } = computeFitViewport(widthPx, heightPx, bounds, {
      padding: 8,
      maxZoom: 8,
      minZoom: 0.02,
    });
    const timer = window.setTimeout(() => {
      rf.setViewport({ x: pan.x, y: pan.y, zoom }, { duration: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [bounds, widthPx, heightPx, rf, displayNodes]);

  if (!bounds || nodes.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-neutral-50 border border-neutral-200 text-neutral-400"
        style={{ fontSize: 10 }}
      >
        Empty drawing
      </div>
    );
  }

  return (
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
      zoomOnDoubleClick={false}
      preventScrolling
      panOnScroll={false}
      selectionOnDrag={false}
      minZoom={0.02}
      maxZoom={8}
      proOptions={{ hideAttribution: true }}
      style={{ width: widthPx, height: heightPx, background: "#fff" }}
    >
      <DrawingRouteSync />
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e5e5" />
    </ReactFlow>
  );
}

interface Props {
  widthPx: number;
  heightPx: number;
  region?: ContentBounds | null;
}

function DrawingViewportPreview({ widthPx, heightPx, region }: Props) {
  return (
    <ReactFlowProvider>
      <DrawingViewportPreviewInner widthPx={widthPx} heightPx={heightPx} region={region} />
    </ReactFlowProvider>
  );
}

export default memo(DrawingViewportPreview);
