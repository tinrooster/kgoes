import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import {
  TowerDraftPlacementGlyph,
  TowerDraftPlacementMarker,
  dishDiameterMFromData,
} from "../towerDraftGlyphs";
import {
  LIGHT_ART_LABEL,
  SvgTextWithPill,
  TowerDraftLabelCard,
  type TowerDraftLabelLine,
} from "../towerDraftLabelCard";
import {
  ftAglToY,
  suggestPlacementOffsetX,
  TOWER_DRAFT_CONTENT_OFFSET_Y,
  TOWER_DRAFT_FACES_BAND_OFFSET_Y,
  TOWER_DRAFT_ALL_FACES_COL_GAP,
  TOWER_DRAFT_ALL_FACES_COL_START,
  TOWER_DRAFT_RULER_W,
  TOWER_DRAFT_PAD_X,
  towerDraftContentHeight,
  towerDraftGroundY,
  towerDraftPolylineDash,
  towerDraftTowerCenterX,
  yToFtAglWithSnap,
  TOWER_DRAFT_ALL_FACES_COL_W,
  TOWER_DRAFT_PX_PER_FT,
} from "../towerDraftUtils";
import { useCanvasPanZoom } from "../useCanvasPanZoom";
import ViewNavBar from "./ViewNavBar";
import type { ContentBounds } from "../viewNavUtils";
import {
  profileCalloutLeaderPoints,
  profileLabelXForMount,
  resolveProfilePlacementCallouts,
  stackLabelY,
  TOWER_DRAFT_FACE_COMPASS_CHIP_H,
  TOWER_DRAFT_FACE_COMPASS_GAP_PX,
  TOWER_DRAFT_FACES_HEADER_H,
  towerHalfWidthAtY,
  TOWER_FACE_TONE,
} from "../towerDraftElevationLayout";
import { majorElevationTicksFtAgl } from "../towerDraftElevationTicks";
import {
  loadTowerDraftViewportForView,
  saveTowerDraftViewport,
  towerDraftViewportStorageKey,
} from "../towerDraftViewportStorage";
import type { TowerElevationView, TowerFace } from "../towerDraftFaces";
import {
  activeViewFace,
  isTowerSectionElevationView,
  placementCenterX,
  placementVisibleInView,
  resolvePlacementAzimuthDeg,
  resolvePlacementTowerFace,
  TOWER_FACE_LABELS,
  TOWER_FACE_ORDER,
  towerDraftContentWidthForView,
  towerFaceAtContentX,
  towerFaceColumnCenterX,
  towerSectionPanCenterX,
} from "../towerDraftFaces";
import { formatDistanceFromFt, formatHeightFtAgl } from "../measurementUnits";
import {
  formatGuideBandElevationLabel,
  formatGuideBandLabelSuffix,
  formatGuideBandRulerHeightLabel,
  TOWER_ELEVATION_DISPLAY_SYSTEM,
} from "../towerElevationDisplay";
import { resolveDeviceLabel } from "../displayName";
import {
  towerFooterAuxDisplayLines,
  truncateTowerLabelText,
} from "../auxiliaryData";
import { draggedTowerDeviceNodeId, draggedTowerTemplateId } from "./TowerDraftSidebar";
import type { TowerDraftDrawStyle } from "./TowerDraftToolbar";
import type { TowerDraftContextMenuState } from "./TowerDraftContextMenu";
import { snapOffsetXToMountLateral } from "../towerDraftMountLateral";
import {
  profileCenterXForReference,
  mountaintopAssetPathname,
  resolveProfileElevationReference,
  resolveProfilePxPerFt,
  towerElevationReferenceLayout,
  type TowerElevationReferenceVariant,
} from "../towerElevationReference";
import { feedlineStrokeDash } from "../towerDraftFeedType";
import {
  computeGlyphViewportBoost,
  computeTallTowerInitialViewport,
  panZoomCenteredOnFtAgl,
  resolveInitialFocusFtAgl,
  resolveTallTowerProfileMode,
  resolveWorkingZoomRatio,
} from "../towerDraftTallViewport";
import {
  resolveCatalogTowerHeightFtAgl,
  resolveTowerDraftLayoutHeightFt,
} from "../towerDraftDisplayHeight";
import {
  elevationTickLabelStyle,
  guideBandLineStyle,
  guideBandsForDisplay,
  isStructuralGuideBand,
  PROFILE_GUIDE_BAND_LABEL_OFFSET_Y,
  profileGuideBandLevelSuffixStyle,
  resolveTowerDraftGuideBands,
} from "../towerDraftGuideBands";
import TowerDraftMinimap from "./TowerDraftMinimap";
import {
  guyedMastProfileElements,
  resolveProfileVisual,
  selfSupportProfileElements,
  shouldRenderGeneratedProfileBody,
} from "../towerDraftProfileBody";

