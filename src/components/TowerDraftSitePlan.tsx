/**
 * Site plan — top-down · true north up · tower center · device azimuths · remote link paths.
 * Design reference: design_handoff_kgo_es/src/tower.jsx (SitePlan).
 */

import { useMemo } from "react";
import { useCanvasPanZoom } from "../useCanvasPanZoom";
import ViewNavBar from "./ViewNavBar";
import type { ContentBounds } from "../viewNavUtils";
import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import { resolveDeviceLabel } from "../displayName";
import {
  collectSitePlanRemoteCards,
  deviceSiteTone,
  isOmniSiteDevice,
  layoutRemoteSiteCards,
  resolveSitePlanAzimuth,
} from "../towerDraftSitePlanData";

interface TowerDraftSitePlanProps {
  page: TowerDraftPage;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  embedded?: boolean;
  onOpenSurveyInTrackIt?: () => void;
}

const W = 660;
const H = 540;
const CX = 286;
const CY = 272;
const R = 178;
const CARD_W = 150;
const CARD_H = 42;
const CARD_GAP = 8;

function azXY(az: number, radius: number): { x: number; y: number } {
  return {
    x: CX + radius * Math.sin((az * Math.PI) / 180),
    y: CY - radius * Math.cos((az * Math.PI) / 180),
  };
}

const CARDINALS: [string, number][] = [
  ["N", 0],
  ["E", 90],
  ["S", 180],
  ["W", 270],
];

