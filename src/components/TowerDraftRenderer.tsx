import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import { TowerDraftPlacementGlyph, dishDiameterMFromData } from "../towerDraftGlyphs";
import {
  ftAglToY,
  suggestPlacementOffsetX,
  TOWER_DRAFT_PX_PER_FT,
  TOWER_DRAFT_RULER_W,
  towerDraftGroundY,
  towerDraftPolylineDash,
  towerDraftTowerCenterX,
  yToFtAglWithSnap,
  TOWER_DRAFT_ALL_FACES_COL_W,
  TOWER_DRAFT_PAD_X,
} from "../towerDraftUtils";
import type { TowerElevationView, TowerFace } from "../towerDraftFaces";
import {
  activeViewFace,
  placementCenterX,
  placementVisibleInView,
  resolvePlacementAzimuthDeg,
  resolvePlacementTowerFace,
  TOWER_FACE_LABELS,
  TOWER_FACE_ORDER,
  towerDraftContentWidthForView,
  towerFaceAtContentX,
  towerFaceColumnCenterX,
} from "../towerDraftFaces";
import { formatDistanceFromFt, formatHeightFtAgl, type MeasurementSystem } from "../measurementUnits";
import ViewNavBar from "./ViewNavBar";
import { stepViewZoom } from "../viewZoomUtils";
import { resolveDeviceLabel } from "../displayName";
import { draggedTowerDeviceNodeId, draggedTowerTemplateId } from "./TowerDraftSidebar";
import type { TowerDraftDrawStyle } from "./TowerDraftToolbar";
import type { TowerDraftContextMenuState } from "./TowerDraftContextMenu";
import { snapOffsetXToMountLateral } from "../towerDraftMountLateral";

interface TowerDraftRendererProps {
  page: TowerDraftPage;
  drawMode: boolean;
  snapFt: number;
  drawStyle: TowerDraftDrawStyle;
  elevationView: TowerElevationView;
  measurementSystem: MeasurementSystem;
  selectedPlacementId: string | null;
  selectedPolylineId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onSelectPolyline: (id: string | null) => void;
  onClearSelection: () => void;
  onOpenContextMenu: (menu: TowerDraftContextMenuState) => void;
  onDrawLineFinished?: () => void;
  onExitDrawMode?: () => void;
}

