import { useSchematicStore } from "../store";
import { KGO_ES_DRAWING_TAB_LABEL } from "../branding";
import type { RackElevationPage, TowerDraftPage } from "../types";
import { newDrawingViewportForSheet } from "../drawingViewportUtils";
import type { PrintSheetPage } from "../types";

export default function PrintSheetSidebar() {
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const activePage = useSchematicStore((s) => s.activePage);
  const addViewport = useSchematicStore((s) => s.addViewport);

  const elevationPages = pages.filter((p): p is RackElevationPage => p.type === "rack-elevation");
  const towerPages = pages.filter((p): p is TowerDraftPage => p.type === "tower-draft");
  const hasDrawing = nodes.length > 0;

  const handleTowerDragStart = (
    e: React.DragEvent,
    pageId: string,
    towerView: "profile" | "all-faces" | "site",
  ) => {
    e.dataTransfer.setData(
      "application/x-print-viewport",
      JSON.stringify({ kind: "tower-draft", towerDraftPageId: pageId, towerView }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleRackDragStart = (
    e: React.DragEvent,
    pageId: string,
    rackId: string,
    kind: "rack-front" | "rack-rear" | "rack-side",
  ) => {
    e.dataTransfer.setData(
      "application/x-print-viewport",
      JSON.stringify({ kind, pageId, rackId }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrawingDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/x-print-viewport",
      JSON.stringify({ kind: "drawing" }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const sheet = pages.find((p) => p.id === activePage && p.type === "print-sheet") as PrintSheetPage | undefined;

  const addDrawingViewport = () => {
    if (!activePage || !sheet) return;
    const vp = newDrawingViewportForSheet(sheet, nodes);
    if (vp) addViewport(activePage, vp);
  };

  if (elevationPages.length === 0 && !hasDrawing) return null;

  return (
    <div className="w-44 bg-white dark:bg-[var(--color-surface)] border-r border-neutral-200 dark:border-[var(--color-border)] overflow-y-auto flex flex-col text-xs" data-print-hide>
      <div className="px-2 pt-2 pb-1 font-semibold text-neutral-500 dark:text-[var(--color-text-muted)] uppercase tracking-wider" style={{ fontSize: 9 }}>
        Drag to Sheet
      </div>

      {hasDrawing && (
        <div className="mb-2">
          <div className="px-2 py-0.5 text-neutral-600 dark:text-[var(--color-text)] font-medium truncate" title={KGO_ES_DRAWING_TAB_LABEL}>
            {KGO_ES_DRAWING_TAB_LABEL}
          </div>
          <div
            className="ml-2 px-2 py-0.5 rounded cursor-grab text-neutral-600 dark:text-[var(--color-text)] hover:bg-blue-50 dark:hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,#3b82f6_30%)] hover:text-blue-700 dark:hover:text-blue-200 border border-transparent hover:border-blue-200 dark:hover:border-[var(--color-border)] transition-colors"
            draggable
            onDragStart={handleDrawingDragStart}
            onClick={addDrawingViewport}
          >
            Full drawing
          </div>
        </div>
      )}

      {elevationPages.map((ep) => (
        <div key={ep.id} className="mb-2">
          <div className="px-2 py-0.5 text-neutral-600 dark:text-[var(--color-text)] font-medium truncate" title={ep.label}>
            {ep.label}
          </div>
          {ep.racks.map((rack) => (
            <div key={rack.id} className="ml-2 mb-1">
              <div className="px-2 py-0.5 text-neutral-500 dark:text-[var(--color-text-muted)] truncate" title={rack.label} style={{ fontSize: 10 }}>
                {rack.label} ({rack.heightU}U)
              </div>
              {(["rack-front", "rack-rear", "rack-side"] as const).map((kind) => (
                <div
                  key={kind}
                  className="ml-2 px-2 py-0.5 rounded cursor-grab text-neutral-600 dark:text-[var(--color-text)] hover:bg-blue-50 dark:hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,#3b82f6_30%)] hover:text-blue-700 dark:hover:text-blue-200 border border-transparent hover:border-blue-200 dark:hover:border-[var(--color-border)] transition-colors"
                  draggable
                  onDragStart={(e) => handleRackDragStart(e, ep.id, rack.id, kind)}
                  onClick={() => {
                    if (!activePage) return;
                    addViewport(activePage, {
                      kind,
                      rackRefPageId: ep.id,
                      rackRefId: rack.id,
                      positionMm: { x: 20, y: 20 },
                      sizeMm: { w: 60, h: 80 },
                      showLabel: true,
                    });
                  }}
                >
                  {kind === "rack-front" ? "Front" : kind === "rack-rear" ? "Rear" : "Side"}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      {towerPages.map((tp) => (
        <div key={tp.id} className="mb-2">
          <div className="px-2 py-0.5 text-neutral-600 dark:text-[var(--color-text)] font-medium truncate" title={tp.label}>
            {tp.label}
          </div>
          {(
            [
              { view: "profile" as const, label: "Profile" },
              { view: "all-faces" as const, label: "All faces" },
              { view: "site" as const, label: "Site plan" },
            ] as const
          ).map(({ view, label }) => (
            <div
              key={view}
              className="ml-2 px-2 py-0.5 rounded cursor-grab text-neutral-600 dark:text-[var(--color-text)] hover:bg-blue-50 dark:hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,#3b82f6_30%)] hover:text-blue-700 dark:hover:text-blue-200 border border-transparent hover:border-blue-200 dark:hover:border-[var(--color-border)] transition-colors"
              draggable
              onDragStart={(e) => handleTowerDragStart(e, tp.id, view)}
              onClick={() => {
                if (!activePage) return;
                addViewport(activePage, {
                  kind: "tower-draft",
                  towerDraftPageId: tp.id,
                  towerView: view,
                  positionMm: { x: 20, y: 20 },
                  sizeMm: { w: 80, h: 100 },
                  showLabel: true,
                });
              }}
            >
              {label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
