import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import { TowerDraftPlacementGlyph, TOWER_GLYPH_SIZE } from "../towerDraftGlyphs";
import {
  ftAglToY,
  suggestPlacementOffsetX,
  TOWER_DRAFT_PX_PER_FT,
  TOWER_DRAFT_RULER_W,
  towerDraftContentWidth,
  towerDraftGroundY,
  towerDraftPolylineDash,
  towerDraftTowerCenterX,
  yToFtAglWithSnap,
} from "../towerDraftUtils";
import ViewNavBar from "./ViewNavBar";
import { stepViewZoom } from "../viewZoomUtils";
import { resolveDeviceLabel } from "../displayName";
import { draggedTowerDeviceNodeId, draggedTowerTemplateId } from "./TowerDraftSidebar";
import type { TowerDraftDrawStyle } from "./TowerDraftToolbar";

interface TowerDraftRendererProps {
  page: TowerDraftPage;
  drawMode: boolean;
  snapFt: number;
  drawStyle: TowerDraftDrawStyle;
  selectedPlacementId: string | null;
  selectedPolylineId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onSelectPolyline: (id: string | null) => void;
  onClearSelection: () => void;
  onDrawLineFinished?: () => void;
  onExitDrawMode?: () => void;
}

export default function TowerDraftRenderer({
  page,
  drawMode,
  snapFt,
  drawStyle,
  selectedPlacementId,
  selectedPolylineId,
  onSelectPlacement,
  onSelectPolyline,
  onClearSelection,
  onDrawLineFinished,
  onExitDrawMode,
}: TowerDraftRendererProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const addDevice = useSchematicStore((s) => s.addDevice);
  const addTowerDraftPlacement = useSchematicStore((s) => s.addTowerDraftPlacement);
  const updateTowerDraftPlacement = useSchematicStore((s) => s.updateTowerDraftPlacement);
  const addTowerDraftPolyline = useSchematicStore((s) => s.addTowerDraftPolyline);
  const removeTowerDraftPlacement = useSchematicStore((s) => s.removeTowerDraftPlacement);
  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);
  const towerDraftFocusRequest = useSchematicStore((s) => s.towerDraftFocusRequest);
  const requestTowerDraftFocus = useSchematicStore((s) => s.requestTowerDraftFocus);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);

  const labelLayers = page.labelLayers ?? {};

  const svgRef = useRef<SVGSVGElement>(null);
  const contentGroupRef = useRef<SVGGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [draggingPlacementId, setDraggingPlacementId] = useState<string | null>(null);
  const [hoverPlacementId, setHoverPlacementId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorContent, setCursorContent] = useState<{ x: number; y: number } | null>(null);
  const [hoverTip, setHoverTip] = useState<{
    x: number;
    y: number;
    lines: string[];
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    placementId: string;
    deviceNodeId: string;
  } | null>(null);

  const contentW = towerDraftContentWidth();
  const groundY = towerDraftGroundY(page.towerHeightFtAgl);
  const centerX = towerDraftTowerCenterX();
  const towerType = page.towerType ?? "self_support";

  /** Map screen coords into the panned/zoomed content group (fixes click offset). */
  const clientToContent = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const group = contentGroupRef.current;
    if (!svg || !group) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = group.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const snapPoint = useCallback(
    (x: number, y: number) => {
      const ft = yToFtAglWithSnap(y, page.towerHeightFtAgl, snapFt, page.guideBandsFt);
      const snappedY = ftAglToY(ft, page.towerHeightFtAgl);
      return { x, y: snappedY };
    },
    [page.guideBandsFt, page.towerHeightFtAgl, snapFt],
  );

  useEffect(() => {
    if (!towerDraftFocusRequest || towerDraftFocusRequest.pageId !== page.id) return;
    const pl = towerDraftFocusRequest.placementId
      ? page.placements.find((p) => p.id === towerDraftFocusRequest.placementId)
      : undefined;
    const ft = pl?.mountHeightFtAgl ?? towerDraftFocusRequest.mountHeightFtAgl;
    if (ft != null) {
      const y = ftAglToY(ft, page.towerHeightFtAgl);
      setPan({ x: 40, y: Math.max(20, 120 - y * zoom) });
      if (pl) onSelectPlacement(pl.id);
    }
    requestTowerDraftFocus(null);
  }, [towerDraftFocusRequest, page.id, page.placements, page.towerHeightFtAgl, zoom, onSelectPlacement, requestTowerDraftFocus]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!drawMode) {
      setDraftPoints([]);
      setCursorContent(null);
    }
  }, [drawMode]);

  useEffect(() => {
    if (drawMode) setHoverTip(null);
  }, [drawMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !drawMode) return;
      if (draftPoints.length > 0) {
        setDraftPoints([]);
      } else {
        onExitDrawMode?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode, draftPoints.length, onExitDrawMode]);

  const placeDeviceAt = useCallback(
    (deviceNodeId: string, clientX: number, clientY: number) => {
      const { x, y } = clientToContent(clientX, clientY);
      const ft = yToFtAglWithSnap(y, page.towerHeightFtAgl, snapFt, page.guideBandsFt);
      const preferredOffset = x - centerX;
      const offsetX = suggestPlacementOffsetX(page.placements, ft, preferredOffset);
      const id = addTowerDraftPlacement(page.id, {
        deviceNodeId,
        mountHeightFtAgl: ft,
        offsetX,
      });
      onSelectPlacement(id);
    },
    [
      addTowerDraftPlacement,
      centerX,
      clientToContent,
      onSelectPlacement,
      page.id,
      page.placements,
      page.towerHeightFtAgl,
      snapFt,
    ],
  );

  const onCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode) {
      const { x, y } = clientToContent(e.clientX, e.clientY);
      setDraftPoints((prev) => [...prev, snapPoint(x, y)]);
      return;
    }
    if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") {
      onClearSelection();
    }
  };

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!drawMode || draftPoints.length < 2) {
      setDraftPoints([]);
      return;
    }
    addTowerDraftPolyline(page.id, draftPoints, {
      strokeColor: drawStyle.strokeColor,
      strokeWidth: drawStyle.strokeWidth,
      lineStyle: drawStyle.lineStyle,
    });
    setDraftPoints([]);
    onDrawLineFinished?.();
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawMode) return;
    setCursorContent(clientToContent(e.clientX, e.clientY));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const templateId = e.dataTransfer.getData("application/x-tower-template-id") || draggedTowerTemplateId;
    if (templateId) {
      const template = [...DEVICE_TEMPLATES, ...customTemplates].find((t) => t.id === templateId);
      if (template) {
        const nodeId = addDevice(template, { x: -900, y: -900 });
        placeDeviceAt(nodeId, e.clientX, e.clientY);
      }
      return;
    }

    const nodeId = e.dataTransfer.getData("application/x-tower-device-id") || draggedTowerDeviceNodeId;
    if (!nodeId) return;
    placeDeviceAt(nodeId, e.clientX, e.clientY);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes("application/x-tower-device-id") ||
      e.dataTransfer.types.includes("application/x-tower-template-id")
    ) {
      e.preventDefault();
    }
  };

  const towerBody = useMemo(() => {
    const topY = ftAglToY(page.towerHeightFtAgl, page.towerHeightFtAgl);
    const legL = centerX - 18;
    const legR = centerX + 18;
    if (towerType === "monopole") {
      return <line x1={centerX} y1={topY} x2={centerX} y2={groundY} stroke="#64748b" strokeWidth={3} />;
    }
    return (
      <g stroke="#64748b" strokeWidth={1.5} fill="none">
        <line x1={legL} y1={topY} x2={legL - 24} y2={groundY} />
        <line x1={legR} y1={topY} x2={legR + 12} y2={groundY} />
        <line x1={legL} y1={topY} x2={legR} y2={topY} />
        {towerType === "self_support" &&
          [0.25, 0.5, 0.75].map((t) => {
            const y = topY + (groundY - topY) * t;
            return (
              <g key={t} stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="4 3">
                <line x1={legL - 8} y1={y - 12} x2={legR - 8} y2={y + 12} />
                <line x1={legR - 8} y1={y - 12} x2={legL - 8} y2={y + 12} />
              </g>
            );
          })}
      </g>
    );
  }, [centerX, groundY, page.towerHeightFtAgl, towerType]);

  const previewCursor = cursorContent ? snapPoint(cursorContent.x, cursorContent.y) : null;
  const lastDraft = draftPoints[draftPoints.length - 1];
  const rulerTopY = ftAglToY(page.towerHeightFtAgl, page.towerHeightFtAgl);
  const rulerHeight = page.towerHeightFtAgl * TOWER_DRAFT_PX_PER_FT;

  return (
    <div className="relative flex-1 min-h-0 bg-[var(--color-bg)] overflow-hidden">
      <ViewNavBar
        zoom={zoom}
        onZoomIn={() => setZoom((z) => stepViewZoom(z, "in"))}
        onZoomOut={() => setZoom((z) => stepViewZoom(z, "out"))}
        onFitAll={() => {
          setZoom(1);
          setPan({ x: 40, y: 20 });
        }}
      />
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: drawMode ? "crosshair" : "default" }}
        onClick={onCanvasClick}
        onDoubleClick={onCanvasDoubleClick}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setCursorContent(null)}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <rect width="100%" height="100%" fill="var(--color-bg)" />
        <g ref={contentGroupRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <line
            x1={TOWER_DRAFT_RULER_W}
            y1={groundY}
            x2={contentW - 40}
            y2={groundY}
            stroke="var(--color-text-muted)"
            strokeWidth={2}
          />
          <text x={TOWER_DRAFT_RULER_W + 8} y={groundY + 14} fontSize={9} fill="var(--color-text-muted)">
            Grade
          </text>

          <rect
            x={0}
            y={rulerTopY}
            width={TOWER_DRAFT_RULER_W - 4}
            height={rulerHeight}
            fill="var(--color-surface)"
            stroke="var(--color-border)"
            opacity={0.85}
          />
          {page.guideBandsFt.map((band) => {
            const y = ftAglToY(band.ftAgl, page.towerHeightFtAgl);
            return (
              <g key={`${band.ftAgl}-${band.label ?? ""}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={contentW - 20}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="6 4"
                />
                <line
                  x1={TOWER_DRAFT_RULER_W - 8}
                  y1={y}
                  x2={TOWER_DRAFT_RULER_W}
                  y2={y}
                  stroke="var(--color-text-muted)"
                />
                <text
                  x={4}
                  y={y + 3}
                  fontSize={8}
                  fill="var(--color-text-muted)"
                  fontFamily="ui-monospace, monospace"
                  style={{ cursor: drawMode ? "default" : "pointer" }}
                  onClick={(ev) => {
                    if (drawMode) return;
                    ev.stopPropagation();
                    if (selectedPlacementId) {
                      updateTowerDraftPlacement(page.id, selectedPlacementId, {
                        mountHeightFtAgl: band.ftAgl,
                      });
                    }
                  }}
                >
                  {band.label ?? `${band.ftAgl}′`}
                </text>
              </g>
            );
          })}

          {towerBody}

          {page.polylines.map((pl) => {
            const selected = pl.id === selectedPolylineId;
            return pl.points.length >= 2 ? (
              <polyline
                key={pl.id}
                points={pl.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={selected ? "#2563eb" : pl.strokeColor ?? "#94a3b8"}
                strokeWidth={(pl.strokeWidth ?? 1.5) + (selected ? 0.75 : 0)}
                strokeDasharray={towerDraftPolylineDash(pl.lineStyle)}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: drawMode ? "crosshair" : "pointer" }}
                onClick={(ev) => {
                  if (drawMode) return;
                  ev.stopPropagation();
                  onSelectPolyline(selected ? null : pl.id);
                  onSelectPlacement(null);
                }}
              />
            ) : null;
          })}

          {draftPoints.map((p, i) => (
            <g key={`draft-pt-${i}`}>
              <circle cx={p.x} cy={p.y} r={5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
              {i === 0 && (
                <text x={p.x + 8} y={p.y - 6} fontSize={8} fill="#2563eb" fontWeight={600}>
                  start
                </text>
              )}
            </g>
          ))}
          {draftPoints.length >= 2 && (
            <polyline
              points={draftPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={drawStyle.strokeColor}
              strokeWidth={drawStyle.strokeWidth}
              strokeDasharray={towerDraftPolylineDash(drawStyle.lineStyle)}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {drawMode && lastDraft && previewCursor && (
            <line
              x1={lastDraft.x}
              y1={lastDraft.y}
              x2={previewCursor.x}
              y2={previewCursor.y}
              stroke={drawStyle.strokeColor}
              strokeWidth={drawStyle.strokeWidth}
              strokeDasharray="4 3"
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {drawMode && draftPoints.length === 0 && previewCursor && (
            <g pointerEvents="none">
              <circle
                cx={previewCursor.x}
                cy={previewCursor.y}
                r={5}
                fill="none"
                stroke="#2563eb"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <text x={previewCursor.x + 8} y={previewCursor.y - 6} fontSize={8} fill="var(--color-text-muted)">
                click to start
              </text>
            </g>
          )}

          {page.placements.map((pl) => {
            const node = nodes.find((n) => n.id === pl.deviceNodeId);
            const data = node?.data as DeviceData | undefined;
            const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
            const y = ftAglToY(pl.mountHeightFtAgl, page.towerHeightFtAgl);
            const x = centerX + (pl.offsetX ?? 0);
            const selected = pl.id === selectedPlacementId;
            const hovered = pl.id === hoverPlacementId;
            const azimuthDeg =
              data?.rfInstallation?.azimuthDeg ??
              (pl.plantLocationId
                ? trackItTowerContext?.antennaLevels.find((l) => l.id === pl.plantLocationId)?.azimuthDeg
                : undefined);
            const bandLabel = data?.ports?.find((p) => p.rf?.band)?.rf?.band ?? "";
            const tipLines = [
              label,
              `${pl.mountHeightFtAgl}′ AGL`,
              data?.deviceType ?? "",
              data?.designation?.trim() ? `Designation: ${data.designation}` : "",
              data?.modelNumber?.trim() ? data.modelNumber : "",
              azimuthDeg != null ? `Azimuth: ${azimuthDeg}°` : "",
              bandLabel ? `Band: ${bandLabel}` : "",
            ].filter(Boolean);

            return (
              <g
                key={pl.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: drawMode ? "crosshair" : "grab" }}
                onClick={(ev) => {
                  if (drawMode) return;
                  ev.stopPropagation();
                  onSelectPlacement(selected ? null : pl.id);
                  onSelectPolyline(null);
                }}
                onContextMenu={(ev) => {
                  if (drawMode) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  setContextMenu({
                    x: ev.clientX,
                    y: ev.clientY,
                    placementId: pl.id,
                    deviceNodeId: pl.deviceNodeId,
                  });
                  onSelectPlacement(pl.id);
                  onSelectPolyline(null);
                }}
                onMouseEnter={(ev) => {
                  if (drawMode) return;
                  setHoverPlacementId(pl.id);
                  setHoverTip({ x: ev.clientX, y: ev.clientY, lines: tipLines });
                }}
                onMouseMove={(ev) => {
                  if (drawMode || hoverPlacementId !== pl.id) return;
                  setHoverTip({ x: ev.clientX, y: ev.clientY, lines: tipLines });
                }}
                onMouseLeave={() => {
                  setHoverPlacementId((id) => (id === pl.id ? null : id));
                  setHoverTip(null);
                }}
                onMouseDown={(ev) => {
                  if (drawMode || ev.button !== 0) return;
                  ev.stopPropagation();
                  onSelectPlacement(pl.id);
                  setDraggingPlacementId(pl.id);
                  setHoverTip(null);
                  const startSvg = clientToContent(ev.clientX, ev.clientY);
                  const startOffsetX = pl.offsetX ?? 0;
                  const startFt = pl.mountHeightFtAgl;
                  const onMove = (moveEv: MouseEvent) => {
                    const cur = clientToContent(moveEv.clientX, moveEv.clientY);
                    updateTowerDraftPlacement(page.id, pl.id, {
                      mountHeightFtAgl: yToFtAglWithSnap(
                        ftAglToY(startFt, page.towerHeightFtAgl) + (cur.y - startSvg.y),
                        page.towerHeightFtAgl,
                        snapFt,
                        page.guideBandsFt,
                      ),
                      offsetX: startOffsetX + (cur.x - startSvg.x),
                    });
                  };
                  const onUp = () => {
                    setDraggingPlacementId(null);
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                opacity={draggingPlacementId === pl.id ? 0.85 : 1}
              >
                <title>{tipLines.join(" · ")}</title>
                <TowerDraftPlacementGlyph
                  deviceType={data?.deviceType}
                  selected={selected}
                  hovered={hovered}
                  azimuthDeg={azimuthDeg}
                />
                {(labelLayers.designation || labelLayers.azimuth || labelLayers.band) && (
                  <g transform={`translate(${TOWER_GLYPH_SIZE / 2 + 4}, 0)`} data-print-show>
                    {labelLayers.designation && (
                      <text x={0} y={-4} fontSize={8} fill="var(--color-text)">
                        {label}
                      </text>
                    )}
                    {labelLayers.azimuth && azimuthDeg != null && (
                      <text x={0} y={6} fontSize={7} fill="var(--color-text-muted)">
                        {azimuthDeg}°
                      </text>
                    )}
                    {labelLayers.band && bandLabel && (
                      <text x={0} y={labelLayers.azimuth && azimuthDeg != null ? 14 : 6} fontSize={7} fill="var(--color-text-muted)">
                        {bandLabel}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          <text x={centerX - 40} y={16} fontSize={10} fontWeight={600} fill="var(--color-text)">
            Tower elevation (documentation scale)
          </text>
          <text x={centerX - 40} y={28} fontSize={8} fill="var(--color-text-muted)">
            {page.towerHeightFtAgl}′ {towerType.replace("_", " ")} · hover for details · right-click to edit
          </text>
        </g>
      </svg>

      {hoverTip && !drawMode && (
        <div
          className="pointer-events-none fixed z-50 max-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] shadow-lg"
          style={{ left: hoverTip.x + 14, top: hoverTip.y + 12 }}
        >
          {hoverTip.lines.map((line, i) => (
            <div
              key={i}
              className={i === 0 ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-xs shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
            onClick={() => {
              onSelectPlacement(contextMenu.placementId);
              setContextMenu(null);
            }}
          >
            Edit mount height…
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
            onClick={() => {
              setEditingNodeId(contextMenu.deviceNodeId);
              setContextMenu(null);
            }}
          >
            Edit device details…
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
            onClick={() => {
              const pl = page.placements.find((p) => p.id === contextMenu.placementId);
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(
                    {
                      type: "KGO_ES_FOCUS_TOWER_LEVEL",
                      payload: { plantLocationId: pl?.plantLocationId },
                    },
                    "*",
                  );
                }
              } catch {
                /* ignore */
              }
              setContextMenu(null);
            }}
          >
            Open in trackIT…
          </button>
          <div className="border-t border-[var(--color-border)] my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40"
            onClick={() => {
              removeTowerDraftPlacement(page.id, contextMenu.placementId);
              onSelectPlacement(null);
              setContextMenu(null);
            }}
          >
            Remove from elevation
          </button>
        </div>
      )}
    </div>
  );
}
