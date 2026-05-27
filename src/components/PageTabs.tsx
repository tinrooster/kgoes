import { useCallback, useEffect, useRef, useState } from "react";
import { KGO_ES_DRAWING_TAB_LABEL } from "../branding";
import { useSchematicStore } from "../store";
import type { RackElevationPage } from "../types";

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
  const removeRackPage = useSchematicStore((s) => s.removeRackPage);
  const renameRackPage = useSchematicStore((s) => s.renameRackPage);
  const addPrintSheetPage = useSchematicStore((s) => s.addPrintSheetPage);
  const removePrintSheetPage = useSchematicStore((s) => s.removePrintSheetPage);
  const renamePrintSheetPage = useSchematicStore((s) => s.renamePrintSheetPage);
  const duplicateRackPage = useSchematicStore((s) => s.duplicateRackPage);
  const duplicatePrintSheetPage = useSchematicStore((s) => s.duplicatePrintSheetPage);

  const rackPageCount = pages.filter((p) => p.type === "rack-elevation").length;
  const printSheetCount = pages.filter((p) => p.type === "print-sheet").length;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current?.contains(target)) return;
      setAddMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAddMenuOpen(false); };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", close);
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
    else renameRackPage(editingId, editValue.trim());
    setEditingId(null);
  }, [editingId, editValue, pages, renameRackPage, renamePrintSheetPage]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ pageId, x: e.clientX, y: e.clientY });
  }, []);

  const menuPage = contextMenu ? pages.find((p) => p.id === contextMenu.pageId) : null;
  const isPrintSheet = menuPage?.type === "print-sheet";

  const handleRename = () => {
    if (!menuPage) return;
    startRename(menuPage.id, menuPage.label);
  };

  const handleDuplicate = () => {
    if (!menuPage) return;
    setContextMenu(null);
    if (menuPage.type === "print-sheet") duplicatePrintSheetPage(menuPage.id);
    else duplicateRackPage(menuPage.id);
  };

  const handleDelete = () => {
    if (!menuPage) return;
    setContextMenu(null);
    if (menuPage.type === "print-sheet") {
      if (confirm(`Delete print sheet "${menuPage.label}"?`)) removePrintSheetPage(menuPage.id);
    } else {
      if (confirm(`Delete rack page "${menuPage.label}"? This will remove all racks and placements on this page.`)) {
        removeRackPage(menuPage.id);
      }
    }
  };

  const tabClass = (isActive: boolean, isPrint = false) =>
    `px-3 py-1 rounded-t border border-b-0 whitespace-nowrap transition-colors cursor-pointer ${
      isActive
        ? isPrint
          ? "bg-white border-violet-400 font-semibold text-violet-900"
          : "bg-white border-neutral-300 font-semibold text-neutral-900"
        : isPrint
          ? "bg-violet-50 border-transparent text-violet-600 hover:bg-violet-100"
          : "bg-neutral-200 border-transparent text-neutral-600 hover:bg-neutral-50"
    }`;

  const pageTabTitle = (page: (typeof pages)[number]) => {
    if (page.type === "print-sheet") {
      const vpCount = page.viewports.length;
      return `${page.label}${vpCount ? ` · ${vpCount} view${vpCount === 1 ? "" : "s"}` : ""}`;
    }
    const elev = page as RackElevationPage;
    const rackN = elev.racks.length;
    const devN = elev.placements.length;
    return `${page.label} · ${rackN} rack${rackN === 1 ? "" : "s"}${devN ? `, ${devN} placed` : ""}`;
  };

  const openRackPage = () => {
    addRackPage(`Rack Page ${rackPageCount + 1}`);
    setAddMenuOpen(false);
  };

  const openPrintSheetPage = () => {
    addPrintSheetPage();
    setAddMenuOpen(false);
  };

  return (
    <>
      <div
        data-print-hide
        className="relative z-30 flex items-center bg-neutral-100 border-b border-neutral-300 text-xs select-none overflow-visible"
        style={{ minHeight: 28 }}
      >
        {/* Drawing tab */}
        <div className="flex items-center shrink-0 pl-2 pr-1">
          <button
            type="button"
            className={tabClass(activePage === "schematic")}
            onClick={() => setActivePage("schematic")}
          >
            {KGO_ES_DRAWING_TAB_LABEL}
          </button>
        </div>

        {/* Rack / print page tabs */}
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto px-1 py-0">
          {pages.map((page) => {
            const isPrint = page.type === "print-sheet";
            const isRack = page.type === "rack-elevation";
            return (
              <button
                key={page.id}
                type="button"
                className={tabClass(activePage === page.id, isPrint)}
                onClick={() => setActivePage(page.id)}
                onDoubleClick={() => startRename(page.id, page.label)}
                onContextMenu={(e) => handleContextMenu(e, page.id)}
                title={pageTabTitle(page) + " — double-click to rename, right-click for options"}
              >
                {editingId === page.id ? (
                  <input
                    ref={inputRef}
                    className="bg-white border border-blue-400 rounded px-1 py-0 text-xs w-24 outline-none"
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
                    {isPrint ? "📄 " : isRack ? "🗄 " : ""}
                    {page.label}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {printSheetCount > 0 && (
          <span className="text-[10px] text-neutral-400 pl-1 pr-1 shrink-0 hidden sm:inline self-center">
            {printSheetCount} sheet{printSheetCount === 1 ? "" : "s"}
          </span>
        )}

        {/* Add page — right end of tab bar */}
        <div
          className="relative shrink-0 flex items-center self-stretch border-l border-neutral-300 bg-neutral-50/80 px-1.5"
          ref={addMenuRef}
        >
          <button
            type="button"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
              addMenuOpen
                ? "bg-white border-blue-400 text-blue-800 shadow-sm"
                : "bg-white border-neutral-300 text-neutral-700 hover:border-blue-400 hover:text-blue-800 hover:bg-blue-50/50"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setAddMenuOpen((o) => !o);
            }}
            title="Add rack elevation or print sheet page"
            aria-expanded={addMenuOpen}
            aria-haspopup="menu"
          >
            <span className="text-sm leading-none">+</span>
            <span className="hidden sm:inline">Add page</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
          {addMenuOpen && (
            <div
              className="absolute right-0 top-full mt-0.5 z-[100] bg-white border border-neutral-300 rounded-md shadow-lg py-1 min-w-[188px]"
              role="menu"
            >
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-neutral-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                role="menuitem"
                onClick={openRackPage}
              >
                🗄 Rack elevation…
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-violet-700 hover:bg-violet-50 cursor-pointer"
                role="menuitem"
                onClick={openPrintSheetPage}
              >
                📄 Print sheet…
              </button>
            </div>
          )}
        </div>
      </div>

      {contextMenu && menuPage && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[140px] text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-100 mb-1 truncate">
            {isPrintSheet ? "📄 " : menuPage.type === "rack-elevation" ? "🗄 " : ""}
            {menuPage.label}
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
            onClick={handleRename}
          >
            Rename
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
            onClick={handleDuplicate}
          >
            Duplicate
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
