import { useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import {
  buildTowerDraftScheduleRows,
  downloadTowerDraftCsv,
  towerDraftScheduleToCsv,
} from "../towerDraftExport";
import TowerDraftContextMenu, { type TowerDraftContextMenuState } from "./TowerDraftContextMenu";
import TowerDraftInspectorRail from "./TowerDraftInspectorRail";
import TowerDraftRenderer from "./TowerDraftRenderer";
import TowerDraftSitePlan from "./TowerDraftSitePlan";
import TowerDraftSidebar from "./TowerDraftSidebar";
import TowerDraftToolbar, { type TowerDraftDrawStyle } from "./TowerDraftToolbar";
import {
  towerElevationViewFrom,
  type TowerElevationView,
  type TowerFaceFilter,
  type TowerMainView,
} from "../towerDraftFaces";

export default function TowerDraftPageView() {
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const measurementSystem = useSchematicStore((s) => s.measurementSystem);
  const removeTowerDraftPlacement = useSchematicStore((s) => s.removeTowerDraftPlacement);
  const removeTowerDraftPolyline = useSchematicStore((s) => s.removeTowerDraftPolyline);
  const updateTowerDraftPage = useSchematicStore((s) => s.updateTowerDraftPage);
  const updateTowerDraftPlacement = useSchematicStore((s) => s.updateTowerDraftPlacement);
  const syncTowerDraftFromSchematicDevices = useSchematicStore((s) => s.syncTowerDraftFromSchematicDevices);
  const suggestTowerDraftFeedlines = useSchematicStore((s) => s.suggestTowerDraftFeedlines);
  const requestTowerDraftFocus = useSchematicStore((s) => s.requestTowerDraftFocus);
  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);

  const [drawMode, setDrawMode] = useState(false);
  const [drawLatched, setDrawLatched] = useState(false);
  const [snapFt, setSnapFt] = useState(5);
  const [drawStyle, setDrawStyle] = useState<TowerDraftDrawStyle>({
    strokeWidth: 1.5,
    lineStyle: "solid",
    strokeColor: "#334155",
  });
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedPolylineId, setSelectedPolylineId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<TowerMainView>("profile");
  const [faceFilter, setFaceFilter] = useState<TowerFaceFilter>("All");
  const [leftOpen, setLeftOpen] = useState(true);
  const [inspOpen, setInspOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<TowerDraftContextMenuState | null>(null);

  const elevationView: TowerElevationView = useMemo(
    () => towerElevationViewFrom(mainView, faceFilter),
    [mainView, faceFilter],
  );

  const page = pages.find((p) => p.id === activePage);
  const pageId = page?.type === "tower-draft" ? page.id : null;

  const labelLayers = page?.type === "tower-draft" ? (page.labelLayers ?? {}) : {};

  const selectedPlacement =
    page?.type === "tower-draft" && selectedPlacementId
      ? page.placements.find((p) => p.id === selectedPlacementId)
      : undefined;

  const removeSelected = () => {
    if (!pageId) return;
    if (selectedPlacementId) {
      removeTowerDraftPlacement(pageId, selectedPlacementId);
      setSelectedPlacementId(null);
    } else if (selectedPolylineId) {
      removeTowerDraftPolyline(pageId, selectedPolylineId);
      setSelectedPolylineId(null);
    }
  };

  const openContextMenu = (menu: TowerDraftContextMenuState) => {
    setContextMenu(menu);
  };

  const focusPlacementInTrackIt = () => {
    if (!selectedPlacement?.plantLocationId) return;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "KGO_ES_FOCUS_TOWER_LEVEL",
            payload: { plantLocationId: selectedPlacement.plantLocationId },
          },
          "*",
        );
      }
    } catch {
      /* ignore */
    }
  };

  const openSurveyInTrackIt = trackItTowerContext?.siteCode
    ? () => {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: "KGO_ES_FOCUS_TOWER_LEVEL", payload: { siteCode: trackItTowerContext.siteCode } },
              "*",
            );
          }
        } catch {
          /* ignore */
        }
      }
    : undefined;

  useEffect(() => {
    if (!pageId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPlacementId || selectedPolylineId) {
          e.preventDefault();
          removeSelected();
        }
      }
      if (e.key === "Escape" && !drawMode) {
        setContextMenu(null);
        setSelectedPlacementId(null);
        setSelectedPolylineId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageId, selectedPlacementId, selectedPolylineId, drawMode]);

  if (!page || page.type !== "tower-draft") return null;

  const handleSelectLevel = (plantLocationId: string) => {
    const pl = page.placements.find((p) => p.plantLocationId === plantLocationId);
    if (pl) {
      setSelectedPlacementId(pl.id);
      requestTowerDraftFocus({ pageId: page.id, placementId: pl.id });
      return;
    }
    const level = trackItTowerContext?.antennaLevels.find((l) => l.id === plantLocationId);
    if (level?.mountHeightM != null) {
      requestTowerDraftFocus({
        pageId: page.id,
        mountHeightFtAgl: Math.round(level.mountHeightM * 3.28084),
      });
    }
  };

  const canvasChrome = (
    <div
      style={{
        background: "var(--ti-surface)",
        border: "1px solid var(--ti-border)",
        borderRadius: 10,
        boxShadow: "var(--ti-shadow-md)",
        padding: 8,
        maxWidth: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {mainView === "site" ? (
        <TowerDraftSitePlan
          embedded
          page={page}
          selectedPlacementId={selectedPlacementId}
          onSelectPlacement={(id) => {
            setSelectedPlacementId(id);
            setSelectedPolylineId(null);
          }}
          onOpenSurveyInTrackIt={openSurveyInTrackIt}
        />
      ) : (
        <TowerDraftRenderer
          page={page}
          drawMode={drawMode}
          snapFt={snapFt}
          drawStyle={drawStyle}
          elevationView={elevationView}
          measurementSystem={measurementSystem}
          selectedPlacementId={selectedPlacementId}
          selectedPolylineId={selectedPolylineId}
          onSelectPlacement={setSelectedPlacementId}
          onSelectPolyline={setSelectedPolylineId}
          onClearSelection={() => {
            setSelectedPlacementId(null);
            setSelectedPolylineId(null);
          }}
          onOpenContextMenu={openContextMenu}
          onDrawLineFinished={() => {
            if (!drawLatched) setDrawMode(false);
          }}
          onExitDrawMode={() => {
            setDrawMode(false);
            setDrawLatched(false);
          }}
          embeddedInChrome
        />
      )}
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        minHeight: 0,
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <TowerDraftSidebar
        page={page}
        leftOpen={leftOpen}
        onLeftOpenChange={setLeftOpen}
        measurementSystem={measurementSystem}
        selectedPlacementId={selectedPlacementId}
        selectedPolylineId={selectedPolylineId}
        onSelectPlacement={(id) => {
          setSelectedPlacementId(id);
          setSelectedPolylineId(null);
        }}
        onSelectPolyline={(id) => {
          setSelectedPolylineId(id);
          setSelectedPlacementId(null);
        }}
        onSelectLevel={handleSelectLevel}
        onOpenContextMenu={openContextMenu}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <TowerDraftToolbar
          drawMode={drawMode}
          drawLatched={drawLatched}
          onDrawModeChange={(on) => {
            setDrawMode(on);
            if (on) {
              setSelectedPlacementId(null);
              setSelectedPolylineId(null);
            }
          }}
          onDrawLatchedChange={setDrawLatched}
          snapFt={snapFt}
          onSnapFtChange={setSnapFt}
          drawStyle={drawStyle}
          onDrawStyleChange={(patch) => setDrawStyle((s) => ({ ...s, ...patch }))}
          onSyncFromSchematic={() => syncTowerDraftFromSchematicDevices(page.id)}
          onSuggestFeedlines={() => suggestTowerDraftFeedlines(page.id)}
          onExportCsv={() => {
            const rows = buildTowerDraftScheduleRows(
              page,
              nodes.map((n) => ({ id: n.id, data: n.data as import("../types").DeviceData })),
              trackItTowerContext,
              useShortNames,
            );
            downloadTowerDraftCsv(page, towerDraftScheduleToCsv(rows));
          }}
          onPrint={() => window.print()}
          labelLayers={labelLayers}
          onLabelLayersChange={(patch) =>
            updateTowerDraftPage(page.id, { labelLayers: { ...labelLayers, ...patch } })
          }
          mainView={mainView}
          faceFilter={faceFilter}
          onMainViewChange={setMainView}
          onFaceFilterChange={setFaceFilter}
          measurementSystem={measurementSystem}
        />

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            background: "var(--ti-bg)",
            backgroundImage:
              "radial-gradient(var(--ti-border-soft) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {canvasChrome}
        </div>
      </div>

      <TowerDraftInspectorRail
        page={page}
        measurementSystem={measurementSystem}
        selectedPlacementId={selectedPlacementId}
        inspOpen={inspOpen}
        onInspOpenChange={setInspOpen}
        onSelectPlacement={(id) => {
          setSelectedPlacementId(id);
          setSelectedPolylineId(null);
          requestTowerDraftFocus({ pageId: page.id, placementId: id });
        }}
        onClearSelection={() => setSelectedPlacementId(null)}
        onEditDevice={() => {
          const pl = page.placements.find((p) => p.id === selectedPlacementId);
          if (pl) setEditingNodeId(pl.deviceNodeId);
        }}
        onOpenTrackIt={selectedPlacement?.plantLocationId ? focusPlacementInTrackIt : undefined}
        onRemovePlacement={() => {
          if (!selectedPlacementId) return;
          removeTowerDraftPlacement(page.id, selectedPlacementId);
          setSelectedPlacementId(null);
        }}
      />

      <TowerDraftContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRemovePlacement={(placementId) => {
          removeTowerDraftPlacement(page.id, placementId);
          if (selectedPlacementId === placementId) setSelectedPlacementId(null);
        }}
        onSetPlacementFace={(placementId, face) => {
          updateTowerDraftPlacement(page.id, placementId, { towerFace: face });
        }}
      />
    </div>
  );
}
