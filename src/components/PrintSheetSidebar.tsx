import { useSchematicStore } from "../store";
import { KGO_ES_DRAWING_TAB_LABEL } from "../branding";
import type { RackElevationPage } from "../types";
import { newDrawingViewportForSheet } from "../drawingViewportUtils";
import type { PrintSheetPage } from "../types";

export default function PrintSheetSidebar() {
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const activePage = useSchematicStore((s) => s.activePage);
  const addViewport = useSchematicStore((s) => s.addViewport);

  const elevationPages = pages.filter((p): p is RackElevationPage => p.type === "rack-elevation");
  const hasDrawing = nodes.length > 0;

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
    <div className="w-44 bg-[var(--color-bg)] border-r border-[var(--color-border)] overflow-y-auto flex flex-col text-xs" data-print-hide>
      <div className="px-2 pt-2 pb-1 font-semibold text-neutral-500 uppercase tracking-wider" style={{ fontSize: 9 }}>
        Drag to Sheet
      </div>

      {hasDrawing && (
        <div className="mb-2">
          <div className="px-2 py-0.5 text-neutral-600 font-medium truncate" title={KGO_ES_DRAWING_TAB_LABEL}>
            {KGO_ES_DRAWING_TAB_LABEL}
          </div>
          <div
            className="ml-2 px-2 py-0.5 rounded cursor-grab text-neutral-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 transition-colors"
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
          <div className="px-2 py-0.5 text-neutral-600 font-medium truncate" title={ep.label}>
            {ep.label}
          </div>
          {ep.racks.map((rack) => (
            <div key={rack.id} className="ml-2 mb-1">
              <div className="px-2 py-0.5 text-neutral-500 truncate" title={rack.label} style={{ fontSize: 10 }}>
                {rack.label} ({rack.heightU}U)
              </div>
              {(["rack-front", "rack-rear", "rack-side"] as const).map((kind) => (
                <div
                  key={kind}
                  className="ml-2 px-2 py-0.5 rounded cursor-grab text-neutral-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 transition-colors"
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
    </div>
  );
}
