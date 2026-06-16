/**
 * Project / drawing sheet / viewport picker — opens from the top-bar project chip.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSchematicStore } from "../store";
import {
  isDrawingCanvasActive,
  isPersistedDrawingViewport,
  mergeDrawingViewportOptions,
  resolveActiveDrawingPage,
} from "../drawingPageUtils";
import {
  dispatchApplyDrawingViewport,
  dispatchOpenViewportEditor,
  dispatchRedefineDrawingViewport,
  dispatchSaveDrawingViewport,
} from "../drawingViewportEvents";
import type { DrawingPage } from "../types";
import { TiIcon } from "./ti/TiBase";
import { confirmDialog, promptDialog } from "../appDialogStore";
import { openNewDrawingSetup } from "../drawingSetupStore";

interface DrawingProjectDropdownProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  projectLabel: string;
  fileName: string;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "8px 12px 4px",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ti-muted)",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  checked,
  onClick,
  title,
}: {
  label: string;
  checked?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="ti-row-hover"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        border: 0,
        background: "transparent",
        fontSize: 13,
        color: "var(--ti-ink)",
        fontFamily: "var(--ti-font-sans)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ width: 16, textAlign: "center", fontSize: 11, color: "var(--ti-accent)" }}>
        {checked ? "✓" : ""}
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function IconBtn({ title, icon, onClick }: { title: string; icon: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        display: "grid",
        placeItems: "center",
        border: 0,
        borderRadius: 6,
        background: "transparent",
        color: "var(--ti-muted)",
        cursor: "pointer",
      }}
      className="ti-row-hover"
    >
      <TiIcon name={icon} size={13} />
    </button>
  );
}

export default function DrawingProjectDropdown({
  anchorRef,
  open,
  onClose,
  projectLabel,
  fileName,
}: DrawingProjectDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const activePage = useSchematicStore((s) => s.activePage);
  const setActivePage = useSchematicStore((s) => s.setActivePage);
  const renameDrawingPage = useSchematicStore((s) => s.renameDrawingPage);
  const duplicateDrawingPage = useSchematicStore((s) => s.duplicateDrawingPage);
  const updateDrawingViewport = useSchematicStore((s) => s.updateDrawingViewport);
  const removeDrawingViewport = useSchematicStore((s) => s.removeDrawingViewport);
  const addToast = useSchematicStore((s) => s.addToast);

  const drawingPages = pages.filter((p): p is DrawingPage => p.type === "drawing");
  const activeDrawing = resolveActiveDrawingPage(activePage, pages);
  const onDrawingCanvas = isDrawingCanvasActive(activePage, pages);

  const viewportOptions = useMemo(
    () =>
      activeDrawing
        ? mergeDrawingViewportOptions(activeDrawing.viewports ?? [], nodes)
        : [],
    [activeDrawing, nodes],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("click", close, true);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  const renameViewport = async (pageId: string, id: string, currentLabel: string) => {
    if (!isPersistedDrawingViewport({ id })) return;
    const label = await promptDialog({
      title: "Rename viewport",
      label: "Name",
      defaultValue: currentLabel,
      confirmLabel: "Rename",
    });
    if (!label || label === currentLabel) return;
    updateDrawingViewport(pageId, id, { label });
    addToast(`Renamed viewport to “${label}”`, "success");
  };

  const deleteViewport = async (pageId: string, id: string, label: string) => {
    if (id === "overview") return;
    const ok = await confirmDialog({
      title: "Delete viewport",
      message: `Delete viewport “${label}”?`,
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    removeDrawingViewport(pageId, id);
    addToast(`Deleted viewport “${label}”`, "info");
  };

  if (!open) return null;

  const panel = (
    <div
      ref={panelRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 250,
        minWidth: 280,
        maxWidth: 360,
        maxHeight: "min(70vh, 520px)",
        overflow: "auto",
        background: "var(--ti-surface)",
        border: "1px solid var(--ti-border)",
        borderRadius: 10,
        boxShadow: "var(--ti-shadow-lg)",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid var(--ti-divider)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ti-ink)" }}>{projectLabel}</div>
        <div style={{ fontSize: 11, color: "var(--ti-muted)", marginTop: 2 }} title="Schematic file name">
          {fileName}
        </div>
      </div>

      <SectionHead>Drawing sheets</SectionHead>
      {drawingPages.length === 0 ? (
        <div style={{ padding: "4px 12px 8px", fontSize: 12, color: "var(--ti-muted)" }}>
          No named sheets — use the tab bar or add one below.
        </div>
      ) : (
        drawingPages.map((dp) => (
          <Row
            key={dp.id}
            label={dp.label}
            checked={activePage === dp.id}
            title={`Open “${dp.label}”`}
            onClick={() => {
              setActivePage(dp.id);
              onClose();
            }}
          />
        ))
      )}
      <Row
        label="New drawing sheet…"
        onClick={() => {
          const n = drawingPages.length;
          openNewDrawingSetup({
            mode: "new-sheet",
            defaultSheetName: n === 0 ? "Drawing" : `Drawing ${n + 1}`,
          });
          onClose();
        }}
      />
      {activeDrawing && (
        <>
          <Row
            label="Rename this sheet…"
            onClick={() => {
              void (async () => {
                const label = await promptDialog({
                  title: "Rename drawing sheet",
                  label: "Sheet name",
                  defaultValue: activeDrawing.label,
                  confirmLabel: "Rename",
                });
                if (label) renameDrawingPage(activeDrawing.id, label);
                onClose();
              })();
            }}
          />
          <Row
            label="Duplicate this sheet…"
            onClick={() => {
              duplicateDrawingPage(activeDrawing.id);
              onClose();
            }}
          />
        </>
      )}

      {onDrawingCanvas && activeDrawing && (
        <>
          <div style={{ height: 1, background: "var(--ti-divider)", margin: "6px 0" }} />
          <SectionHead>Viewports on this sheet</SectionHead>
          <div style={{ fontSize: 11, color: "var(--ti-muted)", padding: "0 12px 6px", lineHeight: 1.4 }}>
            Saved pan/zoom views. Rooms are generated from the layout; custom views can be renamed, redefined, or deleted.
          </div>
          <Row
            label="Edit viewports on map…"
            onClick={() => {
              dispatchOpenViewportEditor();
              onClose();
            }}
          />
          {viewportOptions.map((vp) => {
            const persisted = isPersistedDrawingViewport(vp);
            const pageId = activeDrawing.id;
            return (
              <div
                key={vp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingRight: 4,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Row
                    label={vp.label}
                    title={persisted ? vp.label : `Go to ${vp.label}`}
                    onClick={() => {
                      dispatchApplyDrawingViewport(pageId, vp.id);
                      onClose();
                    }}
                  />
                </div>
                {persisted && (
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    <IconBtn
                      title="Redefine — update to current pan/zoom"
                      icon="refresh"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatchRedefineDrawingViewport(pageId, vp.id);
                      }}
                    />
                    <IconBtn
                      title="Rename"
                      icon="edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameViewport(pageId, vp.id, vp.label);
                      }}
                    />
                    <IconBtn
                      title="Delete"
                      icon="trash"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteViewport(pageId, vp.id, vp.label);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Row
            label="Save current view as viewport…"
            onClick={() => {
              dispatchSaveDrawingViewport();
              onClose();
            }}
          />
        </>
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
