import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isDrawingCanvasActive, LEGACY_SCHEMATIC_PAGE_ID, resolveActiveDrawingPage } from "../drawingPageUtils";
import type { DrawingPage } from "../types";
import { printPageTabLabel } from "../printPageLabels";
import { useSchematicStore } from "../store";
import { SIGNAL_LABELS, SIGNAL_COLORS, type SignalType } from "../types";
import type { RackElevationPage, TowerDraftPage } from "../types";
import { TiIcon } from "./ti/TiBase";
import { confirmDialog } from "../appDialogStore";

interface ContextMenuState {
  pageId: string;
  x: number;
  y: number;
}

export default function PageTabs() {
  const pages = useSchematicStore((s) => s.pages);
  const activePage = useSchematicStore((s) => s.activePage);
  const setActivePage = useSchematicStore((s) => s.setActivePage);
  const addRackPage = useSchematicStore((s) => s.addRackPage);
  const addTowerDraftPage = useSchematicStore((s) => s.addTowerDraftPage);
  const removeRackPage = useSchematicStore((s) => s.removeRackPage);
  const removeTowerDraftPage = useSchematicStore((s) => s.removeTowerDraftPage);
  const renameRackPage = useSchematicStore((s) => s.renameRackPage);
  const addPrintSheetPage = useSchematicStore((s) => s.addPrintSheetPage);
  const removePrintSheetPage = useSchematicStore((s) => s.removePrintSheetPage);
  const renamePrintSheetPage = useSchematicStore((s) => s.renamePrintSheetPage);
  const duplicateRackPage = useSchematicStore((s) => s.duplicateRackPage);
  const duplicateTowerDraftPage = useSchematicStore((s) => s.duplicateTowerDraftPage);
  const duplicatePrintSheetPage = useSchematicStore((s) => s.duplicatePrintSheetPage);
  const addDrawingPage = useSchematicStore((s) => s.addDrawingPage);
  const addToast = useSchematicStore((s) => s.addToast);
  const removeDrawingPage = useSchematicStore((s) => s.removeDrawingPage);
  const renameDrawingPage = useSchematicStore((s) => s.renameDrawingPage);
  const duplicateDrawingPage = useSchematicStore((s) => s.duplicateDrawingPage);

  const rackPageCount = pages.filter((p) => p.type === "rack-elevation").length;
  const towerDraftCount = pages.filter((p) => p.type === "tower-draft").length;
  const drawingPages = pages.filter((p) => p.type === "drawing") as DrawingPage[];
  const drawingPageCount = drawingPages.length;
  const subPages = pages.filter((p) => p.type !== "drawing");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    if (!addMenuOpen) {
      setAddMenuPos(null);
      return;
    }
    const rect = addMenuBtnRef.current?.getBoundingClientRect();
    if (rect) setAddMenuPos({ top: rect.bottom + 2, left: rect.left });
  }, [addMenuOpen]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current?.contains(target) || addMenuBtnRef.current?.contains(target)) return;
      setAddMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAddMenuOpen(false); };
    const timer = window.setTimeout(() => {
      document.addEventListener("click", close, true);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [addMenuOpen]);

  const startRename = useCallback((pageId: string, currentLabel: string) => {
    setContextMenu(null);
    setEditingId(pageId);
    setEditValue(currentLabel);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(() => {
    if (!editingId || !editValue.trim()) { setEditingId(null); return; }
    const page = pages.find((p) => p.id === editingId);
    if (!page) { setEditingId(null); return; }
    if (page.type === "print-sheet") renamePrintSheetPage(editingId, editValue.trim());
    else if (page.type === "drawing") renameDrawingPage(editingId, editValue.trim());
    else if (page.type === "tower-draft") {
      useSchematicStore.getState().updateTowerDraftPage(editingId, { label: editValue.trim() });
    } else renameRackPage(editingId, editValue.trim());
    setEditingId(null);
  }, [editingId, editValue, pages, renameRackPage, renamePrintSheetPage, renameDrawingPage]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ pageId, x: e.clientX, y: e.clientY });
  }, []);

  const menuPage = contextMenu ? pages.find((p) => p.id === contextMenu.pageId) : null;

  const handleRename = () => {
    if (!menuPage) return;
    startRename(menuPage.id, menuPage.label);
  };

  const handleDuplicate = () => {
    if (!menuPage) return;
    setContextMenu(null);
    if (menuPage.type === "print-sheet") duplicatePrintSheetPage(menuPage.id);
    else if (menuPage.type === "drawing") duplicateDrawingPage(menuPage.id);
    else if (menuPage.type === "tower-draft") duplicateTowerDraftPage(menuPage.id);
    else duplicateRackPage(menuPage.id);
  };

  const handleDelete = () => {
    if (!menuPage) return;
    const page = menuPage;
    setContextMenu(null);
    void (async () => {
      if (page.type === "print-sheet") {
        if (
          await confirmDialog({
            title: "Delete print sheet",
            message: `Delete print sheet “${page.label}”?`,
            tone: "danger",
            confirmLabel: "Delete",
          })
        ) {
          removePrintSheetPage(page.id);
        }
      } else if (page.type === "drawing") {
        if (drawingPageCount <= 1) return;
        if (
          await confirmDialog({
            title: "Delete drawing",
            message: `Delete drawing “${page.label}”?`,
            tone: "danger",
            confirmLabel: "Delete",
          })
        ) {
          removeDrawingPage(page.id);
        }
      } else if (page.type === "tower-draft") {
        if (
          await confirmDialog({
            title: "Delete tower draft",
            message: `Delete tower draft “${page.label}”?`,
            tone: "danger",
            confirmLabel: "Delete",
          })
        ) {
          removeTowerDraftPage(page.id);
        }
      } else if (
        await confirmDialog({
          title: "Delete rack page",
          message: `Delete rack page “${page.label}”? This will remove all racks and placements on this page.`,
          tone: "danger",
          confirmLabel: "Delete",
        })
      ) {
        removeRackPage(page.id);
      }
    })();
  };

  const pageTabTitle = (page: (typeof pages)[number]) => {
    if (page.type === "drawing") {
      const dp = page as DrawingPage;
      const vpCount = (dp.viewports ?? []).length;
      return `${page.label}${vpCount ? ` · ${vpCount} viewport${vpCount === 1 ? "" : "s"}` : ""}`;
    }
    if (page.type === "print-sheet") {
      const vpCount = (page.viewports ?? []).length;
      return `${printPageTabLabel(page.label)}${vpCount ? ` · ${vpCount} view${vpCount === 1 ? "" : "s"}` : ""}`;
    }
    if (page.type === "tower-draft") {
      const td = page as TowerDraftPage;
      return `${page.label} · ${td.towerHeightFtAgl}′ · ${td.placements.length} placed`;
    }
    const elev = page as RackElevationPage;
    const rackN = elev.racks.length;
    const devN = elev.placements.length;
    return `${page.label} · ${rackN} rack${rackN === 1 ? "" : "s"}${devN ? `, ${devN} placed` : ""}`;
  };

  const openRackPage = () => {
    const label =
      rackPageCount === 0 ? "Rack Elevations" : `Rack Elevations ${rackPageCount + 1}`;
    addRackPage(label);
    setAddMenuOpen(false);
  };

  const openTowerDraftPage = () => {
    const label =
      towerDraftCount === 0 ? "Tower Elevation" : `Tower Elevation ${towerDraftCount + 1}`;
    addTowerDraftPage(label);
    setAddMenuOpen(false);
  };

  const openPrintSheetPage = () => {
    addPrintSheetPage();
    setAddMenuOpen(false);
  };

  const openDrawingPage = () => {
    const label = drawingPageCount === 0 ? "Drawing" : `Drawing ${drawingPageCount + 1}`;
    addDrawingPage(label);
    setAddMenuOpen(false);
  };

  const openDrawingViewport = () => {
    setAddMenuOpen(false);
    if (!resolveActiveDrawingPage(activePage, pages)) {
      addToast("Open a drawing tab to save a viewport", "info");
      return;
    }
    window.dispatchEvent(new CustomEvent("kgo-es:save-drawing-viewport"));
  };

  const usedSignalsStr = useSchematicStore((s) => {
    const types = new Set<SignalType>();
    s.edges.forEach((e) => {
      if (e.data?.signalType) types.add(e.data.signalType as SignalType);
    });
    return Array.from(types).sort().slice(0, 8).join(",");
  });
  const usedSignals = useMemo(
    () => (usedSignalsStr ? usedSignalsStr.split(",") as SignalType[] : []),
    [usedSignalsStr],
  );
  const signalColors = useSchematicStore((s) => s.signalColors);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    height: 40, padding: "0 12px",
    border: 0,
    borderBottom: `2px solid ${active ? "var(--ti-accent)" : "transparent"}`,
    background: "transparent",
    fontSize: 13, fontWeight: active ? 600 : 500,
    color: active ? "var(--ti-ink)" : "var(--ti-muted)",
    display: "flex", alignItems: "center", gap: 7,
    cursor: "pointer", whiteSpace: "nowrap",
    fontFamily: "var(--ti-font-sans)",
    transition: "color 100ms, border-color 100ms",
    flexShrink: 0,
  });

  const pageTypeIcon = (type: string): string => {
    if (type === "drawing") return "signal";
    if (type === "rack-elevation") return "rack";
    if (type === "tower-draft") return "pin";
    if (type === "print-sheet") return "print";
    return "signal";
  };

  const renderTab = (page: (typeof pages)[number]) => {
    const isActive = activePage === page.id;
    const isTower = page.type === "tower-draft";
    return (
      <button
        key={page.id}
        type="button"
        style={tabBtn(isActive)}
        onClick={() => setActivePage(page.id)}
        onDoubleClick={() => startRename(page.id, page.label)}
        onContextMenu={(e) => handleContextMenu(e, page.id)}
        title={pageTabTitle(page) + " — double-click to rename, right-click for options"}
      >
        <TiIcon name={pageTypeIcon(page.type)} size={14} color={isActive ? "var(--ti-accent)" : "var(--ti-muted)"} />
        {editingId === page.id ? (
          <input
            ref={inputRef}
            style={{
              background: "var(--ti-bg)", border: "1px solid var(--ti-accent)",
              borderRadius: 4, padding: "0 4px", fontSize: 12,
              color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)",
              width: 96, outline: "none",
            }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            {page.label}
            {isTower && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: "0.04em",
                color: "var(--ti-accent-ink)", background: "var(--ti-accent-soft)",
                padding: "1px 5px", borderRadius: 4,
              }}>SITE</span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <>
      <div
        data-print-hide
        style={{
          height: 40, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 4,
          padding: "0 12px",
          borderBottom: "1px solid var(--ti-border)",
          background: "var(--ti-bg)",
          position: "relative", zIndex: 30,
          overflowX: "auto", overflowY: "visible",
          userSelect: "none",
        }}
      >
        {drawingPages.length > 0
          ? drawingPages.map((page) => renderTab(page))
          : (
            <button
              type="button"
              style={tabBtn(activePage === LEGACY_SCHEMATIC_PAGE_ID)}
              onClick={() => setActivePage(LEGACY_SCHEMATIC_PAGE_ID)}
            >
              <TiIcon name="signal" size={14} color={activePage === LEGACY_SCHEMATIC_PAGE_ID ? "var(--ti-accent)" : "var(--ti-muted)"} />
              Drawing
            </button>
          )}

        {subPages.map((page) => renderTab(page))}

        {/* Add page button */}
        <div className="relative shrink-0">
          <button
            ref={addMenuBtnRef}
            type="button"
            style={{
              height: 30, padding: "0 10px", marginLeft: 4,
              border: 0, background: "transparent", borderRadius: 7,
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 12.5, fontWeight: 500,
              color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)",
              cursor: "pointer",
            }}
            onClick={(e) => { e.stopPropagation(); setAddMenuOpen((o) => !o); }}
            title="New viewport (same drawing), new drawing (blank sheet), rack, tower, or print"
            aria-expanded={addMenuOpen}
            aria-haspopup="menu"
          >
            <TiIcon name="plus" size={12} color="var(--ti-muted)" />
            Add page
          </button>
          {addMenuOpen &&
            addMenuPos &&
            createPortal(
              <div
                ref={addMenuRef}
                role="menu"
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  position: "fixed",
                  top: addMenuPos.top,
                  left: addMenuPos.left,
                  zIndex: 200,
                  minWidth: 196,
                  background: "var(--ti-surface)",
                  border: "1px solid var(--ti-border)",
                  borderRadius: 10,
                  boxShadow: "var(--ti-shadow-lg)",
                  padding: 4,
                }}
              >
                {[
                  ...(isDrawingCanvasActive(activePage, pages)
                    ? [{ label: "New viewport…", icon: "maximize", onClick: openDrawingViewport }]
                    : []),
                  { label: "New drawing…", icon: "signal", onClick: openDrawingPage },
                  { label: "Rack elevation…", icon: "rack", onClick: openRackPage },
                  { label: "Tower Elevation…", icon: "pin", onClick: openTowerDraftPage },
                  { label: "Print sheet…", icon: "print", onClick: openPrintSheetPage },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 7,
                      border: 0,
                      background: "transparent",
                      fontSize: 13,
                      color: "var(--ti-ink)",
                      fontFamily: "var(--ti-font-sans)",
                      cursor: "pointer",
                    }}
                    className="ti-row-hover"
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => item.onClick()}
                  >
                    <TiIcon name={item.icon} size={14} color="var(--ti-muted)" />
                    {item.label}
                  </button>
                ))}
              </div>,
              document.body,
            )}
        </div>

        {/* Signal legend — right side, shows signal types present on the drawing */}
        {usedSignals.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 11, alignItems: "center", flexShrink: 0, paddingLeft: 12 }}>
            {usedSignals.map((sig) => {
              const color = signalColors?.[sig] ?? SIGNAL_COLORS[sig] ?? "var(--ti-muted)";
              const label = SIGNAL_LABELS[sig] ?? sig;
              return (
                <span key={sig} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--ti-muted)", fontWeight: 500, fontFamily: "var(--ti-font-sans)" }}>
                  <span style={{ width: 9, height: 3, borderRadius: 999, background: color }} />
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && menuPage && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", zIndex: 50,
            left: contextMenu.x, top: contextMenu.y,
            minWidth: 148,
            background: "var(--ti-surface)",
            border: "1px solid var(--ti-border)",
            borderRadius: 10,
            boxShadow: "var(--ti-shadow-lg)",
            padding: 4,
            fontFamily: "var(--ti-font-sans)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: "6px 10px 8px",
            fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--ti-muted)",
            borderBottom: "1px solid var(--ti-divider)", marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {menuPage.label}
          </div>
          {[
            { label: "Rename", onClick: handleRename },
            { label: "Duplicate", onClick: handleDuplicate },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="ti-row-hover"
              style={{
                width: "100%", textAlign: "left",
                padding: "7px 10px", borderRadius: 7, border: 0,
                background: "transparent", fontSize: 13,
                color: "var(--ti-ink)", cursor: "pointer",
              }}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--ti-divider)", margin: "4px 6px" }} />
          <button
            type="button"
            className="ti-row-hover"
            style={{
              width: "100%", textAlign: "left",
              padding: "7px 10px", borderRadius: 7, border: 0,
              background: "transparent", fontSize: 13,
              color: "var(--ti-danger)", cursor: "pointer",
            }}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
