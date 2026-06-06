import { useMemo, useRef, type ReactNode } from "react";
import DeviceLibrary from "./DeviceLibrary";
import ViewOptionsPanel from "./ViewOptionsPanel";
import ShowInfoPanel from "./ShowInfoPanel";
import TrackItNumberingPanel from "./TrackItNumberingPanel";
import SignalColorPanel from "./SignalColorPanel";
import CadToolsPanel from "./CadToolsPanel";
import KgoRightPanel from "./KgoRightPanel";
import KgoCanvasToolbar from "./KgoCanvasToolbar";
import { useSidebarStore } from "../sidebarStore";
import { useWorkspacePanelDrag } from "../hooks/useWorkspacePanelDrag";
import type { PanelDockEdge, WorkspacePanelId } from "../workspacePanelLayout";
import { resolveInspectorPlacement } from "../workspacePanelLayout";
import { WorkspaceDragContext, WorkspaceFloatContext } from "../workspacePanelContext";

function SnapGuides({ edge }: { edge: PanelDockEdge | null }) {
  if (!edge || edge === "float") return null;
  const base = "pointer-events-none absolute z-[60] bg-[var(--ti-accent)] opacity-35";
  if (edge === "left") return <div className={`${base} left-0 top-0 bottom-0 w-1`} />;
  if (edge === "right") return <div className={`${base} right-0 top-0 bottom-0 w-1`} />;
  if (edge === "top") return <div className={`${base} left-0 right-0 top-0 h-1`} />;
  return <div className={`${base} left-0 right-0 bottom-0 h-1`} />;
}

function WorkspacePanelFrame({
  id,
  floating,
  layout,
  children,
}: {
  id: WorkspacePanelId;
  floating: boolean;
  layout: { floatX: number; floatY: number };
  children: ReactNode;
}) {
  if (!floating) {
    return (
      <div
        data-workspace-panel={id}
        data-workspace-docked="true"
        className="flex h-full min-h-0 max-h-full shrink-0 flex-col overflow-hidden"
      >
        {children}
      </div>
    );
  }

  return (
    <WorkspaceFloatContext.Provider value>
      <div
        data-workspace-panel={id}
        data-workspace-floating="true"
        className="absolute z-[55] flex max-h-[calc(100%-16px)] flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden"
        style={{ left: layout.floatX, top: layout.floatY }}
      >
        {children}
      </div>
    </WorkspaceFloatContext.Provider>
  );
}

function panelVisible(
  id: WorkspacePanelId,
  panelsVisible: ReturnType<typeof useSidebarStore.getState>["panelsVisible"],
): boolean {
  if (id === "devices") return panelsVisible.devices;
  if (id === "viewOptions") return panelsVisible.viewOptions;
  if (id === "trackItNumbers") return panelsVisible.trackItNumbers;
  if (id === "showInfo") return panelsVisible.showInfo;
  if (id === "colors") return panelsVisible.colors;
  if (id === "cadTools") return panelsVisible.cadTools;
  if (id === "canvasToolbar") return true;
  return false;
}

function renderPanel(id: WorkspacePanelId): ReactNode {
  switch (id) {
    case "devices":
      return <DeviceLibrary />;
    case "viewOptions":
      return <ViewOptionsPanel />;
    case "trackItNumbers":
      return <TrackItNumberingPanel />;
    case "showInfo":
      return <ShowInfoPanel />;
    case "colors":
      return <SignalColorPanel />;
    case "cadTools":
      return <CadToolsPanel />;
    case "inspector":
      return <KgoRightPanel />;
    case "canvasToolbar":
      return <KgoCanvasToolbar />;
    default:
      return null;
  }
}

type SchematicWorkspaceLayoutProps = {
  canvas: ReactNode;
  commandBar: ReactNode;
  viewportEditor: ReactNode;
};