interface TowerDraftRendererProps {
  page: TowerDraftPage;
  drawMode: boolean;
  snapFt: number;
  drawStyle: TowerDraftDrawStyle;
  elevationView: TowerElevationView;
  measurementSystem?: import("../measurementUnits").MeasurementSystem;
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
  /** Silhouette (`primary`) vs permit blueprint (`detailUrl`). */
  referenceVariant?: TowerElevationReferenceVariant;
}

export default function TowerDraftRenderer({
  page,
  drawMode,
  snapFt,
  drawStyle,
  elevationView,
  measurementSystem: _measurementSystemProp,
  selectedPlacementId,
  selectedPolylineId,
  onSelectPlacement,
  onSelectPolyline,
  onClearSelection,
  onOpenContextMenu,
  onDrawLineFinished,
  onExitDrawMode,
  embeddedInChrome = false,
  referenceVariant = "primary",
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
  const currency = useSchematicStore((s) => s.currency);
  const measurementSystem = TOWER_ELEVATION_DISPLAY_SYSTEM;

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

  const viewFace = activeViewFace(elevationView);
  const towerType = page.towerType ?? trackItTowerContext?.towerType ?? "self_support";
  const isProfile = elevationView === "profile";
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);
  const isAllFaces = elevationView === "all-faces";
  const isSectionElevation = isTowerSectionElevationView(elevationView);
  const elevationRef = useMemo(
    () => resolveProfileElevationReference(page, referenceVariant, trackItTowerContext),
    [page, trackItTowerContext, referenceVariant],
  );
  const profileVisual = useMemo(
    () => resolveProfileVisual(page, trackItTowerContext, !!elevationRef?.url),
    [page, trackItTowerContext, elevationRef?.url],
  );
  const profileReferenceUnderlay =
    isProfile &&
    !!elevationRef?.url &&
    profileVisual === "reference_image" &&
    !referenceImageFailed;
  const deviceHighlight =
    labelLayers.deviceHighlight ?? (isProfile && profileReferenceUnderlay);
  /** Reference art is a light sheet — use opaque pills + dark ink (not theme `--ti-ink`). */
  const labelOnLightArt = isProfile && profileReferenceUnderlay;
  useEffect(() => {
    setReferenceImageFailed(false);
  }, [elevationRef?.url, page.id]);
  const catalogHeightFt = useMemo(
    () => resolveCatalogTowerHeightFtAgl(page, trackItTowerContext),
    [page, trackItTowerContext],
  );
  const tallTowerMode =
    isSectionElevation &&
    resolveTallTowerProfileMode(catalogHeightFt, trackItTowerContext, page);
  const pxPerFt = useMemo(() => {
    if (!isProfile) return TOWER_DRAFT_PX_PER_FT;
    return resolveProfilePxPerFt(elevationRef, tallTowerMode);
  }, [isProfile, elevationRef, tallTowerMode]);
  const layoutHeightFt = useMemo(
    () => resolveTowerDraftLayoutHeightFt(page, trackItTowerContext, elevationView),
    [page, trackItTowerContext, elevationView],
  );
  const guideBandHeightFt = isProfile ? catalogHeightFt : layoutHeightFt;
  const resolvedGuideBands = useMemo(
    () => resolveTowerDraftGuideBands(page, trackItTowerContext),
    [page, trackItTowerContext],
  );
  const visibleGuideBands = useMemo(
    () => guideBandsForDisplay(resolvedGuideBands, guideBandHeightFt),
    [resolvedGuideBands, guideBandHeightFt],
  );
  const contentW = useMemo(
    () =>
      towerDraftContentWidthForView(elevationView, {
        elevationRef: isProfile ? elevationRef : null,
        towerHeightFt: layoutHeightFt,
        pxPerFt,
      }),
    [elevationView, isProfile, elevationRef, layoutHeightFt, pxPerFt],
  );
  const centerX = useMemo(() => {
    if (profileReferenceUnderlay && elevationRef) {
      return profileCenterXForReference({
        ref: elevationRef,
        towerHeightFt: layoutHeightFt,
        pxPerFt,
        rulerX: TOWER_DRAFT_RULER_W,
        baseContentWidth:
          TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X + 80 + 420,
      });
    }
    return towerDraftTowerCenterX();
  }, [profileReferenceUnderlay, elevationRef, layoutHeightFt, pxPerFt]);
  const panCenterX = useMemo(
    () => towerSectionPanCenterX(elevationView, centerX),
    [elevationView, centerX],
  );
  const groundY = towerDraftGroundY(layoutHeightFt, pxPerFt);
  const contentOffsetY =
    TOWER_DRAFT_CONTENT_OFFSET_Y + (isAllFaces ? TOWER_DRAFT_FACES_BAND_OFFSET_Y : 0);
  const svgH =
    towerDraftContentHeight(layoutHeightFt, pxPerFt) +
    contentOffsetY +
    (isAllFaces ? TOWER_DRAFT_FACES_HEADER_H : 0);
  const gridRulerX = isAllFaces ? 70 : TOWER_DRAFT_RULER_W;

  const viewBounds = useMemo((): ContentBounds => {
    return { minX: 0, minY: 0, maxX: contentW, maxY: svgH };
  }, [contentW, svgH]);

  const viewportStorageKey = useMemo(
    () => towerDraftViewportStorageKey(page.id, elevationView),
    [page.id, elevationView],
  );
  const storedViewport = useMemo(
    () => loadTowerDraftViewportForView(page.id, elevationView),
    [page.id, elevationView],
  );
  const persistViewportTimerRef = useRef<number | null>(null);
  const onViewportPersist = useCallback(
    (zoom: number, pan: { x: number; y: number }) => {
      if (persistViewportTimerRef.current) clearTimeout(persistViewportTimerRef.current);
      persistViewportTimerRef.current = window.setTimeout(() => {
        saveTowerDraftViewport(viewportStorageKey, { zoom, pan });
      }, 100);
    },
    [viewportStorageKey],
  );

  const panZoom = useCanvasPanZoom({
    initialZoom: storedViewport?.zoom,
    initialOffset: storedViewport?.pan,
    fitBounds: tallTowerMode ? null : viewBounds,
    fitDeps: storedViewport ? [] : [page.id, elevationView, contentW, svgH, tallTowerMode],
    autoFit: !tallTowerMode && !storedViewport,
    profileMapNav: isSectionElevation,
    mapNavDisabled: drawMode,
    wheelZoomMode: "fine",
    onViewportChange: onViewportPersist,
  });
  const { applyViewport, containerRef: panContainerRef, fitAllView } = panZoom;
  const glyphViewportBoost = computeGlyphViewportBoost(tallTowerMode, panZoom.zoom);

  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = panContainerRef.current;
    if (!el) return;
    const update = () => setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panContainerRef, tallTowerMode]);

  const applyTallTowerViewport = useCallback(() => {
    const el = panContainerRef.current;
    if (!el || !tallTowerMode) return;
    const focusFt = resolveInitialFocusFtAgl(catalogHeightFt, trackItTowerContext, page);
    const { zoom, pan } = computeTallTowerInitialViewport({
      containerWidth: el.clientWidth,
      containerHeight: el.clientHeight,
      fullBounds: viewBounds,
      towerHeightFt: layoutHeightFt,
      focusFtAgl: focusFt,
      contentOffsetY,
      centerXContent: panCenterX,
      workingZoomRatio: resolveWorkingZoomRatio(trackItTowerContext, 1, page),
      pxPerFt,
      maxZoom: 6,
    });
    applyViewport(zoom, pan);
  }, [
    applyViewport,
    panContainerRef,
    tallTowerMode,
    catalogHeightFt,
    layoutHeightFt,
    trackItTowerContext,
    page,
    viewBounds,
    contentOffsetY,
    panCenterX,
    pxPerFt,
  ]);

  useEffect(() => {
    const saved = loadTowerDraftViewportForView(page.id, elevationView);
    if (saved) {
      applyViewport(saved.zoom, saved.pan);
      return;
    }
    if (tallTowerMode) {
      const timer = window.setTimeout(applyTallTowerViewport, 0);
      return () => clearTimeout(timer);
    }
    const timer = window.setTimeout(() => fitAllView(viewBounds), 0);
    return () => clearTimeout(timer);
  }, [viewportStorageKey, tallTowerMode, applyTallTowerViewport, applyViewport, viewBounds, fitAllView]);

  const panToContentY = useCallback(
    (contentY: number) => {
      const el = panZoom.containerRef.current;
      if (!el) return;
      const ft = Math.max(
        0,
        Math.min(
          layoutHeightFt,
          (towerDraftGroundY(layoutHeightFt, pxPerFt) - (contentY - contentOffsetY)) / pxPerFt,
        ),
      );
      const pan = panZoomCenteredOnFtAgl({
        containerWidth: el.clientWidth,
        containerHeight: el.clientHeight,
        zoom: panZoom.zoom,
        focusFtAgl: ft,
        towerHeightFt: catalogHeightFt,
        contentOffsetY,
        centerXContent: panCenterX,
        pxPerFt,
      });
      panZoom.applyViewport(panZoom.zoom, pan);
    },
    [panZoom, layoutHeightFt, contentOffsetY, panCenterX, pxPerFt],
  );

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
      const ft = yToFtAglWithSnap(y, layoutHeightFt, snapFt, visibleGuideBands, pxPerFt);
      const snappedY = ftAglToY(ft, layoutHeightFt, pxPerFt);
      return { x, y: snappedY };
    },
    [visibleGuideBands, layoutHeightFt, snapFt, pxPerFt],
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
      const ft = yToFtAglWithSnap(y, layoutHeightFt, snapFt, visibleGuideBands, pxPerFt);
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
      layoutHeightFt,
      snapFt,
      pxPerFt,
      visibleGuideBands,
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
    e.stopPropagation();
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

  const referenceImageLayer = useMemo(() => {
    if (!profileReferenceUnderlay || !elevationRef) return null;
    const layout = towerElevationReferenceLayout({
      towerHeightFt: layoutHeightFt,
      centerX,
      rulerX: gridRulerX,
      contentWidth: contentW,
      pxPerFt,
      ref: elevationRef,
    });
    const blendStyle =
      layout.blendMode !== "normal"
        ? ({ mixBlendMode: layout.blendMode } as CSSProperties)
        : undefined;
    return (
      <>
        <g
          aria-label={elevationRef.label ?? "Tower elevation reference"}
          style={blendStyle}
          pointerEvents="none"
        >
          <image
            href={elevationRef.url}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
            preserveAspectRatio={layout.preserveAspectRatio}
            opacity={layout.opacity}
            onError={() => setReferenceImageFailed(true)}
          />
          {elevationRef.label || referenceVariant === "blueprint" || import.meta.env.DEV ? (
            <text
              x={layout.x + layout.width / 2}
              y={layout.y - 6}
              textAnchor="middle"
              fontSize={8}
              fill="var(--ti-faint)"
            >
              {referenceVariant === "blueprint" || import.meta.env.DEV
                ? mountaintopAssetPathname(elevationRef.url) ?? elevationRef.url
                : elevationRef.label}
            </text>
          ) : null}
        </g>
        {/* Decorative image is non-interactive; catch device drops for the tower footprint. */}
        <rect
          aria-hidden
          x={layout.x}
          y={layout.y}
          width={layout.width}
          height={layout.height}
          fill="transparent"
          pointerEvents="all"
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      </>
    );
  }, [
    profileReferenceUnderlay,
    elevationRef,
    layoutHeightFt,
    centerX,
    gridRulerX,
    contentW,
    pxPerFt,
    referenceVariant,
    onDragOver,
    onDrop,
  ]);

  const towerBody = useMemo(() => {
    const showGeneratedProfile =
      isProfile && shouldRenderGeneratedProfileBody(profileVisual, referenceImageFailed);
    if (profileReferenceUnderlay && !showGeneratedProfile) return null;

    const topY = ftAglToY(layoutHeightFt, layoutHeightFt, pxPerFt);
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
      const chipY =
        topY - TOWER_DRAFT_FACE_COMPASS_GAP_PX - TOWER_DRAFT_FACE_COMPASS_CHIP_H;
      return (
        <g key={face}>
          <rect
            x={fx}
            y={topY}
            width={colW}
            height={groundY - topY + 8}
            rx={12}
            fill={`color-mix(in oklab, var(--ti-ink) ${colIdx % 2 ? 4 : 9}%, transparent)`}
            stroke="color-mix(in oklab, var(--ti-ink) 22%, transparent)"
            strokeWidth={1.2}
          />
          {visibleGuideBands.filter(isStructuralGuideBand).map((band) => {
            const bandY = ftAglToY(band.ftAgl, guideBandHeightFt, pxPerFt);
            const ls = guideBandLineStyle(true);
            return (
              <line
                key={`${face}-${band.ftAgl}`}
                x1={fx + 4}
                y1={bandY}
                x2={fx + colW - 4}
                y2={bandY}
                stroke={ls.stroke}
                strokeWidth={ls.strokeWidth}
              />
            );
          })}
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

    if (isProfile && (profileVisual === "generated_guyed" || towerType === "guyed") && showGeneratedProfile) {
      const guyed = guyedMastProfileElements({
        centerX,
        topY,
        groundY,
        layoutHeightFt,
        pxPerFt,
        towerType,
        visual: profileVisual,
      });
      return (
        <g aria-label="Guyed mast profile">
          <path
            d={guyed.mast}
            fill="color-mix(in oklab, var(--ti-ink) 6%, var(--ti-surface))"
            stroke="var(--ti-ink-2)"
            strokeWidth={1.4}
          />
          <path d={guyed.guys} stroke="color-mix(in oklab, var(--ti-ink) 38%, transparent)" strokeWidth={1.1} fill="none" />
          <path d={guyed.anchors} stroke="var(--ti-ink-2)" strokeWidth={2} fill="none" />
        </g>
      );
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

    if (isProfile && showGeneratedProfile) {
      const selfSupport = selfSupportProfileElements({
        centerX,
        topY,
        groundY,
        layoutHeightFt,
        pxPerFt,
        towerType,
        visual: profileVisual,
      });
      return (
        <g aria-label="Self-support profile">
          <path
            d={selfSupport.body}
            fill="color-mix(in oklab, var(--ti-ink) 5%, var(--ti-surface))"
            stroke="var(--ti-ink-2)"
            strokeWidth={1.6}
          />
          <path d={selfSupport.struts} stroke="color-mix(in oklab, var(--ti-ink) 28%, transparent)" strokeWidth={0.9} fill="none" />
          <path d={selfSupport.braces} stroke="color-mix(in oklab, var(--ti-ink) 32%, transparent)" strokeWidth={1} fill="none" />
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
  }, [
    centerX,
    groundY,
    layoutHeightFt,
    visibleGuideBands,
    towerType,
    elevationView,
    isAllFaces,
    profileReferenceUnderlay,
    profileVisual,
    referenceImageFailed,
    isProfile,
    guideBandHeightFt,
    pxPerFt,
  ]);

  const profileCallouts = useMemo(() => {
    if (!isProfile) return {};
    const inputs: { id: string; mountX: number; mountY: number; offsetX: number }[] = [];
    for (const pl of page.placements) {
      const node = nodes.find((n) => n.id === pl.deviceNodeId);
      const data = node?.data as DeviceData | undefined;
      if (!placementVisibleInView(pl, data, elevationView, trackItTowerContext)) continue;
      const topY = ftAglToY(layoutHeightFt, layoutHeightFt, pxPerFt);
      const mountY = Math.max(topY, ftAglToY(pl.mountHeightFtAgl, layoutHeightFt, pxPerFt));
      const colCenter = placementCenterX(
        pl,
        data,
        elevationView,
        trackItTowerContext,
        centerX,
      );
      inputs.push({
        id: pl.id,
        mountX: colCenter + (pl.offsetX ?? 0),
        mountY,
        offsetX: pl.offsetX ?? 0,
      });
    }
    return resolveProfilePlacementCallouts(inputs, centerX, contentW);
  }, [
    isProfile,
    page.placements,
    layoutHeightFt,
    pxPerFt,
    nodes,
    elevationView,
    trackItTowerContext,
    contentW,
    centerX,
  ]);

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
        const topY = ftAglToY(layoutHeightFt, layoutHeightFt, pxPerFt);
        items.push({
          id: pl.id,
          y: Math.max(topY, ftAglToY(pl.mountHeightFtAgl, layoutHeightFt, pxPerFt)),
        });
      }
      Object.assign(out, stackLabelY(items, 28));
    }
    return out;
  }, [isAllFaces, page.placements, layoutHeightFt, pxPerFt, nodes, elevationView, trackItTowerContext]);

  const previewCursor = cursorContent ? snapPoint(cursorContent.x, cursorContent.y) : null;
  const lastDraft = draftPoints[draftPoints.length - 1];
  const rulerTopY = ftAglToY(layoutHeightFt, layoutHeightFt, pxPerFt);

  const majorElevationTicks = useMemo(() => {
    const bandFt = new Set(visibleGuideBands.map((b) => b.ftAgl));
    return majorElevationTicksFtAgl(guideBandHeightFt).filter((ft) => !bandFt.has(ft));
  }, [visibleGuideBands, guideBandHeightFt]);

  const tickLabelStyle = elevationTickLabelStyle();

  const titleX = isProfile ? centerX : isAllFaces ? 70 : TOWER_DRAFT_RULER_W + 24;

  const cursorStyle = drawMode
    ? "crosshair"
    : panZoom.isPanning
      ? "grabbing"
      : isSectionElevation
        ? "grab"
        : "default";

  return (
    <div
      ref={panZoom.containerRef}
      className={embeddedInChrome ? "relative flex-1 min-h-[420px]" : "relative flex-1 min-h-0"}
      style={{
        fontFamily: "var(--ti-font-sans)",
        overflow: "hidden",
        cursor: cursorStyle,
        touchAction: "none",
        overscrollBehavior: "contain",
      }}
      tabIndex={isSectionElevation && !drawMode ? 0 : undefined}
      onMouseDown={panZoom.onMouseDown}
      onMouseMove={panZoom.onMouseMove}
      onMouseUp={panZoom.onMouseUp}
      onMouseLeave={(e) => {
        panZoom.onPointerOutside();
        panZoom.onMouseUp(e);
      }}
      onMouseEnter={panZoom.onPointerInside}
      onWheel={panZoom.onWheel}
      onWheelCapture={panZoom.onWheel}
      onDoubleClick={drawMode ? undefined : panZoom.onDoubleClick}
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
          onDoubleClick={drawMode ? onCanvasDoubleClick : undefined}
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
          {!isProfile && catalogHeightFt !== layoutHeightFt
            ? `${formatHeightFtAgl(layoutHeightFt, measurementSystem, { suffix: false })} face columns · ${formatHeightFtAgl(catalogHeightFt, measurementSystem, { suffix: false })} structure `
            : `${formatHeightFtAgl(catalogHeightFt, measurementSystem, { suffix: false })} `}
          {(() => {
            const nav = "scroll · drag · double-click zoom";
            const mini = tallTowerMode ? " · minimap" : "";
            if (profileReferenceUnderlay) {
              return tallTowerMode
                ? `reference elevation · ${nav}${mini}`
                : `reference elevation · ${nav} · align guide bands`;
            }
            if (isSectionElevation) {
              return `${towerType.replace("_", " ")} · ${nav}${mini} · click device to edit`;
            }
            return `${towerType.replace("_", " ")} · click to select · drag to move · double-click device to edit`;
          })()}
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
          {referenceImageLayer}
          {towerBody}

          {majorElevationTicks.map((ft) => {
            const y = ftAglToY(ft, guideBandHeightFt, pxPerFt);
            return (
              <g key={`tick-${ft}`} pointerEvents="none">
                <line
                  x1={gridRulerX - 10}
                  y1={y}
                  x2={gridRulerX - 2}
                  y2={y}
                  stroke="color-mix(in oklab, var(--ti-ink) 28%, transparent)"
                  strokeWidth={1}
                />
                {labelOnLightArt ? (
                  <SvgTextWithPill
                    x={gridRulerX - 12}
                    y={y + 4}
                    text={formatDistanceFromFt(ft, measurementSystem)}
                    textAnchor="end"
                    fontSize={tickLabelStyle.fontSize}
                    fontWeight={tickLabelStyle.fontWeight}
                    fill={tickLabelStyle.fill}
                    fontFamily="var(--ti-font-mono)"
                    onLightArt
                  />
                ) : (
                  <text
                    x={gridRulerX - 12}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={tickLabelStyle.fontSize}
                    fontWeight={tickLabelStyle.fontWeight}
                    fill={tickLabelStyle.fill}
                    fontFamily="var(--ti-font-mono)"
                  >
                    {formatDistanceFromFt(ft, measurementSystem)}
                  </text>
                )}
              </g>
            );
          })}
          {visibleGuideBands.map((band) => {
            const y = ftAglToY(band.ftAgl, guideBandHeightFt, pxPerFt);
            const structural = isStructuralGuideBand(band);
            const ls = guideBandLineStyle(structural);
            const bandLabel = formatGuideBandElevationLabel(band, measurementSystem);
            const splitProfileLabel =
              isProfile && structural && formatGuideBandLabelSuffix(band) != null;
            const rulerHeightLabel = formatGuideBandRulerHeightLabel(band, measurementSystem);
            const levelSuffix = splitProfileLabel ? formatGuideBandLabelSuffix(band) : null;
            const labelY = splitProfileLabel ? y - PROFILE_GUIDE_BAND_LABEL_OFFSET_Y : y + 4;
            const suffixStyle = profileGuideBandLevelSuffixStyle(structural);
            return (
              <g key={`${band.ftAgl}-${band.label ?? ""}`} pointerEvents="none">
                <line
                  x1={gridRulerX}
                  y1={y}
                  x2={contentW - 24}
                  y2={y}
                  stroke={ls.stroke}
                  strokeWidth={ls.strokeWidth}
                  strokeDasharray={ls.strokeDasharray}
                />
                {labelOnLightArt ? (
                  <SvgTextWithPill
                    x={gridRulerX - 8}
                    y={labelY}
                    text={splitProfileLabel ? rulerHeightLabel : bandLabel}
                    textAnchor="end"
                    fontSize={ls.labelFontSize}
                    fontWeight={ls.labelFontWeight}
                    fill={ls.labelFill}
                    fontFamily="var(--ti-font-mono)"
                    onLightArt
                    pointerEvents="all"
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
                  />
                ) : (
                  <text
                    x={gridRulerX - 8}
                    y={labelY}
                    textAnchor="end"
                    dominantBaseline="alphabetic"
                    fontSize={ls.labelFontSize}
                    fontWeight={ls.labelFontWeight}
                    fill={ls.labelFill}
                    fontFamily="var(--ti-font-mono)"
                    pointerEvents="all"
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
                    {splitProfileLabel ? rulerHeightLabel : bandLabel}
                  </text>
                )}
                {splitProfileLabel && levelSuffix ? (
                  labelOnLightArt ? (
                    <SvgTextWithPill
                      x={gridRulerX + 14}
                      y={labelY}
                      text={levelSuffix}
                      textAnchor="start"
                      fontSize={suffixStyle.fontSize}
                      fontWeight={suffixStyle.fontWeight}
                      fill={suffixStyle.fill}
                      fontFamily="var(--ti-font-mono)"
                      onLightArt
                    />
                  ) : (
                    <text
                      x={gridRulerX + 14}
                      y={labelY}
                      textAnchor="start"
                      dominantBaseline="alphabetic"
                      fontSize={suffixStyle.fontSize}
                      fontWeight={suffixStyle.fontWeight}
                      fill={suffixStyle.fill}
                      fontFamily="var(--ti-font-mono)"
                      pointerEvents="none"
                    >
                      {levelSuffix}
                    </text>
                  )
                ) : null}
              </g>
            );
          })}
          {!isProfile && catalogHeightFt > layoutHeightFt && (
            <line
              x1={gridRulerX}
              y1={rulerTopY}
              x2={contentW - 24}
              y2={rulerTopY}
              stroke="color-mix(in oklab, var(--ti-accent) 45%, transparent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}

          {page.polylines
            .filter((pl) => !pl.feedlineFromNodeId || isProfile)
            .map((pl) => {
            const selected = pl.id === selectedPolylineId;
            const linkedPlacement = pl.feedlineFromNodeId
              ? page.placements.find((p) => p.deviceNodeId === pl.feedlineFromNodeId)
              : undefined;
            const linkedSelected =
              linkedPlacement != null && linkedPlacement.id === selectedPlacementId;
            const feedlineActive = selected || linkedSelected;
            const dash =
              pl.lineStyle != null
                ? towerDraftPolylineDash(pl.lineStyle)
                : feedlineStrokeDash(pl.feedType);
            return pl.points.length >= 2 ? (
              <polyline
                key={pl.id}
                points={pl.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={feedlineActive ? "var(--ti-accent)" : pl.strokeColor ?? "var(--ti-faint)"}
                strokeWidth={(pl.strokeWidth ?? 1.5) + (feedlineActive ? 0.75 : 0)}
                strokeDasharray={dash}
                opacity={pl.feedlineFromNodeId ? (feedlineActive ? 0.95 : 0.55) : 1}
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
            const topY = ftAglToY(layoutHeightFt, layoutHeightFt, pxPerFt);
            const y = Math.max(topY, ftAglToY(pl.mountHeightFtAgl, layoutHeightFt, pxPerFt));
            const plFace = resolvePlacementTowerFace(pl, data, trackItTowerContext);
            const colCenter = placementCenterX(
              pl,
              data,
              elevationView,
              trackItTowerContext,
              isProfile ? centerX : undefined,
            );
            const x = colCenter + (pl.offsetX ?? 0);
            const callout = isProfile ? profileCallouts[pl.id] : undefined;
            const labelRailX = callout?.labelX ?? profileLabelXForMount(x, centerX, contentW);
            const ly = isProfile
              ? (callout?.labelY ?? y)
              : isAllFaces
                ? (facesLabelY[pl.id] ?? y)
                : y;
            const glyphFace =
              elevationView === "all-faces" ? plFace : viewFace;
            const selected = pl.id === selectedPlacementId;
            const hovered = pl.id === hoverPlacementId;
            const azimuthDeg = resolvePlacementAzimuthDeg(pl, data, trackItTowerContext);
            const bandLabel = data?.ports?.find((p) => p.rf?.band)?.rf?.band ?? "";
            const heightLabel = formatHeightFtAgl(pl.mountHeightFtAgl, measurementSystem);
            const footerAuxLabel = towerFooterAuxDisplayLines(data, { maxLines: 2, currency });
            const footerAuxHover = towerFooterAuxDisplayLines(data, { maxLines: 5, currency });
            const showLabelCard =
              labelLayers.designation ||
              labelLayers.azimuth ||
              labelLayers.band ||
              footerAuxLabel.length > 0;
            const tipLines = [
              label,
              ...footerAuxHover,
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
                transform={
                  glyphViewportBoost > 1
                    ? `translate(${x}, ${y}) scale(${glyphViewportBoost})`
                    : `translate(${x}, ${y})`
                }
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
                    towerFace: pl.towerFace,
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
                  const startColCenter = placementCenterX(
                    pl,
                    data,
                    elevationView,
                    trackItTowerContext,
                    isProfile ? centerX : undefined,
                  );
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
                        ftAglToY(startFt, layoutHeightFt, pxPerFt) + (cur.y - startSvg.y),
                        layoutHeightFt,
                        snapFt,
                        visibleGuideBands,
                        pxPerFt,
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
                {isProfile && showLabelCard && (
                  <polyline
                    points={profileCalloutLeaderPoints(labelRailX, x, ly, y)}
                    fill="none"
                    stroke={selected ? "var(--ti-accent)" : "var(--ti-faint)"}
                    strokeWidth={selected ? 1.4 : 1}
                    opacity={0.8}
                  />
                )}
                {deviceHighlight && (
                  <TowerDraftPlacementMarker selected={selected} hovered={hovered} />
                )}
                {selected && !deviceHighlight && (
                  <>
                    <circle cx={0} cy={0} r={18} fill="none" stroke="var(--ti-accent)" strokeWidth={1.5} opacity={0.5} strokeDasharray="3 3" />
                    <rect x={-17} y={-17} width={34} height={34} rx={8} fill="color-mix(in oklab, var(--ti-accent) 8%, transparent)" />
                  </>
                )}
                {selected && deviceHighlight && (
                  <circle
                    cx={0}
                    cy={0}
                    r={22}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2}
                    opacity={0.55}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                )}
                <TowerDraftPlacementGlyph
                  deviceType={data?.deviceType}
                  selected={selected}
                  hovered={hovered}
                  prominent={deviceHighlight}
                  azimuthDeg={azimuthDeg}
                  dishDiameterM={dishDiameterMFromData(data)}
                  elevationView={elevationView}
                  viewFace={glyphFace}
                  placementFace={plFace}
                  mountFlip={pl.mountFlip}
                />
                {showLabelCard && (
                  <g
                    transform={`translate(${isProfile ? labelRailX - x : 16}, ${isProfile || isAllFaces ? ly - y : 0})`}
                    data-print-show
                  >
                    <TowerDraftLabelCard
                      onLightArt={labelOnLightArt}
                      lines={(() => {
                        const lines: TowerDraftLabelLine[] = [];
                        const mutedFill = labelOnLightArt ? LIGHT_ART_LABEL.muted : "var(--ti-muted)";
                        if (labelLayers.designation) {
                          lines.push({
                            key: "designation",
                            text: label,
                            y: isProfile ? -2 : -8,
                            fontSize: isProfile ? 10.5 : 10,
                            fontWeight: 600,
                            fill: labelOnLightArt ? LIGHT_ART_LABEL.ink : "var(--ti-ink)",
                          });
                        }
                        if (labelLayers.azimuth && azimuthDeg != null) {
                          lines.push({
                            key: "azimuth",
                            text: `${azimuthDeg}°`,
                            y: isProfile ? 11 : 4,
                            fontSize: 9,
                            fill: labelOnLightArt ? LIGHT_ART_LABEL.accent : "var(--ti-accent)",
                            fontFamily: "var(--ti-font-mono)",
                          });
                        }
                        if (labelLayers.band && bandLabel) {
                          lines.push({
                            key: "band",
                            text: bandLabel,
                            x: isProfile ? 40 : labelLayers.azimuth && azimuthDeg != null ? 36 : 0,
                            y: isProfile ? 11 : 4,
                            fontSize: 9,
                            fill: mutedFill,
                            fontFamily: "var(--ti-font-mono)",
                          });
                        }
                        if (footerAuxLabel.length > 0) {
                          const footerStartY =
                            lines.length > 0
                              ? Math.max(...lines.map((l) => l.y)) + (isProfile ? 13 : 12)
                              : isProfile
                                ? 11
                                : 4;
                          footerAuxLabel.forEach((raw, i) => {
                            const truncated = truncateTowerLabelText(raw);
                            lines.push({
                              key: `footer-${i}`,
                              text: truncated,
                              y: footerStartY + i * (isProfile ? 11 : 10),
                              fontSize: 8.5,
                              fill: mutedFill,
                              title: truncated !== raw ? raw : undefined,
                            });
                          });
                        }
                        return lines;
                      })()}
                    />
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

      {tallTowerMode && (
        <TowerDraftMinimap
          towerHeightFt={layoutHeightFt}
          pxPerFt={pxPerFt}
          contentOffsetY={contentOffsetY}
          guideBandsFt={page.guideBandsFt}
          elevationRef={elevationRef}
          zoom={panZoom.zoom}
          viewOffset={panZoom.viewOffset}
          containerHeight={viewportSize.h}
          onPanToContentY={panToContentY}
        />
      )}

      <ViewNavBar
        zoom={panZoom.zoom}
        onZoomIn={panZoom.zoomInView}
        onZoomOut={panZoom.zoomOutView}
        onFitAll={() => {
          if (tallTowerMode) applyTallTowerViewport();
          else panZoom.fitAllView(viewBounds);
          saveTowerDraftViewport(viewportStorageKey, {
            zoom: panZoom.zoom,
            pan: panZoom.viewOffset,
          });
        }}
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
