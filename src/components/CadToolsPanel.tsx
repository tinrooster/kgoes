import { useMemo } from "react";
import { schematicFlowRef } from "../schematicFlowRef";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import { shouldShowCadTools } from "../cadDrawingUtils";
import {
  insertCadDiagonalLine,
  insertCadDimensionLine,
  insertCadFenceFrame,
  insertCadLeader,
  insertCadNorthArrow,
  insertCadScaleBar,
  insertTowerCadElevation,
  insertTowerCadFullSheet,
  insertTowerCadSection,
  insertTowerCadSitePlan,
} from "../towerSiteCadInsert";

type CadBtn = { label: string; title?: string; onClick: () => void };

export default function CadToolsPanel({ mobile, onClose }: { mobile?: boolean; onClose?: () => void } = {}) {
  const schematicName = useSchematicStore((s) => s.schematicName);
  const nodeCount = useSchematicStore((s) => s.nodes.length);
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const flowReady = useSchematicStore((s) => s.schematicCanvasReady);
  const setNoteCadLocked = useSchematicStore((s) => s.setNoteCadLocked);
  const rightExpanded = useSidebarStore((s) => s.rightCadToolsExpanded);
  const setRightExpanded = useSidebarStore((s) => s.setRightCadToolsExpanded);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);

  const visible = useMemo(
    () =>
      shouldShowCadTools({
        trackItLink,
        nodes: useSchematicStore.getState().nodes,
        schematicName,
      }),
    [trackItLink, nodeCount, schematicName],
  );

  if (!visible) return null;

  const collapsed = mobile ? false : !rightExpanded;

  const run = (fn: (rf: NonNullable<typeof schematicFlowRef.current>) => void) => {
    const rf = schematicFlowRef.current;
    if (!rf) {
      useSchematicStore.getState().addToast("Schematic canvas is still loading…", "info", 2500);
      return;
    }
    fn(rf);
    onClose?.();
  };

  const wireframe: CadBtn[] = [
    { label: "Tower elevation wireframe", onClick: () => run(insertTowerCadElevation) },
    { label: "Tower section wireframe", onClick: () => run(insertTowerCadSection) },
    { label: "Site plan wireframe", onClick: () => run(insertTowerCadSitePlan) },
    { label: "Full CAD sheet", onClick: () => run(insertTowerCadFullSheet) },
  ];

  const markup: CadBtn[] = [
    { label: "Dimension line", onClick: () => run(insertCadDimensionLine) },
    { label: "Dashed fence frame", onClick: () => run(insertCadFenceFrame) },
    { label: "North arrow", onClick: () => run(insertCadNorthArrow) },
    { label: "Scale bar (100′)", onClick: () => run(insertCadScaleBar) },
    { label: "Leader / callout", onClick: () => run(insertCadLeader) },
    { label: "Diagonal line", onClick: () => run(insertCadDiagonalLine) },
  ];

  const unlockSelectedWireframe = () => {
    const locked = useSchematicStore
      .getState()
      .nodes.filter((n) => n.selected && n.type === "note" && (n.data as { cadLocked?: boolean }).cadLocked);
    if (locked.length === 0) {
      useSchematicStore.getState().addToast("Select a locked CAD wireframe note to unlock", "info", 2800);
      return;
    }
    for (const n of locked) {
      setNoteCadLocked(n.id, false);
    }
    useSchematicStore.getState().addToast(`Unlocked ${locked.length} wireframe note(s)`, "success", 2500);
  };

  const lockSelectedWireframe = () => {
    const notes = useSchematicStore.getState().nodes.filter((n) => n.selected && n.type === "note");
    if (notes.length === 0) {
      useSchematicStore.getState().addToast("Select a note to lock as CAD layer", "info", 2800);
      return;
    }
    for (const n of notes) {
      setNoteCadLocked(n.id, true);
    }
    useSchematicStore.getState().addToast(`Locked ${notes.length} note(s)`, "success", 2500);
  };

  const section = (title: string, buttons: CadBtn[]) => (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] px-1">{title}</div>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          title={b.title}
          disabled={!flowReady}
          onClick={b.onClick}
          className="w-full text-left text-xs px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-heading)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {b.label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`flex flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-elevated)] shrink-0 ${
        mobile ? "w-full max-w-sm" : collapsed ? "w-10" : "w-52"
      }`}
      data-print-hide
    >
      <button
        type="button"
        className="flex items-center gap-2 px-2 py-2 border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
        onClick={() => {
          if (mobile) onClose?.();
          else setRightExpanded(!rightExpanded);
        }}
      >
        <span className="text-base leading-none" aria-hidden>
          📐
        </span>
        {!collapsed && <span>CAD tools</span>}
      </button>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0">
          {!flowReady ? (
            <p className="text-[10px] text-[var(--color-text-muted)] px-1">Waiting for schematic canvas…</p>
          ) : null}
          {section("Wireframes", wireframe)}
          {section("Markup", markup)}
          <div className="space-y-1 pt-1 border-t border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] px-1">
              Wireframe notes
            </div>
            <button
              type="button"
              onClick={unlockSelectedWireframe}
              className="w-full text-left text-xs px-2 py-1.5 rounded border border-amber-300/60 bg-amber-50/80 hover:bg-amber-100 text-amber-950 cursor-pointer"
            >
              Unlock selected
            </button>
            <button
              type="button"
              onClick={lockSelectedWireframe}
              className="w-full text-left text-xs px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
            >
              Lock selected as CAD
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-snug px-1">
            Locked wireframes are view-only. Export DXF includes markup primitives.
          </p>
        </div>
      )}
      {collapsed && (
        <button
          type="button"
          className="p-2 text-xs hover:bg-[var(--color-surface-hover)] cursor-pointer"
          title="Expand CAD tools"
          onClick={() => expandRightPanel("cadTools")}
        >
          ›
        </button>
      )}
    </div>
  );
}