export default function SchematicWorkspaceLayout({
  canvas,
  commandBar,
  viewportEditor,
}: SchematicWorkspaceLayoutProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const { startDrag, draggingId } = useWorkspacePanelDrag(workspaceRef);
  const dragCtx = useMemo(() => ({ startDrag }), [startDrag]);

  const panelsVisible = useSidebarStore((s) => s.panelsVisible);
  const rightPanelOrder = useSidebarStore((s) => s.rightPanelOrder);
  const panelLayouts = useSidebarStore((s) => s.panelLayouts);
  const snapPreview = useSidebarStore((s) => s.snapPreview);
  const rightInspectorOpen = useSidebarStore((s) => s.rightInspectorOpen);

  const inspectorPlacement = resolveInspectorPlacement(
    panelLayouts.inspector?.edge ?? "right",
    rightInspectorOpen,
  );

  const dockedLeft = useMemo(() => {
    const ids: WorkspacePanelId[] = [];
    const candidates: WorkspacePanelId[] = ["devices", ...rightPanelOrder];
    for (const id of candidates) {
      if (!panelVisible(id, panelsVisible)) continue;
      if (panelLayouts[id]?.edge === "left") ids.push(id);
    }
    if (inspectorPlacement === "left") ids.push("inspector");
    return ids;
  }, [inspectorPlacement, panelLayouts, panelsVisible, rightPanelOrder]);

  const dockedRight = useMemo(() => {
    const ids: WorkspacePanelId[] = [];
    if (panelVisible("devices", panelsVisible) && panelLayouts.devices?.edge === "right") {
      ids.push("devices");
    }
    for (const id of rightPanelOrder) {
      if (!panelVisible(id, panelsVisible)) continue;
      if (panelLayouts[id]?.edge === "right") ids.push(id);
    }
    if (inspectorPlacement === "right") ids.push("inspector");
    return ids;
  }, [inspectorPlacement, panelLayouts, panelsVisible, rightPanelOrder]);

  const dockedTop: WorkspacePanelId[] = [];
  const dockedBottom: WorkspacePanelId[] = [];
  if (panelLayouts.canvasToolbar?.edge === "top") dockedTop.push("canvasToolbar");
  if (panelLayouts.canvasToolbar?.edge === "bottom") dockedBottom.push("canvasToolbar");

  const floatingIds = (Object.keys(panelLayouts) as WorkspacePanelId[]).filter((id) => {
    if (id === "inspector") return inspectorPlacement === "float";
    if (!panelVisible(id, panelsVisible)) return false;
    return panelLayouts[id]?.edge === "float";
  });

  const showRightDock = dockedRight.length > 0;

  return (
    <WorkspaceDragContext.Provider value={dragCtx}>
      <div ref={workspaceRef} className="relative flex flex-1 flex-col overflow-hidden min-h-0">
        <SnapGuides edge={snapPreview} />
        <div className="flex flex-1 overflow-hidden min-h-0">
          {dockedLeft.length > 0 && (
            <div data-print-hide data-mobile-hide className="hidden md:flex min-h-0 max-h-full shrink-0 flex-row overflow-hidden self-stretch">
              {dockedLeft.map((id) => (
                <WorkspacePanelFrame key={id} id={id} floating={false} layout={panelLayouts[id]}>
                  {renderPanel(id)}
                </WorkspacePanelFrame>
              ))}
            </div>
          )}

          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {dockedTop.length > 0 && (
              <div data-print-hide className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 flex flex-wrap gap-2 items-center">
                {dockedTop.map((id) => (
                  <WorkspacePanelFrame key={id} id={id} floating={false} layout={panelLayouts[id]}>
                    {renderPanel(id)}
                  </WorkspacePanelFrame>
                ))}
              </div>
            )}
            <div className="relative flex-1 min-h-0">
              {canvas}
              {viewportEditor}
              {floatingIds.map((id) => (
                <WorkspacePanelFrame key={id} id={id} floating layout={panelLayouts[id]}>
                  {renderPanel(id)}
                </WorkspacePanelFrame>
              ))}
            </div>
            {commandBar}
            {dockedBottom.length > 0 && (
              <div data-print-hide className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 flex flex-wrap gap-2 items-center">
                {dockedBottom.map((id) => (
                  <WorkspacePanelFrame key={id} id={id} floating={false} layout={panelLayouts[id]}>
                    {renderPanel(id)}
                  </WorkspacePanelFrame>
                ))}
              </div>
            )}
          </div>

          {showRightDock && (
            <div data-print-hide className="flex min-h-0 max-h-full shrink-0 flex-row overflow-hidden self-stretch">
              {dockedRight.map((id) => (
                <WorkspacePanelFrame key={id} id={id} floating={false} layout={panelLayouts[id]}>
                  {renderPanel(id)}
                </WorkspacePanelFrame>
              ))}
            </div>
          )}
        </div>
        {draggingId && (
          <div className="pointer-events-none absolute inset-0 z-[54] ring-1 ring-[var(--ti-accent)]/20" aria-hidden />
        )}
      </div>
    </WorkspaceDragContext.Provider>
  );
}
