import type { TowerElevationView, TowerFace } from "./towerDraftFaces";
import { aimableGlyphRotationDeg } from "./towerDraftFaces";
import type { DeviceData } from "./types";

export const TOWER_GLYPH_SIZE = 36;
const REF_DISH_DIAMETER_M = 1.2192;

interface TowerDraftGlyphProps {
  deviceType?: string;
  selected?: boolean;
  hovered?: boolean;
  azimuthDeg?: number;
  dishDiameterM?: number;
  elevationView?: TowerElevationView;
  viewFace?: TowerFace;
  placementFace?: TowerFace;
  mountFlip?: boolean;
}

function dishScale(dishDiameterM?: number): number {
  const d = dishDiameterM && dishDiameterM > 0 ? dishDiameterM : REF_DISH_DIAMETER_M;
  return Math.max(0.55, Math.min(1.45, d / REF_DISH_DIAMETER_M));
}

/** Parabolic dish — mount at (cx, cy); boresight = concave opening toward +X; feedhorn behind mount (−X). */
function dishSymbolOut(stroke: string, scale: number, cx: number, cy: number) {
  const halfH = 12 * scale;
  const lipX = cx + 11 * scale + Math.max(0, scale - 1) * 3;
  const feedX = cx - 11 * scale;
  return (
    <g>
      <path
        d={`M ${cx} ${cy - halfH} Q ${lipX} ${cy} ${cx} ${cy + halfH}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
      />
      <line x1={feedX} y1={cy} x2={cx} y2={cy} stroke={stroke} strokeWidth={1.5} />
      <line
        x1={feedX}
        y1={cy - 4 * scale}
        x2={feedX}
        y2={cy + 4 * scale}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </g>
  );
}

/** Canvas point that sits on the tower mast / placement anchor (within the glyph box). */
export function towerGlyphMountPoint(deviceType?: string): { x: number; y: number } {
  const cy = TOWER_GLYPH_SIZE / 2;
  const cx = TOWER_GLYPH_SIZE / 2;
  switch (deviceType) {
    case "microwave-dish":
    case "microwave-horn":
    case "microwave-odu":
    case "outdoor-ptz-camera":
    case "camera":
    case "ptz-camera":
      return { x: cx, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

/** Outdoor PTZ — dome on mast; lens boresight toward +X at 0° azimuth. */
function outdoorPtzSymbol(stroke: string, fill: string, cx: number, cy: number) {
  return (
    <g stroke={stroke} fill={fill}>
      <line x1={cx} y1={cy + 2} x2={cx} y2={cy + 10} strokeWidth={1.5} />
      <path
        d={`M ${cx - 9} ${cy + 2} Q ${cx} ${cy - 10} ${cx + 9} ${cy + 2} Z`}
        strokeWidth={1.4}
      />
      <circle cx={cx + 6} cy={cy - 2} r={2.8} fill="none" strokeWidth={1.3} />
      <path d={`M ${cx + 4} ${cy - 5} L ${cx + 10} ${cy - 3}`} strokeWidth={0.9} fill="none" />
    </g>
  );
}

function towerSymbol(
  deviceType: string | undefined,
  stroke: string,
  fill: string,
  dishDiameterM?: number,
) {
  const cx = TOWER_GLYPH_SIZE / 2;
  const cy = TOWER_GLYPH_SIZE / 2;
  switch (deviceType) {
    case "microwave-dish": {
      const scale = dishScale(dishDiameterM);
      return dishSymbolOut(stroke, scale, cx, cy);
    }
    case "microwave-odu":
      return (
        <g>
          <path d={`M ${cx} ${cy - 8} Q ${cx + 10} ${cy} ${cx} ${cy + 8}`} fill="none" stroke={stroke} strokeWidth={1.4} />
          <rect x={cx - 12} y={cy - 4} width={8} height={8} rx={1} fill={fill} stroke={stroke} strokeWidth={1.2} />
        </g>
      );
    case "rf-antenna":
    case "rf-slot-panel":
      return (
        <g>
          <rect x={cx - 10} y={8} width={20} height={24} rx={1} fill={fill} stroke={stroke} strokeWidth={1.5} />
          {[14, 18, 22, 26].map((y) => (
            <line key={y} x1={cx - 8} y1={y} x2={cx + 8} y2={y} stroke={stroke} strokeWidth={0.6} opacity={0.65} />
          ))}
        </g>
      );
    case "rf-repeater-antenna":
    case "rf-collinear":
      return (
        <g stroke={stroke} fill={fill}>
          <line x1={cx - 4} y1={10} x2={cx - 4} y2={30} strokeWidth={1.2} />
          <line x1={cx + 1} y1={8} x2={cx + 1} y2={32} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={cx - 7} y1={14} x2={cx - 4} y2={14} strokeWidth={1.3} />
          <line x1={cx - 7} y1={22} x2={cx - 4} y2={22} strokeWidth={1.3} />
          <circle cx={cx + 1} cy={8} r={1.2} fill={stroke} stroke="none" />
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
          <path d={`M ${cx} ${cy - 6} L ${cx + 16} ${cy} L ${cx} ${cy + 6} Z`} />
        </g>
      );
    case "outdoor-ptz-camera":
    case "camera":
    case "ptz-camera":
      return outdoorPtzSymbol(stroke, fill, cx, cy);
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
export function TowerDraftPlacementGlyph({
  deviceType,
  selected,
  hovered,
  azimuthDeg,
  dishDiameterM,
  elevationView = "profile",
  viewFace,
  placementFace,
  mountFlip,
}: TowerDraftGlyphProps) {
  const stroke = selected
    ? "#3b82f6"
    : hovered
      ? "var(--color-text-muted)"
      : "var(--color-text)";
  const fill = selected ? "var(--color-surface)" : "var(--color-bg)";
  const rotationDeg = aimableGlyphRotationDeg(
    deviceType,
    azimuthDeg,
    elevationView,
    viewFace,
    placementFace,
    mountFlip,
  );
  const aimableOutward =
    deviceType === "microwave-dish" ||
    deviceType === "microwave-horn" ||
    deviceType === "microwave-odu" ||
    deviceType === "outdoor-ptz-camera" ||
    deviceType === "camera" ||
    deviceType === "ptz-camera";
  const showAimTick =
    azimuthDeg != null &&
    rotationDeg == null &&
    !aimableOutward &&
    deviceType !== "rf-repeater-antenna" &&
    deviceType !== "rf-collinear";

  const cx = TOWER_GLYPH_SIZE / 2;
  const cy = TOWER_GLYPH_SIZE / 2;
  const mount = towerGlyphMountPoint(deviceType);

  return (
    <g transform={`translate(${-mount.x}, ${-mount.y})`}>
      {(selected || hovered) && (
        <rect
          x={1}
          y={1}
          width={TOWER_GLYPH_SIZE - 2}
          height={TOWER_GLYPH_SIZE - 2}
          rx={4}
          fill="none"
          stroke={selected ? "#3b82f6" : hovered ? "#94a3b8" : "transparent"}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={hovered && !selected ? "3 2" : undefined}
        />
      )}
      <rect x={0} y={0} width={TOWER_GLYPH_SIZE} height={TOWER_GLYPH_SIZE} fill="transparent" />
      <g transform={rotationDeg != null ? `rotate(${rotationDeg} ${mount.x} ${mount.y})` : undefined}>
        {towerSymbol(deviceType, stroke, fill, dishDiameterM)}
      </g>
      {showAimTick && (
        <g stroke="#fbbf24" strokeWidth={1.4}>
          <line
            x1={cx}
            y1={cy}
            x2={cx + 10 * Math.sin((azimuthDeg * Math.PI) / 180)}
            y2={cy - 10 * Math.cos((azimuthDeg * Math.PI) / 180)}
          />
        </g>
      )}
    </g>
  );
}

export function deviceTypeFromData(data?: DeviceData): string | undefined {
  return data?.deviceType;
}

export function dishDiameterMFromData(data?: DeviceData): number | undefined {
  const raw = data?.dishDiameterM;
  return typeof raw === "number" && raw > 0 ? raw : undefined;
}
