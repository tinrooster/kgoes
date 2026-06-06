import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useSidebarStore } from "../sidebarStore";
import {
  clampFloatPosition,
  resolveSnapEdge,
  type PanelDockEdge,
  type WorkspacePanelId,
} from "../workspacePanelLayout";

type DragState = {
  panelId: WorkspacePanelId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  panelWidth: number;
  panelHeight: number;
};

export function useWorkspacePanelDrag(workspaceRef: React.RefObject<HTMLElement | null>) {
  const setPanelLayout = useSidebarStore((s) => s.setPanelLayout);
  const setSnapPreview = useSidebarStore((s) => s.setSnapPreview);
  const dragRef = useRef<DragState | null>(null);
  const [draggingId, setDraggingId] = useState<WorkspacePanelId | null>(null);

  const finishDrag = useCallback(
    (panelId: WorkspacePanelId, clientX: number, clientY: number) => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      const edge = resolveSnapEdge(clientX, clientY, rect, panelId);
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setSnapPreview(null);

      if (edge === "float") {
        const rawX = clientX - rect.left - (drag?.offsetX ?? 0);
        const rawY = clientY - rect.top - (drag?.offsetY ?? 0);
        const { x, y } = clampFloatPosition(
          rawX,
          rawY,
          rect,
          drag?.panelWidth ?? 240,
          drag?.panelHeight ?? 320,
        );
        setPanelLayout(panelId, { edge: "float", floatX: x, floatY: y });
        return;
      }

      setPanelLayout(panelId, {
        edge,
        floatX: DEFAULT_FLOAT_FOR_EDGE(edge, rect, drag),
        floatY: DEFAULT_FLOAT_FOR_EDGE_Y(edge, rect, drag),
      });
    },
    [setPanelLayout, setSnapPreview, workspaceRef],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const workspace = workspaceRef.current;
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      const edge = resolveSnapEdge(e.clientX, e.clientY, rect, drag.panelId);
      setSnapPreview(edge === "float" ? null : edge);

      if (edge === "float") {
        const { x, y } = clampFloatPosition(
          e.clientX - rect.left - drag.offsetX,
          e.clientY - rect.top - drag.offsetY,
          rect,
          drag.panelWidth,
          drag.panelHeight,
        );
        setPanelLayout(drag.panelId, { edge: "float", floatX: x, floatY: y });
      }
    },
    [setPanelLayout, setSnapPreview, workspaceRef],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag(drag.panelId, e.clientX, e.clientY);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    },
    [finishDrag, onPointerMove],
  );

  const startDrag = useCallback(
    (panelId: WorkspacePanelId, e: ReactPointerEvent<HTMLElement>, handleEl: HTMLElement) => {
      if (e.button !== 0) return;
      const workspace = workspaceRef.current;
      const panelEl = handleEl.closest("[data-workspace-panel]") as HTMLElement | null;
      if (!workspace || !panelEl) return;
      e.preventDefault();
      e.stopPropagation();
      const panelRect = panelEl.getBoundingClientRect();
      const workspaceRect = workspace.getBoundingClientRect();
      const layout = useSidebarStore.getState().panelLayouts[panelId];
      if (layout.edge !== "float") {
        setPanelLayout(panelId, {
          edge: "float",
          floatX: panelRect.left - workspaceRect.left,
          floatY: panelRect.top - workspaceRect.top,
        });
      }
      dragRef.current = {
        panelId,
        pointerId: e.pointerId,
        offsetX: e.clientX - panelRect.left,
        offsetY: e.clientY - panelRect.top,
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
      };
      setDraggingId(panelId);
      handleEl.setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [onPointerMove, onPointerUp, setPanelLayout, workspaceRef],
  );

  return { startDrag, draggingId };
}

function DEFAULT_FLOAT_FOR_EDGE(
  edge: PanelDockEdge,
  rect: DOMRect,
  drag: DragState | null,
): number {
  if (edge === "right") return Math.max(16, rect.width - (drag?.panelWidth ?? 240) - 16);
  if (edge === "bottom") return Math.max(16, rect.height - (drag?.panelHeight ?? 120) - 16);
  return 14;
}

function DEFAULT_FLOAT_FOR_EDGE_Y(
  edge: PanelDockEdge,
  rect: DOMRect,
  drag: DragState | null,
): number {
  if (edge === "bottom") return Math.max(16, rect.height - (drag?.panelHeight ?? 120) - 16);
  return 14;
}
