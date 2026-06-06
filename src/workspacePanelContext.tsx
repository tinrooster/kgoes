import { createContext, useContext } from "react";
import type { WorkspacePanelId } from "./workspacePanelLayout";
import type { PointerEvent as ReactPointerEvent } from "react";

export const WorkspaceFloatContext = createContext(false);

export function useWorkspacePanelFloating(): boolean {
  return useContext(WorkspaceFloatContext);
}

type WorkspaceDragContextValue = {
  startDrag: (panelId: WorkspacePanelId, e: ReactPointerEvent<HTMLElement>, handleEl: HTMLElement) => void;
};

export const WorkspaceDragContext = createContext<WorkspaceDragContextValue | null>(null);

export function useWorkspacePanelDragHandle(): WorkspaceDragContextValue | null {
  return useContext(WorkspaceDragContext);
}
