import { useCallback, useMemo, useRef } from "react";
import { ftAglToY } from "../towerDraftUtils";
import { visibleContentYRange } from "../towerDraftTallViewport";
import {
  contentYToMinimapY,
  minimapYToContentY,
  TOWER_REFERENCE_MINIMAP_PRESERVE_ASPECT,
  towerBandInSvg,
} from "../towerDraftMinimapCoords";
import type { TowerElevationReferenceImage, TowerGuideBandFt } from "../types";

const MINI_W = 132;
const MINI_PAD = 6;

export interface TowerDraftMinimapProps {
  towerHeightFt: number;
  pxPerFt: number;
  contentOffsetY: number;
  guideBandsFt: TowerGuideBandFt[];
  elevationRef?: TowerElevationReferenceImage | null;
  zoom: number;
  viewOffset: { x: number; y: number };
  containerHeight: number;
  onPanToContentY: (contentY: number) => void;
}

export default function TowerDraftMinimap({
  towerHeightFt,
  pxPerFt,
  contentOffsetY,
  guideBandsFt,
  elevationRef,
  zoom,
  viewOffset,
  containerHeight,
  onPanToContentY,
}: TowerDraftMinimapProps) {
  const miniH = Math.min(300, Math.max(180, containerHeight * 0.48));
  const innerH = miniH - MINI_PAD * 2;
  const innerW = MINI_W - MINI_PAD * 2;
  const miniRef = useRef<SVGSVGElement>(null);

  const band = useMemo(
    () => towerBandInSvg(towerHeightFt, pxPerFt, contentOffsetY),
    [towerHeightFt, pxPerFt, contentOffsetY],
  );

  const toMini = useCallback(
    (contentY: number) => contentYToMinimapY(contentY, band, MINI_PAD, innerH),
    [band, innerH],
  );

  const { top: visTop, bottom: visBottom } = visibleContentYRange({
    containerHeight,
    viewOffsetY: viewOffset.y,
    zoom,
  });

  const viewportRect = useMemo(() => {
    const y1 = toMini(visTop);
    const y2 = toMini(visBottom);
    return {
      x: MINI_PAD,
      y: Math.min(y1, y2),
      w: innerW,
      h: Math.max(10, Math.abs(y2 - y1)),
    };
  }, [visTop, visBottom, toMini, innerW]);

  const onMiniPointer = useCallback(
    (clientY: number) => {
      const svg = miniRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const localY = clientY - rect.top;
      onPanToContentY(minimapYToContentY(localY, band, MINI_PAD, innerH));
    },
    [onPanToContentY, band, innerH],
  );

  return (
    <div
      className="absolute z-20 rounded-md border shadow-md select-none"
      style={{
        right: 12,
        bottom: 52,
        width: MINI_W,
        background: "color-mix(in oklab, var(--ti-surface) 94%, transparent)",
        borderColor: "var(--ti-border)",
        fontFamily: "var(--ti-font-sans)",
      }}
      title="Minimap — click to pan; base aligns with grade"
    >
      <div
        className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--ti-muted)", borderBottom: "1px solid var(--ti-border)" }}
      >
        Tower overview
      </div>
      <svg
        ref={miniRef}
        width={MINI_W}
        height={miniH}
        viewBox={`0 0 ${MINI_W} ${miniH}`}
        className="block cursor-crosshair"
        onMouseDown={(e) => {
          e.preventDefault();
          onMiniPointer(e.clientY);
          const onMove = (ev: MouseEvent) => onMiniPointer(ev.clientY);
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <rect width={MINI_W} height={miniH} fill="var(--ti-surface-2)" rx={4} />
        {elevationRef?.url ? (
          <image
            href={elevationRef.url}
            x={MINI_PAD}
            y={MINI_PAD}
            width={innerW}
            height={innerH}
            preserveAspectRatio={TOWER_REFERENCE_MINIMAP_PRESERVE_ASPECT}
            opacity={elevationRef.opacity ?? 0.5}
            style={{
              mixBlendMode:
                elevationRef.blendMode === "multiply"
                  ? "multiply"
                  : elevationRef.blendMode === "lighten"
                    ? "lighten"
                    : undefined,
            }}
          />
        ) : (
          <line
            x1={MINI_W / 2}
            y1={MINI_PAD}
            x2={MINI_W / 2}
            y2={miniH - MINI_PAD}
            stroke="var(--ti-faint)"
            strokeWidth={2}
          />
        )}
        {guideBandsFt.map((b) => {
          const y = toMini(ftAglToY(b.ftAgl, towerHeightFt, pxPerFt) + contentOffsetY);
          return (
            <line
              key={`${b.ftAgl}-${b.label ?? ""}`}
              x1={MINI_PAD}
              y1={y}
              x2={MINI_W - MINI_PAD}
              y2={y}
              stroke="color-mix(in oklab, var(--ti-accent) 40%, transparent)"
              strokeWidth={0.85}
            />
          );
        })}
        <line
          x1={MINI_PAD}
          y1={toMini(band.towerGround)}
          x2={MINI_W - MINI_PAD}
          y2={toMini(band.towerGround)}
          stroke="color-mix(in oklab, var(--ti-ink) 45%, transparent)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.w}
          height={viewportRect.h}
          fill="color-mix(in oklab, var(--ti-accent) 14%, transparent)"
          stroke="var(--ti-accent)"
          strokeWidth={1.25}
          rx={2}
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}
