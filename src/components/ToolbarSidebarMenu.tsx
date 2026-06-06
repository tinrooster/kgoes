/**
 * Toolbar → Sidebar menu: toggle panels, reorder right dock, workspace dock/reset hints.
 */

import { useState, type DragEvent } from "react";
import {
  useSidebarStore,
  type RightDockPanelId,
  type RightPanelId,
  RIGHT_DOCK_PANEL_LABELS,
} from "../sidebarStore";

const RIGHT_DOCK_EXPAND: Record<RightDockPanelId, RightPanelId> = {
  viewOptions: "viewOptions",
  trackItNumbers: "trackIt",
  showInfo: "showInfo",
  colors: "colors",
  cadTools: "cadTools",
};

const VISIBILITY_KEY: Record<RightDockPanelId, keyof ReturnType<typeof useSidebarStore.getState>["panelsVisible"]> = {
  viewOptions: "viewOptions",
  trackItNumbers: "trackItNumbers",
  showInfo: "showInfo",
  colors: "colors",
  cadTools: "cadTools",
};

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

export default function ToolbarSidebarMenu() {
  const panelsVisible = useSidebarStore((s) => s.panelsVisible);
  const setPanelVisible = useSidebarStore((s) => s.setPanelVisible);
  const setPanelLayout = useSidebarStore((s) => s.setPanelLayout);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const order = useSidebarStore((s) => s.rightPanelOrder);
  const moveRightPanel = useSidebarStore((s) => s.moveRightPanel);
  const resetPanelLayouts = useSidebarStore((s) => s.resetPanelLayouts);
  const [dragId, setDragId] = useState<RightDockPanelId | null>(null);

  const onDragStart = (e: DragEvent, id: RightDockPanelId) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDrop = (e: DragEvent, targetId: RightDockPanelId) => {
    e.preventDefault();
    const sourceId = (e.dataTransfer.getData("text/plain") || dragId) as RightDockPanelId;
    if (!sourceId || sourceId === targetId) return;
    moveRightPanel(sourceId, targetId);
    setDragId(null);
  };

  return (
    <div className="absolute top-full left-0 mt-0.5 min-w-[240px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-1 z-50">
      <button
        type="button"
        onClick={() => setPanelVisible("devices", !panelsVisible.devices)}
        className="flex items-center w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-left gap-2"
      >
        <span className="w-4 text-center shrink-0 text-[10px]">{panelsVisible.devices ? "✓" : ""}</span>
        <span className="flex-1 text-[var(--color-text)]">Devices (left)</span>
      </button>
      <div className="h-px bg-[var(--color-border)] my-1" />
      <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] select-none pointer-events-none">
        Right dock
      </div>
      <div className="px-2 pb-1 text-[10px] text-[var(--color-text-muted)] leading-snug">
        Toggle · menu grip reorders dock · panel grip repositions on workspace
      </div>
      {order.map((id) => {
        const visKey = VISIBILITY_KEY[id];
        const checked = panelsVisible[visKey];
        const label = RIGHT_DOCK_PANEL_LABELS[id];
        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
            onDragEnd={() => setDragId(null)}
            className={`flex items-center gap-1 rounded ${dragId === id ? "opacity-50" : ""}`}
          >
            <span
              className="shrink-0 p-1.5 text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripIcon />
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !checked;
                setPanelVisible(visKey, next);
                if (next) {
                  setPanelLayout(id, { edge: "right" });
                  expandRightPanel(RIGHT_DOCK_EXPAND[id]);
                }
              }}
              className="flex items-center flex-1 min-w-0 px-1 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-left gap-2"
            >
              <span className="w-4 text-center shrink-0 text-[10px]">{checked ? "✓" : ""}</span>
              <span className="flex-1 text-[var(--color-text)]">{label}</span>
            </button>
          </div>
        );
      })}
      <div className="h-px bg-[var(--color-border)] my-1" />
      <button
        type="button"
        onClick={() => resetPanelLayouts()}
        className="flex items-center w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-left text-[var(--color-text-muted)]"
      >
        Reset workspace panel positions
      </button>
    </div>
  );
}
