import { useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import TowerDraftRenderer from "./TowerDraftRenderer";
import TowerDraftSidebar from "./TowerDraftSidebar";
import TowerDraftToolbar, { type TowerDraftDrawStyle } from "./TowerDraftToolbar";

export default function TowerDraftPageView() {
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const removeTowerDraftPlacement = useSchematicStore((s) => s.removeTowerDraftPlacement);
  const removeTowerDraftPolyline = useSchematicStore((s) => s.removeTowerDraftPolyline);

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

  const page = pages.find((p) => p.id === activePage);
  const pageId = page?.type === "tower-draft" ? page.id : null;

  const selectedLabel = useMemo(() => {
    if (!page || page.type !== "tower-draft") return null;
    if (selectedPlacementId) {
      const pl = page.placements.find((p) => p.id === selectedPlacementId);
      if (!pl) return null;
      const node = nodes.find((n) => n.id === pl.deviceNodeId);
      const data = node?.data as { label?: string } | undefined;
      return data?.label ?? pl.deviceNodeId;
    }
    if (selectedPolylineId) return "Line";
    return null;
  }, [page, selectedPlacementId, selectedPolylineId, nodes]);

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
        setSelectedPlacementId(null);
        setSelectedPolylineId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageId, selectedPlacementId, selectedPolylineId, drawMode]);

  if (!page || page.type !== "tower-draft") return null;

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
        selectedLabel={selectedLabel}
        onRemoveSelected={selectedLabel ? removeSelected : undefined}
      />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <TowerDraftSidebar
          page={page}
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
        />
        <TowerDraftRenderer
          page={page}
          drawMode={drawMode}
          snapFt={snapFt}
          drawStyle={drawStyle}
          selectedPlacementId={selectedPlacementId}
          selectedPolylineId={selectedPolylineId}
          onSelectPlacement={setSelectedPlacementId}
          onSelectPolyline={setSelectedPolylineId}
          onClearSelection={() => {
            setSelectedPlacementId(null);
            setSelectedPolylineId(null);
          }}
          onDrawLineFinished={() => {
            if (!drawLatched) setDrawMode(false);
          }}
          onExitDrawMode={() => {
            setDrawMode(false);
            setDrawLatched(false);
          }}
        />
      </div>
    </div>
  );
}