export default function TowerDraftSitePlan({
  page,
  selectedPlacementId,
  onSelectPlacement,
  embedded = false,
  onOpenSurveyInTrackIt,
}: TowerDraftSitePlanProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);

  const placements = useMemo(() => {
    return page.placements.map((pl) => {
      const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data as DeviceData | undefined;
      const az = resolveSitePlanAzimuth(pl, data, trackItTowerContext);
      const omni = isOmniSiteDevice(data);
      const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
      const tone = deviceSiteTone(data?.deviceType);
      return { pl, data, az, omni, label, tone };
    });
  }, [page.placements, nodes, trackItTowerContext, useShortNames]);

  const viewBounds = useMemo((): ContentBounds => ({ minX: 0, minY: 0, maxX: W, maxY: H }), []);
  const panZoom = useCanvasPanZoom({ fitBounds: viewBounds, fitDeps: [page.id] });

  const remoteCards = useMemo(() => {
    const raw = collectSitePlanRemoteCards({
      page,
      nodes: nodes
        .filter((n) => n.type === "device")
        .map((n) => ({ id: n.id, data: n.data as DeviceData })),
      edges,
      trackItTowerContext,
      selectedPlacementId,
      useShortNames,
    });
    return layoutRemoteSiteCards(raw, CX, CY, H, CARD_H, CARD_GAP);
  }, [page, nodes, edges, trackItTowerContext, selectedPlacementId, useShortNames]);

  const svg = (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Tower site plan"
      style={{ display: "block", fontFamily: "var(--ti-font-sans)" }}
    >
      <text x={26} y={26} fontSize={13} fontWeight={700} fill="var(--ti-ink)">
        Site plan — azimuth &amp; data paths
      </text>
      <text x={26} y={42} fontSize={10.5} fill="var(--ti-muted)">
        Top-down · microwave &amp; fiber links to remote sites · true north up
      </text>

      <circle
        cx={CX}
        cy={CY}
        r={R + 4}
        fill="color-mix(in oklab, var(--ti-accent) 3%, var(--ti-surface))"
        stroke="color-mix(in oklab, var(--ti-ink) 24%, transparent)"
        strokeWidth={1.2}
      />

      {[R, R * 0.66, R * 0.33].map((r, i) => (
        <circle
          key={i}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke="color-mix(in oklab, var(--ti-ink) 16%, transparent)"
          strokeWidth={1}
          strokeDasharray="2 5"
        />
      ))}

      {Array.from({ length: 12 }, (_, i) => i * 30).map((az) => {
        const card = az % 90 === 0;
        const a = azXY(az, R);
        const b = azXY(az, R - (card ? 12 : 7));
        return (
          <line
            key={az}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="color-mix(in oklab, var(--ti-ink) 32%, transparent)"
            strokeWidth={card ? 1.4 : 1}
            opacity={card ? 1 : 0.6}
          />
        );
      })}

      {CARDINALS.map(([label, az]) => {
        const e = azXY(az, R);
        const t = azXY(az, R + 20);
        return (
          <g key={label}>
            <line
              x1={CX}
              y1={CY}
              x2={e.x}
              y2={e.y}
              stroke="color-mix(in oklab, var(--ti-ink) 14%, transparent)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--ti-muted)">
              {label}
            </text>
          </g>
        );
      })}

      {placements.map(({ pl, az, omni, label, tone }) => {
        if (az == null) return null;
        const isSel = selectedPlacementId === pl.id;
        const color = `var(--ti-${tone})`;
        const p = azXY(az, R * 0.66);
        const ip = azXY(az, R * 0.33);
        return (
          <g
            key={pl.id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelectPlacement(isSel ? null : pl.id)}
          >
            {!omni && (
              <line
                x1={ip.x}
                y1={ip.y}
                x2={p.x}
                y2={p.y}
                stroke={color}
                strokeWidth={isSel ? 1.6 : 1}
                opacity={isSel ? 0.9 : 0.4}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isSel ? 6.5 : 4.5}
              fill={isSel ? color : "var(--ti-surface)"}
              stroke={color}
              strokeWidth={1.6}
            />
            {omni && (
              <circle
                cx={p.x}
                cy={p.y}
                r={isSel ? 10 : 8}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.5}
              />
            )}
            <title>{label}</title>
          </g>
        );
      })}

      {remoteCards.map(({ key, label, az, dist, band, linked, e, right, cardY }) => {
        const col = linked ? "var(--ti-accent)" : "var(--ti-warning)";
        const cardX = right ? Math.min(e.x + 16, W - CARD_W - 8) : Math.max(e.x - 16 - CARD_W, 8);
        const connX = right ? cardX : cardX + CARD_W;
        return (
          <g key={key}>
            <line
              x1={CX}
              y1={CY}
              x2={e.x}
              y2={e.y}
              stroke={col}
              strokeWidth={linked ? 2.4 : 1.6}
              opacity={linked ? 1 : 0.75}
            />
            <path
              d={`M ${e.x} ${e.y} L ${connX} ${cardY}`}
              fill="none"
              stroke={col}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <circle cx={e.x} cy={e.y} r={5} fill={col} stroke="var(--ti-surface)" strokeWidth={1.4} />
            <g transform={`translate(${cardX},${cardY - CARD_H / 2})`}>
              <rect
                width={CARD_W}
                height={CARD_H}
                rx={8}
                fill="var(--ti-surface)"
                stroke={linked ? col : "var(--ti-border)"}
                strokeWidth={linked ? 1.6 : 1}
              />
              <rect width={4} height={CARD_H} rx={2} fill={col} />
              <text x={12} y={17} fontSize={11.5} fontWeight={600} fill="var(--ti-ink)">
                {label.length > 18 ? `${label.slice(0, 16)}…` : label}
              </text>
              <text x={12} y={31} fontSize={9} fill="var(--ti-muted)" fontFamily="var(--ti-font-mono)">
                {Math.round(az)}° · {dist} · {band}
              </text>
            </g>
          </g>
        );
      })}

      <rect
        x={CX - 42}
        y={CY - 7}
        width={30}
        height={26}
        rx={3}
        fill="var(--ti-surface-2)"
        stroke="var(--ti-ink-2)"
        strokeWidth={1.4}
      />
      <text x={CX - 27} y={CY + 33} textAnchor="middle" fontSize={8.5} fill="var(--ti-muted)">
        Bldg
      </text>
      <rect
        x={CX - 11}
        y={CY - 11}
        width={22}
        height={22}
        fill="var(--ti-surface)"
        stroke="var(--ti-ink)"
        strokeWidth={1.8}
        transform={`rotate(45 ${CX} ${CY})`}
      />
      <text x={CX} y={CY + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--ti-ink)">
        TWR
      </text>

      <g transform={`translate(26,${H - 30})`}>
        <line x1={0} y1={-3} x2={20} y2={-3} stroke="var(--ti-warning)" strokeWidth={1.8} />
        <text x={26} y={0} fontSize={10} fill="var(--ti-muted)">
          Remote path
        </text>
        <circle
          cx={120}
          cy={-3}
          r={4.5}
          fill="var(--ti-surface)"
          stroke="var(--ti-accent)"
          strokeWidth={1.6}
        />
        <text x={132} y={0} fontSize={10} fill="var(--ti-muted)">
          Device azimuth · click to select
        </text>
      </g>

      {trackItTowerContext?.latitude != null && trackItTowerContext?.longitude != null && (
        <text
          x={W - 10}
          y={H - 10}
          textAnchor="end"
          fontSize={9}
          fill="var(--ti-muted)"
          fontFamily="var(--ti-font-mono)"
        >
          {trackItTowerContext.latitude.toFixed(5)}, {trackItTowerContext.longitude.toFixed(5)}
        </text>
      )}
    </svg>
  );

  const wrapped = (
    <div
      ref={panZoom.containerRef}
      className={embedded ? "relative w-full h-full min-h-[320px]" : "relative flex-1 min-h-0 overflow-hidden"}
      style={{
        background: embedded ? undefined : "var(--ti-bg)",
        fontFamily: "var(--ti-font-sans)",
        cursor: panZoom.isPanning ? "grabbing" : "default",
      }}
      onMouseDown={panZoom.onMouseDown}
      onMouseMove={panZoom.onMouseMove}
      onMouseUp={panZoom.onMouseUp}
      onMouseLeave={panZoom.onMouseUp}
    >
      <div
        style={{
          transform: panZoom.transform,
          transformOrigin: "0 0",
          width: W,
          height: H,
        }}
      >
        {svg}
      </div>
      <ViewNavBar
        zoom={panZoom.zoom}
        onZoomIn={panZoom.zoomInView}
        onZoomOut={panZoom.zoomOutView}
        onFitAll={() => panZoom.fitAllView(viewBounds)}
      />
      {onOpenSurveyInTrackIt && (
        <button
          type="button"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            height: 28,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid var(--ti-border)",
            background: "color-mix(in oklab, var(--ti-surface) 90%, transparent)",
            color: "var(--ti-ink-2)",
            fontSize: 11.5,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--ti-font-sans)",
            backdropFilter: "blur(6px)",
          }}
          onClick={onOpenSurveyInTrackIt}
        >
          Site survey in trackIT ↗
        </button>
      )}
    </div>
  );

  if (embedded) return wrapped;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: "var(--ti-bg)" }}>
      {wrapped}
    </div>
  );
}
