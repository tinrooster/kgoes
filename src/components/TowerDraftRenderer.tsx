import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import { TowerDraftPlacementGlyph, dishDiameterMFromData } from "../towerDraftGlyphs";
import {
  ftAglToY,
  suggestPlacementOffsetX,
  TOWER_DRAFT_CONTENT_OFFSET_Y,
  TOWER_DRAFT_FACES_BAND_OFFSET_Y,
  TOWER_DRAFT_ALL_FACES_COL_GAP,
  TOWER_DRAFT_ALL_FACES_COL_START,
  TOWER_DRAFT_RULER_W,
  towerDraftContentHeight,
  towerDraftGroundY,
  towerDraftPolylineDash,
  towerDraftTowerCenterX,
  yToFtAglWithSnap,
  TOWER_DRAFT_ALL_FACES_COL_W,
} from "../towerDraftUtils";
import { useCanvasPanZoom } from "../useCanvasPanZoom";
import ViewNavBar from "./ViewNavBar";
import type { ContentBounds } from "../viewNavUtils";
import {
  stackLabelY,
  TOWER_DRAFT_FACES_HEADER_H,
  towerHalfWidthAtY,
  TOWER_FACE_TONE,
} from "../towerDraftElevationLayout";
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
  /** When true, fills the design canvas card instead of owning the full page column. */
  embeddedInChrome?: boolean;
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
  embeddedInChrome = false,
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
  const isProfile = elevationView === "profile";
  const isAllFaces = elevationView === "all-faces";
  const contentOffsetY =
    TOWER_DRAFT_CONTENT_OFFSET_Y + (isAllFaces ? TOWER_DRAFT_FACES_BAND_OFFSET_Y : 0);
  const svgH =
    towerDraftContentHeight(page.towerHeightFtAgl) +
    contentOffsetY +
    (isAllFaces ? TOWER_DRAFT_FACES_HEADER_H : 0);
  const gridRulerX = isAllFaces ? 70 : TOWER_DRAFT_RULER_W;
  const profileLabelX = centerX + 96;

  const viewBounds = useMemo((): ContentBounds => {
    return { minX: 0, minY: 0, maxX: contentW, maxY: svgH };
  }, [contentW, svgH]);

  const panZoom = useCanvasPanZoom({
    fitBounds: viewBounds,
    fitDeps: [page.id, elevationView, contentW, svgH],
  });

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
    if (pl) onSelectPlacement(pl.id);
    requestTowerDraftFocus(null);
  }, [towerDraftFocusRequest, page.id, page.placements, onSelectPlacement, requestTowerDraftFocus]);

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
          : activeViewFace(elevationView);
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
    const baseHalfW = 18;
    const topHalfW = 12;
    const lTop = centerX - topHalfW;
    const rTop = centerX + topHalfW;
    const lBase = centerX - baseHalfW;
    const rBase = centerX + baseHalfW;

    const renderFaceColumn = (colCx: number, face: TowerFace, colIdx: number) => {
      const colW = TOWER_DRAFT_ALL_FACES_COL_W - 12;
      const fx = colCx - colW / 2;
      const tone = TOWER_FACE_TONE[face] ?? "neutral";
      const chipY = topY - 30 + 4;
      return (
        <g key={face}>
          <rect
            x={fx}
            y={topY - 4}
            width={colW}
            height={groundY - topY + 8}
            rx={12}
            fill={`color-mix(in oklab, var(--ti-ink) ${colIdx % 2 ? 4 : 9}%, transparent)`}
            stroke="color-mix(in oklab, var(--ti-ink) 22%, transparent)"
            strokeWidth={1.2}
          />
          <rect
            x={fx + 10}
            y={chipY}
            width={colW - 20}
            height={22}
            rx={7}
            fill={`color-mix(in oklab, var(--ti-${tone}) 16%, var(--ti-surface))`}
            stroke={`color-mix(in oklab, var(--ti-${tone}) 40%, transparent)`}
            strokeWidth={1}
          />
          <circle cx={fx + 22} cy={chipY + 11} r={4} fill={`var(--ti-${tone})`} />
          <text
            x={fx + colW / 2 + 6}
            y={chipY + 15}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--ti-ink)"
          >
            {face} · {TOWER_FACE_LABELS[face]}
          </text>
        </g>
      );
    };

    if (isAllFaces) {
      const pitch = TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_GAP;
      return (
        <g>
          {TOWER_FACE_ORDER.map((face, idx) => {
            const colCx = TOWER_DRAFT_ALL_FACES_COL_START + idx * pitch + TOWER_DRAFT_ALL_FACES_COL_W / 2;
            return renderFaceColumn(colCx, face, idx);
          })}
        </g>
      );
    }

    const singleFace = activeViewFace(elevationView);
    if (singleFace) {
      return renderFaceColumn(centerX, singleFace, 0);
    }

    if (towerType === "monopole") {
      return (
        <g>
          <ellipse
            cx={centerX}
            cy={(topY + groundY) / 2}
            rx={14}
            ry={(groundY - topY) / 2}
            fill="color-mix(in oklab, var(--ti-ink) 6%, var(--ti-surface))"
            stroke="none"
          />
          <line x1={centerX} y1={topY} x2={centerX} y2={groundY} stroke="var(--ti-ink-2)" strokeWidth={3} />
        </g>
      );
    }

    const rows = 9;
    const braces: string[] = [];
    const struts: string[] = [];
    for (let i = 0; i < rows; i++) {
      const y1 = topY + ((groundY - topY) * i) / rows;
      const y2 = topY + ((groundY - topY) * (i + 1)) / rows;
      const hw1 = towerHalfWidthAtY(y1, topY, groundY, baseHalfW, topHalfW);
      const hw2 = towerHalfWidthAtY(y2, topY, groundY, baseHalfW, topHalfW);
      braces.push(
        `M ${centerX - hw1} ${y1} L ${centerX + hw2} ${y2} M ${centerX + hw1} ${y1} L ${centerX - hw2} ${y2}`,
      );
      struts.push(`M ${centerX - hw2} ${y2} L ${centerX + hw2} ${y2}`);
    }

    return (
      <g>
        <path
          d={`M ${lBase} ${groundY} L ${lTop} ${topY} L ${rTop} ${topY} L ${rBase} ${groundY} Z`}
          fill="color-mix(in oklab, var(--ti-ink) 5%, var(--ti-surface))"
          stroke="var(--ti-ink-2)"
          strokeWidth={1.6}
        />
        <line x1={lBase} y1={groundY} x2={lTop} y2={topY} stroke="var(--ti-ink-2)" strokeWidth={1.6} />
        <line x1={rBase} y1={groundY} x2={rTop} y2={topY} stroke="var(--ti-ink-2)" strokeWidth={1.6} />
        <path d={struts.join(" ")} stroke="color-mix(in oklab, var(--ti-ink) 28%, transparent)" strokeWidth={0.9} fill="none" />
        <path d={braces.join(" ")} stroke="color-mix(in oklab, var(--ti-ink) 32%, transparent)" strokeWidth={1} fill="none" />
      </g>
    );
  }, [centerX, groundY, page.towerHeightFtAgl, towerType, elevationView, isAllFaces]);

  const profileLabelY = useMemo(() => {
    if (!isProfile) return {} as Record<string, number>;
    const items: { id: string; y: number }[] = [];
    for (const pl of page.placements) {
      const node = nodes.find((n) => n.id === pl.deviceNodeId);
      const data = node?.data as DeviceData | undefined;
      if (!placementVisibleInView(pl, data, elevationView, trackItTowerContext)) continue;
      items.push({ id: pl.id, y: ftAglToY(pl.mountHeightFtAgl, page.towerHeightFtAgl) });
    }
    return stackLabelY(items, 30);
  }, [isProfile, page.placements, page.towerHeightFtAgl, nodes, elevationView, trackItTowerContext]);

  const facesLabelY = useMemo(() => {
    if (!isAllFaces) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const face of TOWER_FACE_ORDER) {
      const items: { id: string; y: number }[] = [];
      for (const pl of page.placements) {
        const node = nodes.find((n) => n.id === pl.deviceNodeId);
        const data = node?.data as DeviceData | undefined;
        if (!placementVisibleInView(pl, data, elevationView, trackItTowerContext)) continue;
        if (resolvePlacementTowerFace(pl, data, trackItTowerContext) !== face) continue;
        items.push({ id: pl.id, y: ftAglToY(pl.mountHeightFtAgl, page.towerHeightFtAgl) });
      }
      Object.assign(out, stackLabelY(items, 28));
    }
    return out;
  }, [isAllFaces, page.placements, page.towerHeightFtAgl, nodes, elevationView, trackItTowerContext]);

  const previewCursor = cursorContent ? snapPoint(cursorContent.x, cursorContent.y) : null;
  const lastDraft = draftPoints[draftPoints.length - 1];
  const rulerTopY = ftAglToY(page.towerHeightFtAgl, page.towerHeightFtAgl);

  const titleX = isProfile ? centerX : isAllFaces ? 70 : TOWER_DRAFT_RULER_W + 24;

  const cursorStyle = drawMode ? "crosshair" : panZoom.isPanning ? "grabbing" : "default";

  return (
    <div
      ref={panZoom.containerRef}
      className={embeddedInChrome ? "relative flex-1 min-h-[420px]" : "relative flex-1 min-h-0"}
      style={{
        fontFamily: "var(--ti-font-sans)",
        overflow: "hidden",
        cursor: cursorStyle,
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
          width: contentW,
          height: svgH,
        }}
      >
        <svg
          ref={svgRef}
          width={contentW}
          height={svgH}
          viewBox={`0 0 ${contentW} ${svgH}`}
          style={{
            display: "block",
            cursor: cursorStyle,
          }}
          onClick={onCanvasClick}
          onDoubleClick={onCanvasDoubleClick}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setCursorContent(null)}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
        <rect width={contentW} height={svgH} fill="var(--ti-surface)" />
        <text x={titleX} y={22} fontSize={13} fontWeight={700} fill="var(--ti-ink)">
          {isProfile
            ? "Tower elevation (documentation scale)"
            : isAllFaces
              ? "All faces — equipment by azimuth / face"
              : activeViewFace(elevationView)
                ? `${TOWER_FACE_LABELS[activeViewFace(elevationView)!]} face — equipment layout`
                : "Tower elevation"}
        </text>
        <text x={titleX} y={38} fontSize={10.5} fill="var(--ti-muted)">
          {formatHeightFtAgl(page.towerHeightFtAgl, measurementSystem, { suffix: false })}{" "}
          {towerType.replace("_", " ")} · click to select · drag to move · double-click device to edit
        </text>

        <g ref={contentGroupRef} transform={`translate(0, ${contentOffsetY})`}>
          <line
            x1={gridRulerX}
            y1={groundY}
            x2={contentW - 24}
            y2={groundY}
            stroke="color-mix(in oklab, var(--ti-ink) 35%, transparent)"
            strokeWidth={1.2}
          />
          {isProfile && (
            <g>
              <rect
                x={centerX - 26}
                y={groundY + 6}
                width={56}
                height={20}
                rx={3}
                fill="var(--ti-surface-2)"
                stroke="var(--ti-border)"
              />
              <text x={centerX + 2} y={groundY + 19} textAnchor="middle" fontSize={8.5} fill="var(--ti-muted)">
                Equip. bldg
              </text>
              <text x={TOWER_DRAFT_RULER_W + 8} y={groundY + 19} fontSize={9} fill="var(--ti-faint)">
                Grade
              </text>
            </g>
          )}
          {!isProfile && (
            <text x={TOWER_DRAFT_RULER_W + 8} y={groundY + 14} fontSize={9} fill="var(--ti-muted)">
              Grade
            </text>
          )}

          <line
            x1={gridRulerX - 2}
            y1={rulerTopY}
            x2={gridRulerX - 2}
            y2={groundY}
            stroke="color-mix(in oklab, var(--ti-ink) 35%, transparent)"
            strokeWidth={1.2}
          />
          {page.guideBandsFt.map((band) => {
            const y = ftAglToY(band.ftAgl, page.towerHeightFtAgl);
            const bandLabel =
              band.ftAgl === 0
                ? "Base"
                : band.label ?? `${formatDistanceFromFt(band.ftAgl, measurementSystem)}`;
            return (
              <g key={`${band.ftAgl}-${band.label ?? ""}`}>
                <line
                  x1={gridRulerX}
                  y1={y}
                  x2={contentW - 24}
                  y2={y}
                  stroke="color-mix(in oklab, var(--ti-ink) 24%, transparent)"
                  strokeWidth={1}
                  strokeDasharray="4 5"
                />
                <text
                  x={gridRulerX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9.5}
                  fill="var(--ti-muted)"
                  fontFamily="var(--ti-font-mono)"
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
                  {bandLabel}
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
                stroke={selected ? "var(--ti-accent)" : pl.strokeColor ?? "var(--ti-faint)"}
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
              <circle cx={p.x} cy={p.y} r={5} fill="var(--ti-accent)" stroke="var(--ti-surface)" strokeWidth={1.5} />
              {i === 0 && (
                <text x={p.x + 8} y={p.y - 6} fontSize={8} fill="var(--ti-accent)" fontWeight={600}>
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
                stroke="var(--ti-accent)"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <text x={previewCursor.x + 8} y={previewCursor.y - 6} fontSize={8} fill="var(--ti-muted)">
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
            const ly = isProfile
              ? (profileLabelY[pl.id] ?? y)
              : isAllFaces
                ? (facesLabelY[pl.id] ?? y)
                : y;
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
                        : activeViewFace(elevationView);
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
                {isProfile && (labelLayers.designation || labelLayers.azimuth || labelLayers.band) && (
                  <line
                    x1={6}
                    y1={0}
                    x2={profileLabelX - x - 4}
                    y2={ly - y}
                    stroke={selected ? "var(--ti-accent)" : "var(--ti-faint)"}
                    strokeWidth={selected ? 1.4 : 1}
                    opacity={0.8}
                  />
                )}
                {selected && (
                  <>
                    <circle cx={x} cy={y} r={18} fill="none" stroke="var(--ti-accent)" strokeWidth={1.5} opacity={0.5} strokeDasharray="3 3" />
                    <rect x={x - 17} y={y - 17} width={34} height={34} rx={8} fill="color-mix(in oklab, var(--ti-accent) 8%, transparent)" />
                  </>
                )}
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
                  <g
                    transform={`translate(${isProfile ? profileLabelX - x : 16}, ${isProfile || isAllFaces ? ly - y : 0})`}
                    data-print-show
                  >
                    {labelLayers.designation && (
                      <text x={0} y={isProfile ? -2 : -8} fontSize={isProfile ? 10.5 : 10} fontWeight={600} fill="var(--ti-ink)">
                        {label}
                      </text>
                    )}
                    {labelLayers.azimuth && azimuthDeg != null && (
                      <text x={0} y={isProfile ? 11 : 4} fontSize={9} fill="var(--ti-accent)" fontFamily="var(--ti-font-mono)">
                        {azimuthDeg}°
                      </text>
                    )}
                    {labelLayers.band && bandLabel && (
                      <text
                        x={isProfile ? 40 : labelLayers.azimuth && azimuthDeg != null ? 36 : 0}
                        y={isProfile ? 11 : 4}
                        fontSize={9}
                        fill="var(--ti-muted)"
                        fontFamily="var(--ti-font-mono)"
                      >
                        {bandLabel}
                      </text>
                    )}
                    {!isProfile && isAllFaces && Math.abs(ly - y) > 1 && (
                      <line
                        x1={6}
                        y1={0}
                        x2={14}
                        y2={ly - y}
                        stroke={selected ? "var(--ti-accent)" : "var(--ti-faint)"}
                        strokeWidth={1}
                        opacity={0.7}
                      />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>
        </svg>
      </div>

      <ViewNavBar
        zoom={panZoom.zoom}
        onZoomIn={panZoom.zoomInView}
        onZoomOut={panZoom.zoomOutView}
        onFitAll={() => panZoom.fitAllView(viewBounds)}
      />

      {hoverTip && !drawMode && (
        <div
          className="pointer-events-none fixed z-50 max-w-[220px] rounded-md px-2 py-1.5 text-[11px] shadow-lg"
          style={{
            left: hoverTip.x + 14,
            top: hoverTip.y + 12,
            border: "1px solid var(--ti-border)",
            background: "var(--ti-surface)",
            fontFamily: "var(--ti-font-sans)",
          }}
        >
          {hoverTip.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "var(--ti-ink)" : "var(--ti-muted)",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
