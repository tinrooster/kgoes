import type { PortDetails } from "../domain/types";
import { resolveServiceStyle } from "../serviceSchema";

interface PatchPortWithTooltipProps {
  port: PortDetails;
  x: number;
  y: number;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onStartDrag: (id: string, x: number, y: number) => void;
  onPortClick: (port: PortDetails) => void;
  onShowTooltip: (port: PortDetails | null, svgX: number, svgY: number) => void;
  onHoverPort?: (portId: string | null) => void;
}

export function PatchPortWithTooltip({
  port,
  x,
  y,
  isHighlighted = false,
  isSelected = false,
  onStartDrag,
  onPortClick,
  onShowTooltip,
  onHoverPort,
}: PatchPortWithTooltipProps) {
  const style = resolveServiceStyle(port.serviceType);
  const radius = 10;
  const active = isHighlighted || isSelected;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-crosshair select-none group"
      onPointerDown={(e) => {
        e.stopPropagation();
        onStartDrag(port.id, x, y);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPortClick(port);
      }}
      onPointerEnter={() => {
        onShowTooltip(port, x, y - 15);
        onHoverPort?.(port.id);
      }}
      onPointerLeave={() => {
        onShowTooltip(null, 0, 0);
        onHoverPort?.(null);
      }}
    >
      <circle r={radius + 8} fill="transparent" />
      {isSelected && (
        <circle r={radius + 5} fill="none" stroke={style.stroke} strokeWidth={2} opacity={0.6} />
      )}
      <rect
        x={-8}
        y={-8}
        width={16}
        height={16}
        rx={2}
        fill={active ? style.hoverFill : style.fill}
        stroke={active ? style.stroke : "#94a3b8"}
        strokeWidth={active ? 2 : 1.5}
        className="transition-colors duration-150"
      />
      <rect x={-5} y={-2} width={10} height={7} fill="#cbd5e1" rx={1} />
      <text
        x={0}
        y={-12}
        textAnchor="middle"
        fontSize={9}
        fontWeight={active ? "bold" : "normal"}
        fill={active ? style.stroke : "#64748b"}
      >
        {port.portNumber}
      </text>
    </g>
  );
}
