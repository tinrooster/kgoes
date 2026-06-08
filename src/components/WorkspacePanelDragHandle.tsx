import type { PointerEvent as ReactPointerEvent } from "react";
import type { WorkspacePanelId } from "../workspacePanelLayout";

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

type WorkspacePanelDragHandleProps = {
  panelId: WorkspacePanelId;
  onStartDrag: (panelId: WorkspacePanelId, e: ReactPointerEvent<HTMLElement>, handleEl: HTMLElement) => void;
  title?: string;
};

export default function WorkspacePanelDragHandle({
  panelId,
  onStartDrag,
  title = "Drag to reposition on workspace",
}: WorkspacePanelDragHandleProps) {
  return (
    <button
      type="button"
      className="shrink-0 p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] cursor-grab active:cursor-grabbing transition-colors"
      title={title}
      aria-label={title}
      onPointerDown={(e) => onStartDrag(panelId, e, e.currentTarget)}
    >
      <GripIcon />
    </button>
  );
}
