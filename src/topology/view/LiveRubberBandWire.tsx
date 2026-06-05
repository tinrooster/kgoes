import type { DragPatchGesture } from "../hooks/usePatchCordBuilder";

interface LiveRubberBandWireProps {
  gesture: DragPatchGesture;
  blocked?: boolean;
}

export function LiveRubberBandWire({ gesture, blocked = false }: LiveRubberBandWireProps) {
  const { sourceX, sourceY, currentX, currentY } = gesture;
  const controlY = (sourceY + currentY) / 2;
  const pathData = `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${currentX} ${controlY}, ${currentX} ${currentY}`;
  const glow = blocked ? "#f87171" : "#60a5fa";
  const core = blocked ? "#ef4444" : "#2563eb";

  return (
    <g className="pointer-events-none">
      <path
        d={pathData}
        fill="none"
        stroke={glow}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.4}
        className={blocked ? undefined : "animate-pulse"}
      />
      <path
        d={pathData}
        fill="none"
        stroke={core}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={blocked ? "6 4" : "4 4"}
      />
    </g>
  );
}
