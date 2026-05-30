import { memo, type CSSProperties } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import type { AnnotationData } from "../types";
import { useSchematicStore } from "../store";

function AnnotationNode({ id, data, selected }: NodeProps) {
  const annotationData = data as unknown as AnnotationData;
  const bgColor = annotationData.color ?? "rgba(59, 130, 246, 0.1)";
  const border = annotationData.borderColor ?? "#3b82f6";
  const shape = annotationData.shape ?? "rectangle";
  const fontSize = annotationData.fontSize ?? 12;

  const handleDoubleClick = () => {
    useSchematicStore.getState().setEditingNodeId(id);
  };

  if (shape === "hline") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={40} minHeight={2} maxHeight={8} />
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}
          onDoubleClick={handleDoubleClick}
        >
          <div style={{ width: "100%", height: 2, backgroundColor: border }} />
        </div>
      </>
    );
  }

  if (shape === "vline") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={2} minHeight={40} maxWidth={8} />
        <div
          style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}
          onDoubleClick={handleDoubleClick}
        >
          <div style={{ width: 2, height: "100%", backgroundColor: border }} />
        </div>
      </>
    );
  }

  if (shape === "frame-dashed") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={80} minHeight={60} />
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `2px dashed ${border}`,
            borderRadius: 2,
            backgroundColor: bgColor === "rgba(59, 130, 246, 0.1)" ? "transparent" : bgColor,
            boxSizing: "border-box",
          }}
          onDoubleClick={handleDoubleClick}
        />
      </>
    );
  }

  if (shape === "dline") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={40} minHeight={40} />
        <div style={{ width: "100%", height: "100%" }} onDoubleClick={handleDoubleClick}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: "block" }}>
            <line
              x1="0"
              y1="100"
              x2="100"
              y2="0"
              stroke={border}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </>
    );
  }

  if (shape === "north-arrow") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={32} minHeight={44} />
        <div style={{ width: "100%", height: "100%" }} onDoubleClick={handleDoubleClick}>
          <svg width="100%" height="100%" viewBox="0 0 40 56" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
            <polygon points="20,4 36,48 20,40 4,48" fill={border} stroke={border} strokeWidth={0.5} />
            <text x="20" y="52" textAnchor="middle" fontSize="8" fill="#334155" fontFamily="ui-sans-serif,system-ui">
              N
            </text>
          </svg>
        </div>
      </>
    );
  }

  if (shape === "scale-bar") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={120} minHeight={20} />
        <div
          style={{ width: "100%", height: "100%", position: "relative" }}
          onDoubleClick={handleDoubleClick}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "55%",
              height: 2,
              backgroundColor: border,
            }}
          />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              style={{
                position: "absolute",
                left: `${t * 100}%`,
                top: "35%",
                width: 1,
                height: "35%",
                backgroundColor: border,
                transform: "translateX(-50%)",
              }}
            />
          ))}
          {annotationData.label ? (
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%)",
                fontSize,
                fontFamily: "ui-monospace, monospace",
                color: "#334155",
              }}
            >
              {annotationData.label}
            </span>
          ) : null}
        </div>
      </>
    );
  }

  if (shape === "leader") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={80} minHeight={48} />
        <div style={{ position: "relative", width: "100%", height: "100%" }} onDoubleClick={handleDoubleClick}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: "block" }}>
            <polyline
              points="0,100 0,35 100,35"
              fill="none"
              stroke={border}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {annotationData.label ? (
            <span
              style={{
                position: "absolute",
                right: 4,
                top: 4,
                fontSize,
                fontFamily: "ui-sans-serif, system-ui",
                color: "#334155",
                background: "rgba(255,255,255,0.92)",
                padding: "2px 4px",
              }}
            >
              {annotationData.label}
            </span>
          ) : null}
        </div>
      </>
    );
  }

  if (shape === "dimension") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={60} minHeight={16} />
        <div
          style={{ width: "100%", height: "100%", position: "relative" }}
          onDoubleClick={handleDoubleClick}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 1,
              backgroundColor: border,
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1,
              height: 6,
              backgroundColor: border,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 1,
              height: 6,
              backgroundColor: border,
            }}
          />
          {annotationData.label ? (
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: -2,
                transform: "translate(-50%, -100%)",
                fontSize,
                fontFamily: "ui-monospace, monospace",
                color: "#334155",
                whiteSpace: "nowrap",
                background: "rgba(255,255,255,0.9)",
                padding: "0 4px",
              }}
            >
              {annotationData.label}
            </span>
          ) : null}
        </div>
      </>
    );
  }

  const labelStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#333",
    pointerEvents: "none",
    padding: "4px",
    textAlign: "center",
  };

  const label = annotationData.label ? (
    <span style={labelStyle}>{annotationData.label}</span>
  ) : null;

  const polygonPoints =
    shape === "diamond"
      ? "50,2 98,50 50,98 2,50"
      : "50,2 98,98 2,98";

  if (shape === "diamond" || shape === "triangle") {
    return (
      <>
        <NodeResizer isVisible={!!selected} minWidth={60} minHeight={40} />
        <div
          style={{ position: "relative", width: "100%", height: "100%" }}
          onDoubleClick={handleDoubleClick}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <polygon
              points={polygonPoints}
              fill={bgColor}
              stroke={border}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {label}
        </div>
      </>
    );
  }

  const isRound = shape === "ellipse" || shape === "circle";

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={60} minHeight={40} />
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: bgColor,
          border: `2px solid ${border}`,
          borderRadius: isRound ? "50%" : "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: "#333",
          overflow: "hidden",
          textAlign: "center",
          padding: "4px",
        }}
        onDoubleClick={handleDoubleClick}
      >
        {annotationData.label && <span>{annotationData.label}</span>}
      </div>
    </>
  );
}

export default memo(AnnotationNode);
