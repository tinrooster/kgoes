import type { DeviceData } from "./types";

export const TOWER_GLYPH_SIZE = 36;

interface TowerDraftGlyphProps {
  deviceType?: string;
  selected?: boolean;
  hovered?: boolean;
  azimuthDeg?: number;
}

function towerSymbol(deviceType: string | undefined, stroke: string, fill: string) {
  const cx = TOWER_GLYPH_SIZE / 2;
  switch (deviceType) {
    case "microwave-dish":
      return (
        <g>
          <path d={`M 6 28 Q ${cx} 6 30 28`} fill="none" stroke={stroke} strokeWidth={1.8} />
          <line x1={cx} y1={28} x2={cx} y2={33} stroke={stroke} strokeWidth={1.5} />
          <line x1={cx - 6} y1={33} x2={cx + 6} y2={33} stroke={stroke} strokeWidth={1.5} />
        </g>
      );
    case "microwave-odu":
      return (
        <g>
          <path d={`M 8 26 Q ${cx} 10 28 26`} fill="none" stroke={stroke} strokeWidth={1.4} />
          <rect x={cx - 6} y={24} width={12} height={7} rx={1} fill={fill} stroke={stroke} strokeWidth={1.2} />
        </g>
      );
    case "rf-antenna":
    case "rf-slot-panel":
      return (
        <g>
          <rect x={cx - 10} y={8} width={20} height={24} rx={1} fill={fill} stroke={stroke} strokeWidth={1.5} />
          {[14, 18, 22, 26].map((y) => (
            <line key={y} x1={cx - 8} y1={y} x2={cx + 8} y2={y} stroke="#94a3b8" strokeWidth={0.6} />
          ))}
        </g>
      );
    case "rf-yagi":
      return (
        <g stroke={stroke} fill="none" strokeWidth={1.3}>
          <line x1={8} y1={cx} x2={28} y2={cx} />
          <line x1={14} y1={14} x2={14} y2={28} />
          <line x1={cx} y1={12} x2={cx} y2={30} />
          <line x1={22} y1={14} x2={22} y2={28} />
        </g>
      );
    case "microwave-horn":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={1.4}>
          <path d={`M 10 22 L ${cx} 15 L ${cx} 29 Z`} />
          <rect x={cx} y={19} width={12} height={7} />
        </g>
      );
    case "tower-obstruction-light":
    case "site-obstruction-light":
      return (
        <g>
          <circle cx={cx} cy={16} r={5} fill="#ef4444" stroke="#b91c1c" strokeWidth={1.2} />
          <line x1={cx} y1={21} x2={cx} y2={30} stroke={stroke} strokeWidth={1.5} />
        </g>
      );
    case "site-rest-platform":
      return (
        <g stroke={stroke} fill={fill} strokeWidth={1.4}>
          <line x1={6} y1={22} x2={30} y2={22} />
          <line x1={cx} y1={22} x2={cx - 4} y2={30} />
          <line x1={cx} y1={22} x2={cx + 4} y2={30} />
        </g>
      );
    default:
      return (
        <rect x={cx - 10} y={12} width={20} height={16} rx={2} fill={fill} stroke={stroke} strokeWidth={1.3} />
      );
  }
}

/** Icon-only elevation symbol (labels via tooltip / sidebar). */
export function TowerDraftPlacementGlyph({ deviceType, selected, hovered, azimuthDeg }: TowerDraftGlyphProps) {
  const stroke = selected ? "#2563eb" : hovered ? "#64748b" : "#475569";
  const fill = selected ? "var(--color-surface)" : "var(--color-bg)";

  return (
    <g transform={`translate(${-TOWER_GLYPH_SIZE / 2}, ${-TOWER_GLYPH_SIZE / 2})`}>
      {(selected || hovered) && (
        <rect
          x={1}
          y={1}
          width={TOWER_GLYPH_SIZE - 2}
          height={TOWER_GLYPH_SIZE - 2}
          rx={4}
          fill="none"
          stroke={selected ? "#2563eb" : "#94a3b8"}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={hovered && !selected ? "3 2" : undefined}
        />
      )}
      <rect x={0} y={0} width={TOWER_GLYPH_SIZE} height={TOWER_GLYPH_SIZE} fill="transparent" />
      {towerSymbol(deviceType, stroke, fill)}
      {azimuthDeg != null && (
        <g stroke="#f59e0b" strokeWidth={1.2}>
          <line
            x1={TOWER_GLYPH_SIZE / 2}
            y1={TOWER_GLYPH_SIZE / 2}
            x2={TOWER_GLYPH_SIZE / 2 + 10 * Math.sin((azimuthDeg * Math.PI) / 180)}
            y2={TOWER_GLYPH_SIZE / 2 - 10 * Math.cos((azimuthDeg * Math.PI) / 180)}
          />
        </g>
      )}
    </g>
  );
}

export function deviceTypeFromData(data?: DeviceData): string | undefined {
  return data?.deviceType;
}
