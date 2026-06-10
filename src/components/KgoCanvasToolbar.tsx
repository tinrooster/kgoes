/**
 * KgoCanvasToolbar — Floating canvas overlay toolbar (design v2).
 *
 * Top-left: Numbering · Auto-route · Hide unconnected · Lock canvas · Viewport
 * Bottom-left: Zoom cluster (−, %, +, fit)
 */

import { memo, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import { useWorkspacePanelDragHandle, useWorkspacePanelFloating } from "../workspacePanelContext";
import WorkspacePanelDragHandle from "./WorkspacePanelDragHandle";
import { TiIcon } from "./ti/TiBase";
import { activeReservedBlocks } from "../trackitNumberingUtils";
import { isPersistedDrawingViewport } from "../drawingPageUtils";
import { dispatchOpenViewportEditor } from "../drawingViewportEvents";
import { useDrawingViewportActions } from "../hooks/useDrawingViewportActions";
import { useCanvasToolbarOverflow } from "../hooks/useCanvasToolbarOverflow";
import AlignmentMenu from "./AlignmentMenu";

const QUICK_TOOLBAR_COMPACT_KEY = "kgo-es-quick-toolbar-compact";

type CompactMode = "auto" | "compact" | "labeled";

function loadCompactMode(): CompactMode {
  try {
    const saved = window.localStorage.getItem(QUICK_TOOLBAR_COMPACT_KEY);
    if (saved === "1") return "compact";
    if (saved === "0") return "labeled";
    if (saved === "auto") return "auto";
  } catch {
    // localStorage is optional here; ignore read errors.
  }
  return "auto";
}

function saveCompactMode(mode: CompactMode): void {
  try {
    window.localStorage.setItem(
      QUICK_TOOLBAR_COMPACT_KEY,
      mode === "compact" ? "1" : mode === "labeled" ? "0" : "auto",
    );
  } catch {
    // localStorage is optional here; ignore write errors.
  }
}

function Chip({
  label, icon, active, badge, compact, disabled = false, onClick, title,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  badge?: number;
  compact?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      style={{
        display: "inline-flex", alignItems: "center", gap: compact ? 0 : 6,
        justifyContent: "center",
        height: 30,
        width: compact ? 30 : undefined,
        padding: compact ? 0 : "0 11px",
        borderRadius: 9, whiteSpace: "nowrap",
        border: `1px solid ${active ? "var(--ti-accent)" : "var(--ti-border)"}`,
        background: active
          ? "var(--ti-accent-soft)"
          : "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "var(--ti-shadow-sm)",
        fontSize: 12, fontWeight: 500,
        color: active ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
        fontFamily: "var(--ti-font-sans)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        transition: "background 100ms, border-color 100ms, color 100ms",
      }}
    >
      {icon && <TiIcon name={icon} size={14} color={active ? "var(--ti-accent)" : "var(--ti-muted)"} />}
      {!compact && label}
      {badge != null && badge > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 999,
          background: "var(--ti-warning)",
          color: "oklch(99% 0 0)",
          fontSize: 10.5, fontWeight: 700,
          fontFamily: "var(--ti-font-mono)",
        }}>{badge}</span>
      )}
    </button>
  );
}

function ZoomBtn({
  onClick, title, disabled, children,
}: {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28, height: 28,
        display: "grid", placeItems: "center",
        border: 0, background: "transparent",
        borderRadius: 6,
        color: "var(--ti-ink-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 80ms",
        fontFamily: "var(--ti-font-sans)",
      }}
      className="hover:bg-[var(--color-surface-hover)]"
    >
      {children}
    </button>
  );
}

