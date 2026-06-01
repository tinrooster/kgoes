/**
 * KgoCanvasToolbar — Floating canvas overlay toolbar (design v2).
 *
 * Top-left: Numbering · Auto-route · Hide unconnected · Lock canvas · Viewport
 * Bottom-left: Zoom cluster (−, %, +, fit)
 */

import { memo } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import { TiIcon } from "./ti/TiBase";
import { activeReservedBlocks } from "../trackitNumberingUtils";
import { isPersistedDrawingViewport } from "../drawingPageUtils";
import { dispatchOpenViewportEditor } from "../drawingViewportEvents";
import { useDrawingViewportActions } from "../hooks/useDrawingViewportActions";

function Chip({
  label, icon, active, badge, onClick, title,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 30, padding: "0 11px",
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
        cursor: "pointer",
        transition: "background 100ms, border-color 100ms, color 100ms",
      }}
    >
      {icon && <TiIcon name={icon} size={14} color={active ? "var(--ti-accent)" : "var(--ti-muted)"} />}
      {label}
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
  const toggleAutoRoute = useSchematicStore((s) => s.toggleAutoRoute);

  const unnumberedCount = useSchematicStore((s) => {
    const blocks = activeReservedBlocks(s.trackItNumbering?.blocks ?? []);
    if (blocks.length === 0) return 0;
    return s.edges.filter((e) => {
      const cid = e.data?.cableId as string | undefined;
      return !cid && e.data?.signalType != null && !e.data?.directAttach;
    }).length;
  });

  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
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

  return (
    <>
      <div
        data-print-hide
        style={{
          position: "absolute", left: 14, top: 14,
          display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          title="Cable numbering — assign numbers from reserved ranges"
          onClick={onOpenNumbering}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            height: 30, padding: "0 11px",
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
          Numbering
          {unnumberedCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 18, height: 18, padding: "0 5px",
              borderRadius: 999,
              background: "var(--ti-warning)",
              color: "oklch(99% 0 0)",
              fontSize: 10.5, fontWeight: 700,
              fontFamily: "var(--ti-font-mono)",
            }}>{unnumberedCount}</span>
          )}
        </button>

        <Chip
          icon="signal"
          label="Auto-route"
          active={autoRoute}
          onClick={toggleAutoRoute}
          title={autoRoute ? "Auto-route on — click to disable" : "Auto-route off — click to enable"}
        />
        <Chip
          icon="eye"
          label="Hide unconnected"
          active={hideUnconnectedPorts}
          onClick={() => setHideUnconnectedPorts(!hideUnconnectedPorts)}
        />
        <Chip
          icon="lock"
          label="Lock canvas"
          active={!canvasInteractive}
          onClick={toggleCanvasInteractive}
          title={canvasInteractive ? "Canvas is interactive — click to unlock" : "Canvas is locked — click to unlock"}
        />

        <select
          value={viewportId}
          onChange={(e) => onViewportChange(e.target.value)}
          title="Jump to a saved viewport (overview, room, or custom)"
          style={selectStyle}
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
      </div>

      <div
        data-print-hide
        style={{
          position: "absolute", left: 14, bottom: 14,
          display: "flex", alignItems: "center", gap: 2,
          height: 34, padding: 3,
          background: "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "1px solid var(--ti-border)",
          borderRadius: 9,
          boxShadow: "var(--ti-shadow-sm)",
          zIndex: 10,
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
    </>
  );
}

export default memo(KgoCanvasToolbar);
