import { useEffect, useState } from "react";
import { useSchematicStore } from "../store";
import {
  buildTowerDraftScheduleRows,
  downloadTowerDraftCsv,
  towerDraftScheduleToCsv,
} from "../towerDraftExport";
import TowerDraftContextMenu, { type TowerDraftContextMenuState } from "./TowerDraftContextMenu";
import TowerDraftPlacementInspector from "./TowerDraftPlacementInspector";
import TowerDraftRenderer from "./TowerDraftRenderer";
import TowerDraftSidebar from "./TowerDraftSidebar";
import TowerDraftToolbar, { type TowerDraftDrawStyle } from "./TowerDraftToolbar";
import type { TowerElevationView } from "../towerDraftFaces";

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
  const [elevationView, setElevationView] = useState<TowerElevationView>("profile");
  const [contextMenu, setContextMenu] = useState<TowerDraftContextMenuState | null>(null);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
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
        elevationView={elevationView}
        onElevationViewChange={setElevationView}
        measurementSystem={measurementSystem}
      />
      <div className="relative flex flex-1 overflow-hidden min-h-0">
        <TowerDraftSidebar
          page={page}
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
        />
        {selectedPlacementId && (
          <TowerDraftPlacementInspector
            page={page}
            placementId={selectedPlacementId}
            measurementSystem={measurementSystem}
            onClose={() => setSelectedPlacementId(null)}
            onEditDevice={() => {
              const pl = page.placements.find((p) => p.id === selectedPlacementId);
              if (pl) setEditingNodeId(pl.deviceNodeId);
            }}
            onOpenTrackIt={selectedPlacement?.plantLocationId ? focusPlacementInTrackIt : undefined}
            onRemove={() => {
              removeTowerDraftPlacement(page.id, selectedPlacementId);
              setSelectedPlacementId(null);
            }}
          />
        )}
      </div>
      <TowerDraftContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRemovePlacement={(placementId) => {
          removeTowerDraftPlacement(page.id, placementId);
          if (selectedPlacementId === placementId) setSelectedPlacementId(null);
        }}
      />
    </div>
  );
}