export default function TowerDraftRenderer({
  page,
  drawMode,
  snapFt,
  drawStyle,
  elevationView,
  measurementSystem,
  selectedPlacementId,
  selectedPolylineId,
  onSelectPlacement,
  onSelectPolyline,
  onClearSelection,
  onOpenContextMenu,
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
  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);
  const towerDraftFocusRequest = useSchematicStore((s) => s.towerDraftFocusRequest);
  const requestTowerDraftFocus = useSchematicStore((s) => s.requestTowerDraftFocus);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);

  const labelLayers = page.labelLayers ?? {};

  const svgRef = useRef<SVGSVGElement>(null);
  const contentGroupRef = useRef<SVGGElement>(null);
  const suppressPlacementClickRef = useRef(false);
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

  const PLACEMENT_DRAG_THRESHOLD_PX = 5;

  const contentW = towerDraftContentWidthForView(elevationView);
  const groundY = towerDraftGroundY(page.towerHeightFtAgl);
  const centerX = towerDraftTowerCenterX();
  const viewFace = activeViewFace(elevationView);
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
      const dropFace =
        elevationView === "all-faces"
          ? towerFaceAtContentX(x)
          : elevationView !== "profile"
            ? elevationView
            : undefined;
      const colCenter =
        dropFace && elevationView === "all-faces"
          ? towerFaceColumnCenterX(dropFace)
          : centerX;
      const preferredOffset = x - colCenter;
      const offsetX = snapOffsetXToMountLateral(suggestPlacementOffsetX(page.placements, ft, preferredOffset));
      const id = addTowerDraftPlacement(page.id, {
        deviceNodeId,
        mountHeightFtAgl: ft,
        offsetX,
        ...(dropFace ? { towerFace: dropFace } : {}),
      });
      onSelectPlacement(id);
    },
    [
      addTowerDraftPlacement,
      centerX,
      clientToContent,
      elevationView,
      onSelectPlacement,
      page.id,
      page.placements,
      page.guideBandsFt,
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
    const baseL = legL - 24;
    const baseR = legR + 12;

    const renderFaceColumn = (colCx: number, face: TowerFace, showLabel: boolean) => {
      const faceW = 56;
      const faceL = colCx - faceW / 2;
      return (
        <g key={face}>
          <rect
            x={faceL}
            y={topY}
            width={faceW}
            height={groundY - topY}
            fill="rgba(100, 116, 139, 0.14)"
            stroke="#64748b"
            strokeWidth={1.5}
          />
          {[0.25, 0.5, 0.75].map((t) => {
            const y = topY + (groundY - topY) * t;
            return (
              <line
                key={t}
                x1={faceL + 4}
                y1={y}
                x2={faceL + faceW - 4}
                y2={y}
                stroke="#94a3b8"
                strokeWidth={0.6}
                strokeDasharray="3 4"
                opacity={0.35}
              />
            );
          })}
          {showLabel && (
            <text
              x={colCx}
              y={topY - 8}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="var(--color-text-muted)"
            >
              {face} · {TOWER_FACE_LABELS[face]}
            </text>
          )}
        </g>
      );
    };

    if (elevationView === "all-faces") {
      const startX = TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X;
      return (
        <g>
          {TOWER_FACE_ORDER.map((face, idx) => {
            const colCx = startX + idx * TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_W / 2;
            return renderFaceColumn(colCx, face, true);
          })}
        </g>
      );
    }

    if (elevationView !== "profile") {
      return renderFaceColumn(centerX, elevationView, true);
    }

    if (towerType === "monopole") {
      return (
        <g>
          <ellipse
            cx={centerX}
            cy={(topY + groundY) / 2}
            rx={14}
            ry={(groundY - topY) / 2}
            fill="rgba(100, 116, 139, 0.12)"
            stroke="none"
          />
          <line x1={centerX} y1={topY} x2={centerX} y2={groundY} stroke="#64748b" strokeWidth={3} />
        </g>
      );
    }

    return (
      <g>
        <polygon
          points={`${legL},${topY} ${legR},${topY} ${baseR},${groundY} ${baseL},${groundY}`}
          fill="rgba(100, 116, 139, 0.14)"
          stroke="none"
        />
        <g stroke="#64748b" strokeWidth={1.5} fill="none">
          <line x1={legL} y1={topY} x2={baseL} y2={groundY} />
          <line x1={legR} y1={topY} x2={baseR} y2={groundY} />
          <line x1={legL} y1={topY} x2={legR} y2={topY} />
        </g>
      </g>
    );
  }, [centerX, groundY, page.towerHeightFtAgl, towerType, elevationView]);

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
                  {band.label ?? formatDistanceFromFt(band.ftAgl, measurementSystem)}
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
            if (!placementVisibleInView(pl, data, elevationView, trackItTowerContext)) return null;
            const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
            const y = ftAglToY(pl.mountHeightFtAgl, page.towerHeightFtAgl);
            const plFace = resolvePlacementTowerFace(pl, data, trackItTowerContext);
            const colCenter = placementCenterX(pl, data, elevationView, trackItTowerContext);
            const x = colCenter + (pl.offsetX ?? 0);
            const glyphFace =
              elevationView === "all-faces" ? plFace : viewFace;
            const selected = pl.id === selectedPlacementId;
            const hovered = pl.id === hoverPlacementId;
            const azimuthDeg = resolvePlacementAzimuthDeg(pl, data, trackItTowerContext);
            const bandLabel = data?.ports?.find((p) => p.rf?.band)?.rf?.band ?? "";
            const heightLabel = formatHeightFtAgl(pl.mountHeightFtAgl, measurementSystem);
            const tipLines = [
              label,
              heightLabel,
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
                style={{ cursor: drawMode ? "crosshair" : draggingPlacementId === pl.id ? "grabbing" : "pointer" }}
                onClick={(ev) => {
                  if (drawMode) return;
                  ev.stopPropagation();
                  if (suppressPlacementClickRef.current) {
                    suppressPlacementClickRef.current = false;
                    return;
                  }
                  onSelectPlacement(pl.id);
                  onSelectPolyline(null);
                }}
                onDoubleClick={(ev) => {
                  if (drawMode) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  onSelectPlacement(pl.id);
                  onSelectPolyline(null);
                  setEditingNodeId(pl.deviceNodeId);
                }}
                onContextMenu={(ev) => {
                  if (drawMode) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  onSelectPlacement(pl.id);
                  onSelectPolyline(null);
                  onOpenContextMenu({
                    kind: "placement",
                    pageId: page.id,
                    placementId: pl.id,
                    deviceNodeId: pl.deviceNodeId,
                    plantLocationId: pl.plantLocationId,
                    screenX: ev.clientX,
                    screenY: ev.clientY,
                  });
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
                  onSelectPolyline(null);
                  setHoverTip(null);
                  const startClient = { x: ev.clientX, y: ev.clientY };
                  const startSvg = clientToContent(ev.clientX, ev.clientY);
                  const startColCenter = placementCenterX(pl, data, elevationView, trackItTowerContext);
                  const startFt = pl.mountHeightFtAgl;
                  let dragging = false;
                  let lastOffsetX = pl.offsetX ?? 0;
                  const onMove = (moveEv: MouseEvent) => {
                    if (!dragging) {
                      const dx = moveEv.clientX - startClient.x;
                      const dy = moveEv.clientY - startClient.y;
                      if (Math.hypot(dx, dy) < PLACEMENT_DRAG_THRESHOLD_PX) return;
                      dragging = true;
                      setDraggingPlacementId(pl.id);
                    }
                    const cur = clientToContent(moveEv.clientX, moveEv.clientY);
                    const dragFace =
                      elevationView === "all-faces"
                        ? towerFaceAtContentX(cur.x)
                        : elevationView !== "profile"
                          ? elevationView
                          : undefined;
                    const dragColCenter =
                      dragFace && elevationView === "all-faces"
                        ? towerFaceColumnCenterX(dragFace)
                        : startColCenter;
                    lastOffsetX = cur.x - dragColCenter;
                    updateTowerDraftPlacement(page.id, pl.id, {
                      mountHeightFtAgl: yToFtAglWithSnap(
                        ftAglToY(startFt, page.towerHeightFtAgl) + (cur.y - startSvg.y),
                        page.towerHeightFtAgl,
                        snapFt,
                        page.guideBandsFt,
                      ),
                      offsetX: lastOffsetX,
                      ...(dragFace ? { towerFace: dragFace } : {}),
                    });
                  };
                  const onUp = () => {
                    if (dragging) {
                      suppressPlacementClickRef.current = true;
                      const snapped = snapOffsetXToMountLateral(lastOffsetX);
                      if (snapped !== lastOffsetX) {
                        updateTowerDraftPlacement(page.id, pl.id, { offsetX: snapped });
                      }
                    }
                    setDraggingPlacementId(null);
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                opacity={draggingPlacementId === pl.id ? 0.85 : 1}
              >
                <TowerDraftPlacementGlyph
                  deviceType={data?.deviceType}
                  selected={selected}
                  hovered={hovered}
                  azimuthDeg={azimuthDeg}
                  dishDiameterM={dishDiameterMFromData(data)}
                  elevationView={elevationView}
                  viewFace={glyphFace}
                  placementFace={plFace}
                  mountFlip={pl.mountFlip}
                />
                {(labelLayers.designation || labelLayers.azimuth || labelLayers.band) && (
                  <g transform={`translate(8, 0)`} data-print-show>
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
            {elevationView === "profile"
              ? "Tower elevation (documentation scale)"
              : elevationView === "all-faces"
                ? "All faces — equipment by azimuth / face"
                : `${TOWER_FACE_LABELS[elevationView]} face — equipment layout`}
          </text>
          <text x={centerX - 40} y={28} fontSize={8} fill="var(--color-text-muted)">
            {formatHeightFtAgl(page.towerHeightFtAgl, measurementSystem, { suffix: false })}{" "}
            {towerType.replace("_", " ")} · click to select · drag to move · double-click device to edit
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
    </div>
  );
}