function KgoCanvasToolbar() {
  const [compactMode, setCompactMode] = useState<CompactMode>(loadCompactMode);
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const toolbarMeasureRef = useRef<HTMLDivElement>(null);

  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const toolbarEdge = useSidebarStore((s) => s.panelLayouts.canvasToolbar.edge);
  const embedded = toolbarEdge === "top" || toolbarEdge === "bottom";
  const floating = useWorkspacePanelFloating();
  const workspaceDrag = useWorkspacePanelDragHandle();
  const autoCompact = useCanvasToolbarOverflow(toolbarRowRef, toolbarMeasureRef, embedded || floating);
  const compactQuickActions =
    compactMode === "compact" ? true : compactMode === "labeled" ? false : autoCompact;
  const autoCompactActive = compactMode === "auto" && autoCompact;

  const toggleCompactQuickActions = () => {
    setCompactMode((prev) => {
      const next: CompactMode =
        prev === "auto" ? (autoCompact ? "labeled" : "compact") : prev === "compact" ? "labeled" : "compact";
      saveCompactMode(next);
      return next;
    });
  };

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const {
    viewportOptions,
    viewportId,
    applyViewportPreset,
    saveViewport,
    renameViewport,
    redefineViewport,
    deleteViewport,
    drawingPage,
  } = useDrawingViewportActions();

  const hideUnconnectedPorts = useSchematicStore((s) => s.hideUnconnectedPorts);
  const setHideUnconnectedPorts = useSchematicStore((s) => s.setHideUnconnectedPorts);
  const canvasInteractive = useSchematicStore((s) => s.canvasInteractive);
  const toggleCanvasInteractive = useSchematicStore((s) => s.toggleCanvasInteractive);
  const autoRoute = useSchematicStore((s) => s.autoRoute);
  const isRouting = useSchematicStore((s) => s.isRouting);
  const toggleAutoRoute = useSchematicStore((s) => s.toggleAutoRoute);

  const unnumberedCount = useSchematicStore((s) => {
    const blocks = activeReservedBlocks(s.trackItNumbering?.blocks ?? []);
    if (blocks.length === 0) return 0;
    return s.edges.filter((e) => {
      const cid = e.data?.cableId as string | undefined;
      return !cid && e.data?.signalType != null && !e.data?.directAttach;
    }).length;
  });

  const onOpenNumbering = () => {
    expandRightPanel("trackIt");
  };

  const zoomPct = Math.round(zoom * 100);
  const pageId = drawingPage?.id;

  const onViewportChange = (value: string) => {
    const preset = viewportOptions.find((v) => v.id === value);
    if (preset) applyViewportPreset(preset);
  };

  const selectStyle: React.CSSProperties = {
    height: 30,
    padding: "0 10px",
    borderRadius: 9,
    border: "1px solid var(--ti-border)",
    background: "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    boxShadow: "var(--ti-shadow-sm)",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ti-ink-2)",
    fontFamily: "var(--ti-font-sans)",
    cursor: "pointer",
    maxWidth: 160,
  };

  const zoomCluster = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 34,
        padding: 3,
        background: "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid var(--ti-border)",
        borderRadius: 9,
        boxShadow: "var(--ti-shadow-sm)",
      }}
    >
      <ZoomBtn title="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
        <TiIcon name="minus" size={14} color="var(--ti-ink-2)" />
      </ZoomBtn>
      <span style={{
        fontSize: 11.5, fontWeight: 600,
        width: 42, textAlign: "center",
        color: "var(--ti-ink-2)",
        fontFamily: "var(--ti-font-mono)",
        userSelect: "none",
      }}>
        {zoomPct}%
      </span>
      <ZoomBtn title="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
        <TiIcon name="plus" size={14} color="var(--ti-ink-2)" />
      </ZoomBtn>
      <div style={{ width: 1, height: 18, background: "var(--ti-divider)", margin: "0 2px" }} />
      <ZoomBtn title="Fit to view" onClick={() => fitView({ duration: 250, padding: 0.1 })}>
        <TiIcon name="maximize" size={14} color="var(--ti-ink-2)" />
      </ZoomBtn>
    </div>
  );

  const dragHandle = workspaceDrag ? (
    <WorkspacePanelDragHandle panelId="canvasToolbar" onStartDrag={workspaceDrag.startDrag} />
  ) : null;

  const renderQuickActions = (compact: boolean) => (
    <>
        <button
          type="button"
          title="Cable numbering — assign numbers from reserved ranges"
          onClick={onOpenNumbering}
          style={{
            display: "inline-flex", alignItems: "center", gap: compact ? 0 : 7,
            justifyContent: "center",
            height: 30,
            width: compact ? 30 : undefined,
            padding: compact ? 0 : "0 11px",
            borderRadius: 8,
            border: `1px solid ${unnumberedCount > 0 ? "color-mix(in oklab, var(--ti-warning) 45%, transparent)" : "var(--ti-border)"}`,
            background: unnumberedCount > 0 ? "var(--ti-warning-soft)" : "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            boxShadow: "var(--ti-shadow-sm)",
            fontSize: 12.5, fontWeight: 600,
            color: "var(--ti-ink)",
            fontFamily: "var(--ti-font-sans)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--ti-accent-ink)", fontFamily: "var(--ti-font-mono)" }}>#</span>
          {!compact && "Numbering"}
          {unnumberedCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 18, height: 18, padding: "0 5px",
              borderRadius: 999,
              background: "var(--ti-warning)",
              color: "oklch(99% 0 0)",
              fontSize: 10.5, fontWeight: 700,
              fontFamily: "var(--ti-font-mono)",
              marginLeft: compact ? 0 : undefined,
            }}>{unnumberedCount}</span>
          )}
        </button>

        <Chip
          icon="signal"
          label="Auto-route"
          compact={compact}
          active={autoRoute}
          onClick={toggleAutoRoute}
          title={
            isRouting
              ? "Routing connections…"
              : autoRoute
                ? "Auto-route on — click to disable"
                : "Auto-route off — click to enable"
          }
        />
        <Chip
          icon="eye"
          label="Hide unconnected"
          compact={compact}
          active={hideUnconnectedPorts}
          onClick={() => setHideUnconnectedPorts(!hideUnconnectedPorts)}
        />
        <Chip
          icon="lock"
          label="Lock canvas"
          compact={compact}
          active={!canvasInteractive}
          onClick={toggleCanvasInteractive}
          title={canvasInteractive ? "Canvas is interactive — click to unlock" : "Canvas is locked — click to unlock"}
        />
        <AlignmentMenu variant="toolbar" />
        <button
          type="button"
          title={
            autoCompactActive
              ? "Icons auto-compact — click to pin labeled buttons"
              : compact
                ? "Show labeled quick actions"
                : "Show compact icon quick actions"
          }
          aria-label={compact ? "Disable compact quick actions" : "Enable compact quick actions"}
          onClick={toggleCompactQuickActions}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 30,
            minWidth: 30,
            padding: compact ? "0 9px" : "0 10px",
            borderRadius: 9,
            border: `1px solid ${compact ? "var(--ti-accent)" : "var(--ti-border)"}`,
            background: compact
              ? "var(--ti-accent-soft)"
              : "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            boxShadow: "var(--ti-shadow-sm)",
            fontSize: 11,
            fontWeight: 600,
            color: compact ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
            fontFamily: "var(--ti-font-sans)",
            cursor: "pointer",
            transition: "background 100ms, border-color 100ms, color 100ms",
          }}
        >
          {compact ? "I" : "Icons"}
        </button>

        <select
          value={viewportId}
          onChange={(e) => onViewportChange(e.target.value)}
          title="Jump to a saved viewport (overview, room, or custom)"
          style={{ ...selectStyle, maxWidth: compact ? 120 : 160 }}
        >
          {viewportOptions.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
        <button
          type="button"
          title="Viewport map — move and resize saved views on the sheet"
          onClick={() => dispatchOpenViewportEditor()}
          style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
        >
          <TiIcon name="layers" size={14} color="var(--ti-muted)" />
        </button>
        <button
          type="button"
          title="Save viewport — named pan/zoom on this drawing (not a new drawing)"
          onClick={saveViewport}
          style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
        >
          <TiIcon name="plus" size={14} color="var(--ti-muted)" />
        </button>
        {pageId && viewportOptions.some((v) => isPersistedDrawingViewport(v) && v.id === viewportId) && (
          <>
            <button
              type="button"
              title="Redefine viewport — update to current pan/zoom"
              onClick={() => redefineViewport(pageId, viewportId)}
              style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
            >
              <TiIcon name="refresh" size={14} color="var(--ti-muted)" />
            </button>
            <button
              type="button"
              title="Rename viewport"
              onClick={() => {
                const vp = viewportOptions.find((v) => v.id === viewportId);
                if (vp) renameViewport(pageId, viewportId, vp.label);
              }}
              style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
            >
              <TiIcon name="edit" size={14} color="var(--ti-muted)" />
            </button>
            <button
              type="button"
              title="Delete viewport"
              onClick={() => {
                const vp = viewportOptions.find((v) => v.id === viewportId);
                if (vp) deleteViewport(pageId, viewportId, vp.label);
              }}
              style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
            >
              <TiIcon name="trash" size={14} color="var(--ti-muted)" />
            </button>
          </>
        )}
    </>
  );

  const toolbarMeasureRow = (
    <div
      ref={toolbarMeasureRef}
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 flex items-center gap-2 whitespace-nowrap"
    >
      {renderQuickActions(false)}
      {embedded ? zoomCluster : null}
    </div>
  );

  if (embedded) {
    return (
      <div data-print-hide data-workspace-panel="canvasToolbar" className="relative min-w-0 w-full">
        {toolbarMeasureRow}
        <div
          ref={toolbarRowRef}
          className="flex min-w-0 w-full flex-nowrap items-center gap-2 overflow-hidden"
        >
          {dragHandle}
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {renderQuickActions(compactQuickActions)}
          </div>
          <div className="ml-auto shrink-0">{zoomCluster}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-print-hide
      data-workspace-panel="canvasToolbar"
      className="relative"
      style={{
        position: floating ? "relative" : "absolute",
        left: floating ? undefined : 14,
        top: floating ? undefined : 14,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: floating ? 520 : undefined,
      }}
    >
      {toolbarMeasureRow}
      {(floating || workspaceDrag) && (
        <div className="flex items-center gap-1 px-1 py-0.5 border-b border-[var(--ti-border)] bg-[var(--color-surface)] rounded-t-lg">
          {dragHandle}
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            Canvas toolbar
          </span>
        </div>
      )}
      <div
        ref={toolbarRowRef}
        style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap", overflow: "hidden", padding: floating ? "0 8px" : 0 }}
      >
        {renderQuickActions(compactQuickActions)}
      </div>
      <div style={{ padding: floating ? "0 8px 8px" : undefined, alignSelf: floating ? "flex-start" : undefined, position: floating ? "relative" : "absolute", left: floating ? undefined : 14, bottom: floating ? undefined : 14 }}>
        {zoomCluster}
      </div>
    </div>
  );
}

export default memo(KgoCanvasToolbar);
