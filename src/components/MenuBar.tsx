import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useSyncDrawerStore } from "../sidebarStore";
import { useReactFlow } from "@xyflow/react";
import {
  KGO_ES_DEFAULT_PROJECT_LABEL,
  KGO_ES_DRAWING_TAB_LABEL,
  KGO_ES_ISSUES_URL,
  KGO_ES_NAME,
  KGO_ES_REPO_URL,
  KGO_ES_SUPPORT_EMAIL,
  KGO_ES_UPSTREAM_DEVICES_URL,
  KGO_ES_UPSTREAM_DOCS_URL,
} from "../branding";
import { printPageTabLabel } from "../printPageLabels";
import { useSchematicStore } from "../store";
import { exportImage } from "../exportUtils";
import { exportDxf } from "../dxfExport";
import { exportPdf } from "../pdfExport";
import { exportTemplatesToFile, readTemplateFile } from "../templateExport";
import { getPaperSize } from "../printConfig";
import type { SchematicFile, SchematicNode, AnnotationData } from "../types";
import ReportsDialog, { type ReportsTab } from "./ReportsDialog";
import TitleBlockDialog from "./TitleBlockDialog";
import AboutDialog from "./AboutDialog";
import PreferencesDialog from "./PreferencesDialog";
import RoomDistancesDialog from "./RoomDistancesDialog";
import UndoHistoryControls from "./UndoHistoryControls";
import ViewOptionsPanel from "./ViewOptionsPanel";
import ShowInfoPanel from "./ShowInfoPanel";
import CsvImportWizard from "./CsvImportWizard";
import SignalColorPanel from "./SignalColorPanel";
import { useTheme } from "../hooks/useTheme";
import { isTrackItDrawingLinked, saveToTrackItParent } from "../trackitIntegration";
import { isCloudPortalEnabled } from "../deployMode";
import { computeTrackItSyncStatus } from "../trackitSyncStatus";
import { insertTowerElevation, insertTowerSitePlan } from "../towerSiteInsert";
import {
  insertCadDiagonalLine,
  insertCadDimensionLine,
  insertCadFenceFrame,
  insertCadLeader,
  insertCadNorthArrow,
  insertCadScaleBar,
} from "../towerSiteCadInsert";
import TrackItModeBadge from "./TrackItModeBadge";
import AlignmentMenu from "./AlignmentMenu";
import DrawingProjectDropdown from "./DrawingProjectDropdown";
import ToolbarSidebarMenu from "./ToolbarSidebarMenu";
import { isDrawingCanvasActive, resolveActiveDrawingPage } from "../drawingPageUtils";
import { inferGridColumns, rackLayoutReverseOrder } from "../rackLayout";
import { useAppBuildInfo } from "../buildVersion";
import DeviceLibraryAdminPanel from "./DeviceLibraryAdminPanel";
import { useUiChromeStore } from "../uiChromeStore";
import { TiIcon } from "./ti/TiBase";

// ─── Menu data types ─────────────────────────────────────────────

interface MenuItemDef {
  type: "item";
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

interface MenuSeparatorDef {
  type: "separator";
}

interface MenuCaptionDef {
  type: "caption";
  label: string;
  /** Version footer — normal case, not section heading style */
  footer?: boolean;
}

type MenuEntry = MenuItemDef | MenuSeparatorDef | MenuCaptionDef;

// ─── Sub-components ──────────────────────────────────────────────

function MenuSeparator() {
  return <div className="h-px bg-[var(--color-border)] my-1" />;
}

function MenuCaption({ label, footer }: { label: string; footer?: boolean }) {
  return (
    <div
      className={
        footer
          ? "px-3 py-0.5 text-[10px] text-[var(--color-text-muted)] select-none pointer-events-none"
          : "px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] select-none pointer-events-none"
      }
      role="presentation"
    >
      {label}
    </div>
  );
}

function MenuItem({
  label,
  shortcut,
  checked,
  disabled,
  title,
  onClick,
}: {
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="flex items-center w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-left gap-2"
    >
      <span className="w-4 text-center shrink-0 text-[10px]">
        {checked != null ? (checked ? "✓" : "") : ""}
      </span>
      <span className="flex-1 text-[var(--color-text)]">{label}</span>
      {shortcut && (
        <span className="text-[var(--color-text-muted)] text-[10px] ml-4 whitespace-nowrap">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function MenuDropdown({ items, onClose }: { items: MenuEntry[]; onClose: () => void }) {
  return (
    <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-1 z-50">
      {items.map((entry, i) => {
        if (entry.type === "separator") return <MenuSeparator key={i} />;
        if (entry.type === "caption") {
          return <MenuCaption key={i} label={entry.label} footer={entry.footer} />;
        }
        return (
          <MenuItem
            key={i}
            label={entry.label}
            shortcut={entry.shortcut}
            checked={entry.checked}
            disabled={entry.disabled}
            title={entry.title}
            onClick={() => {
              entry.onClick();
              onClose();
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main MenuBar ────────────────────────────────────────────────

export default function MenuBar() {
  const {
    schematicName,
    setSchematicName,
    exportToJSON,
    importFromJSON,
    importDrawingIntoActivePage,
    newSchematic,
    undo,
    redo,
    pages,
    activePage,
    setActivePage,
    addRackPage,
    addTowerDraftPage,
    addPrintSheetPage,
    layoutRacksOnPage,
  } = useSchematicStore();

  const printView = useSchematicStore((s) => s.printView);
  const showOwnedGearPane = useSchematicStore((s) => s.showOwnedGearPane);
  const toggleSyncDrawer = useSyncDrawerStore((s) => s.toggle);
  const syncDrawerOpen = useSyncDrawerStore((s) => s.open);
  const edges = useSchematicStore((s) => s.edges);
  const trackItLastPushedAt = useSchematicStore((s) => s.trackItLastPushedAt);
  const trackItUnsavedChanges = useSchematicStore((s) => s.trackItUnsavedChanges);
  const isDrawingLinked = isTrackItDrawingLinked();
  const cloudPortal = isCloudPortalEnabled();
  const unnumberedCount = edges.filter((e) => !e.data?.directAttach && !e.data?.cableId && e.data?.signalType).length;
  const syncStatus = computeTrackItSyncStatus({
    isLinked: isDrawingLinked,
    lastPushedAt: trackItLastPushedAt,
    hasUnsavedChanges: trackItUnsavedChanges,
    unnumberedCount,
  });
  const syncPillWarning = syncStatus.pillWarning || syncDrawerOpen;

  const handleSyncPillClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.altKey) {
      toggleSyncDrawer();
      return;
    }
    if (syncStatus.needsSchematicSave) {
      saveToTrackItParent();
      return;
    }
    toggleSyncDrawer();
  };
  const undoSize = useSchematicStore((s) => s.undoSize);
  const redoSize = useSchematicStore((s) => s.redoSize);

  const reactFlowInstance = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importDrawingInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const projectChipRef = useRef<HTMLButtonElement>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const { isDark, toggle: toggleTheme } = useTheme();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(schematicName);
  const [reportsTab, setReportsTab] = useState<ReportsTab | null>(null);
  const [showTitleBlockDialog, setShowTitleBlockDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showRoomDistances, setShowRoomDistances] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const isOnline = useSchematicStore((s) => s.isOnline);
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const helpMenuActive = openMenu === "Help" || showAboutDialog;
  const { version: appVersion, commit: appCommit } = useAppBuildInfo(helpMenuActive);

  useEffect(() => {
    if (!editingName) setNameValue(schematicName);
  }, [schematicName, editingName]);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: globalThis.MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as globalThis.Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  // Close mobile menu/panel on Escape + lock body scroll
  useEffect(() => {
    if (!mobileMenuOpen && !activeMobilePanel) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setActiveMobilePanel(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [mobileMenuOpen, activeMobilePanel]);

  // ─── File actions ──────────────────────────────────────

  // Write schematic JSON to a FileSystemFileHandle (silent, no dialog)
  const writeToFileHandle = useCallback(async (handle: FileSystemFileHandle) => {
    const data = exportToJSON();
    const json = JSON.stringify(data, null, 2);
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
  }, [exportToJSON]);

  // Legacy download fallback (always triggers browser download)
  const downloadFile = useCallback(() => {
    const data = exportToJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportToJSON]);

  // Show the native file picker and return the chosen handle
  const pickFileHandle = useCallback(async (): Promise<FileSystemFileHandle | null> => {
    const store = useSchematicStore.getState();
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${store.schematicName.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`,
        types: [{ description: `${KGO_ES_NAME} files`, accept: { "application/json": [".json"] } }],
      });
      return handle;
    } catch {
      // User cancelled the picker
      return null;
    }
  }, []);

  const trackItLinked = isTrackItDrawingLinked();
  const projectChipLabel =
    trackItLink?.drawingName?.trim() ||
    trackItLink?.dwgNumber?.trim() ||
    KGO_ES_DEFAULT_PROJECT_LABEL;
  const activeDrawingPage = resolveActiveDrawingPage(activePage, pages);
  const projectChipDisplay =
    activeDrawingPage?.label ?? projectChipLabel;
  const onDrawingCanvas = isDrawingCanvasActive(activePage, pages);

  // Save: reuse existing handle/cloud, or prompt for first save
  const handleSave = useCallback(async () => {
    const store = useSchematicStore.getState();

    // trackIT popup: push JSON to parent drawing (primary save — no local file picker)
    if (isTrackItDrawingLinked()) {
      saveToTrackItParent();
      if (store.fileHandle) {
        try {
          await writeToFileHandle(store.fileHandle);
          store.addToast("Also saved to prior file picker location", "info", 2000);
        } catch {
          store.setFileHandle(null);
        }
      }
      return;
    }

    // Has a local file handle: silently overwrite
    if (store.fileHandle) {
      try {
        await writeToFileHandle(store.fileHandle);
        store.addToast("Saved", "success", 1500);
        return;
      } catch {
        // Handle went stale (file moved/deleted) — fall through to picker
        store.setFileHandle(null);
      }
    }

    // No handle — first save. Use File System Access API if available.
    if ("showSaveFilePicker" in window) {
      const handle = await pickFileHandle();
      if (!handle) return;
      store.setFileHandle(handle);
      // Update schematic name to match chosen filename
      const name = handle.name.replace(/\.json$/i, "");
      if (name) store.setSchematicName(name);
      try {
        await writeToFileHandle(handle);
        store.addToast("Saved", "success", 1500);
      } catch (e: unknown) {
        store.addToast(e instanceof Error ? e.message : "Save failed", "error");
      }
    } else {
      downloadFile();
    }
  }, [writeToFileHandle, downloadFile, pickFileHandle]);

  // Save As: always show picker, optionally switch from cloud to local
  const handleSaveAs = useCallback(async () => {
    if ("showSaveFilePicker" in window) {
      const handle = await pickFileHandle();
      if (!handle) return;
      const store = useSchematicStore.getState();
      // Detach from cloud — user explicitly chose local destination
      if (store.cloudSchematicId) {
        store.setCloudSchematicId(null);
        store.setCloudSavedAt(null);
      }
      store.setFileHandle(handle);
      const name = handle.name.replace(/\.json$/i, "");
      if (name) store.setSchematicName(name);
      try {
        await writeToFileHandle(handle);
        store.addToast("Saved", "success", 1500);
      } catch (e: unknown) {
        store.addToast(e instanceof Error ? e.message : "Save failed", "error");
      }
    } else {
      downloadFile();
    }
  }, [pickFileHandle, writeToFileHandle, downloadFile]);

  const handleOpen = useCallback(async () => {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: `${KGO_ES_NAME} files`, accept: { "application/json": [".json"] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        if (file.size > 10 * 1024 * 1024) {
          alert("File is too large (max 10 MB). Please use a smaller schematic file.");
          return;
        }
        const text = await file.text();
        const data = JSON.parse(text) as SchematicFile;
        importFromJSON(data);
        // Store the handle so future saves go back to this file
        useSchematicStore.getState().setFileHandle(handle);
        // Update name to match file
        const name = handle.name.replace(/\.json$/i, "");
        if (name) useSchematicStore.getState().setSchematicName(name);
      } catch {
        // User cancelled or read error — ignore
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [importFromJSON]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large (max 10 MB). Please use a smaller schematic file.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SchematicFile;
          importFromJSON(data);
        } catch {
          alert("Invalid schematic file.");
        }
      };
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    },
    [importFromJSON],
  );

  const handleImportIntoDrawing = useCallback(async () => {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: `${KGO_ES_NAME} files`, accept: { "application/json": [".json"] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        if (file.size > 10 * 1024 * 1024) {
          useSchematicStore.getState().addToast("File is too large (max 10 MB)", "error");
          return;
        }
        const data = JSON.parse(await file.text()) as SchematicFile;
        importDrawingIntoActivePage(data);
      } catch {
        // cancelled
      }
      return;
    }
    importDrawingInputRef.current?.click();
  }, [importDrawingIntoActivePage]);

  const handleImportIntoDrawingFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        useSchematicStore.getState().addToast("File is too large (max 10 MB)", "error");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SchematicFile;
          importDrawingIntoActivePage(data);
        } catch {
          useSchematicStore.getState().addToast("Invalid schematic file", "error");
        }
      };
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    },
    [importDrawingIntoActivePage],
  );

  const handleSaveArchive = useCallback(() => {
    const templates = useSchematicStore.getState().exportCustomTemplates();
    if (templates.length === 0) {
      alert("No custom device templates to export.");
      return;
    }
    exportTemplatesToFile(templates);
  }, []);

  const handleOpenArchive = useCallback(() => {
    archiveInputRef.current?.click();
  }, []);

  const handleImportArchive = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const templates = await readTemplateFile(file);
        useSchematicStore.getState().importCustomTemplates(templates);
        alert(`Imported ${templates.length} device template${templates.length === 1 ? "" : "s"}.`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Invalid device archive file.");
      }
      e.target.value = "";
    },
    [],
  );

  // Listen for keyboard shortcut events from App.tsx
  useEffect(() => {
    const onSave = () => { handleSave(); };
    const onSaveAs = () => { handleSaveAs(); };
    const onOpen = () => { handleOpen(); };
    window.addEventListener("easyschematic:save", onSave);
    window.addEventListener("easyschematic:save-as", onSaveAs);
    window.addEventListener("easyschematic:open", onOpen);
    return () => {
      window.removeEventListener("easyschematic:save", onSave);
      window.removeEventListener("easyschematic:save-as", onSaveAs);
      window.removeEventListener("easyschematic:open", onOpen);
    };
  }, [handleSave, handleSaveAs, handleOpen]);

  // ─── Export helpers ────────────────────────────────────

  const doExportPng = () => exportImage(reactFlowInstance, { format: "png", pixelRatio: 4 });
  const doExportSvg = () => exportImage(reactFlowInstance, { format: "svg" });
  const doExportDxf = () => exportDxf(reactFlowInstance);
  const doExportPdf = () => {
    const state = useSchematicStore.getState();
    const paper = getPaperSize(state.printPaperId, state.printCustomWidthIn, state.printCustomHeightIn);
    exportPdf(
      reactFlowInstance,
      paper,
      state.printOrientation,
      state.printScale,
      state.titleBlock,
      state.titleBlockLayout,
    );
  };

  const doExportRackPdf = async () => {
    const { exportRackPdf } = await import("../rackPdf");
    const state = useSchematicStore.getState();
    const rackPages = state.pages.filter((p) => p.type === "rack-elevation");
    if (rackPages.length === 0) {
      alert("No rack pages to export. Create a rack page first via the page tabs.");
      return;
    }
    await exportRackPdf({
      pages: state.pages,
      nodes: state.nodes,
      schematicName: state.schematicName,
      titleBlock: state.titleBlock,
      schematicDefaults: { useShortNames: state.useShortNames, wrapDeviceLabels: state.wrapDeviceLabels },
    });
  };

  const doExportPrintSheets = async () => {
    const { runPrintSheetExport } = await import("../printSheetExport");
    await runPrintSheetExport();
  };

  // ─── Name editing ──────────────────────────────────────

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) setSchematicName(trimmed);
    else setNameValue(schematicName);
    setEditingName(false);
  };

  // ─── Menu definitions ─────────────────────────────────

  const addAnnotation = useCallback((shape: AnnotationData["shape"]) => {
    const state = useSchematicStore.getState();
    state.pushSnapshot();
    const viewport = reactFlowInstance.getViewport();
    const x = (-viewport.x + window.innerWidth / 2) / viewport.zoom - 100;
    const y = (-viewport.y + window.innerHeight / 2) / viewport.zoom - 50;
    const cadDefaults: Partial<
      Record<AnnotationData["shape"], { w: number; h: number; data: AnnotationData }>
    > = {
      hline: { w: 160, h: 4, data: { shape: "hline", borderColor: "#334155" } },
      vline: { w: 4, h: 160, data: { shape: "vline", borderColor: "#334155" } },
      "frame-dashed": { w: 320, h: 220, data: { shape: "frame-dashed", borderColor: "#64748b" } },
      dimension: {
        w: 140,
        h: 22,
        data: { shape: "dimension", label: "150′", borderColor: "#475569", fontSize: 10 },
      },
      dline: { w: 140, h: 100, data: { shape: "dline", borderColor: "#334155" } },
      "north-arrow": { w: 48, h: 56, data: { shape: "north-arrow", borderColor: "#334155", fontSize: 10 } },
      "scale-bar": {
        w: 200,
        h: 28,
        data: { shape: "scale-bar", label: "100′", borderColor: "#475569", fontSize: 9 },
      },
      leader: {
        w: 140,
        h: 72,
        data: { shape: "leader", label: "Callout", borderColor: "#334155", fontSize: 10 },
      },
    };
    const cad = cadDefaults[shape];
    const isSquare = shape === "circle" || shape === "diamond";
    const newNode: SchematicNode = {
      id: `annotation-${Date.now()}`,
      type: "annotation",
      position: { x: isSquare ? x + 50 : x, y },
      data:
        cad?.data ??
        ({ shape, color: "rgba(59, 130, 246, 0.15)", borderColor: "#3b82f6" } as AnnotationData),
      style: { width: cad?.w ?? (isSquare ? 100 : 200), height: cad?.h ?? 100 },
    };
    useSchematicStore.setState({ nodes: [...state.nodes, newNode] });
    state.saveToLocalStorage();
  }, [reactFlowInstance]);

  const handleNew = useCallback(() => {
    newSchematic();
  }, [newSchematic]);

  const closeMenu = () => setOpenMenu(null);

  const rackPageCount = pages.filter((p) => p.type === "rack-elevation").length;
  const towerDraftCount = pages.filter((p) => p.type === "tower-draft").length;
  const activeRackPage = pages.find(
    (p): p is import("../types").RackElevationPage =>
      p.id === activePage && p.type === "rack-elevation",
  );

  const layoutMenuItems: MenuEntry[] = activeRackPage
    ? [
        {
          type: "item",
          label: "1 row",
          title: "Single horizontal row, aligned U tops",
          onClick: () => layoutRacksOnPage(activeRackPage.id, { mode: "row" }),
        },
        {
          type: "item",
          label: "2×6 grid",
          disabled: (activeRackPage.racks?.length ?? 0) < 2,
          title: "Two or more rows, 6 racks per row (e.g. Sutro 12-rack site)",
          onClick: () =>
            layoutRacksOnPage(activeRackPage.id, {
              mode: "grid",
              columns: 6,
              serpentineRows: rackLayoutReverseOrder(activeRackPage),
            }),
        },
        ...((activeRackPage.racks?.length ?? 0) > 6 && (activeRackPage.racks?.length ?? 0) % 6 !== 0
          ? [{
              type: "item" as const,
              label: `Grid (${Math.ceil((activeRackPage.racks?.length ?? 0) / Math.min(6, Math.ceil((activeRackPage.racks?.length ?? 0) / 2)))} rows)`,
              onClick: () =>
                layoutRacksOnPage(activeRackPage.id, {
                  mode: "grid",
                  columns: Math.min(6, Math.ceil((activeRackPage.racks?.length ?? 0) / 2)),
                  serpentineRows: rackLayoutReverseOrder(activeRackPage),
                }),
            }]
          : []),
        ...((activeRackPage.racks?.length ?? 0) >= 2
          ? [
              { type: "separator" as const },
              {
                type: "item" as const,
                label: "Re-apply current grid",
                title: "Re-layout racks using inferred column count and reverse-order setting",
                onClick: () => {
                  const racks = activeRackPage.racks ?? [];
                  const columns = inferGridColumns(racks);
                  layoutRacksOnPage(activeRackPage.id, {
                    mode: columns >= racks.length ? "row" : "grid",
                    columns,
                    serpentineRows: rackLayoutReverseOrder(activeRackPage),
                  });
                },
              },
            ]
          : []),
      ]
    : [
        {
          type: "item",
          label: "Open a rack elevation page",
          disabled: true,
          onClick: () => {},
        },
      ];

  const pagesMenuItems: MenuEntry[] = [
    {
      type: "item",
      label: `Go to ${KGO_ES_DRAWING_TAB_LABEL}`,
      checked: activePage === "schematic",
      onClick: () => setActivePage("schematic"),
    },
    ...(pages.length > 0
      ? [
          { type: "separator" as const },
          ...pages.map((p): MenuEntry => ({
            type: "item",
            label: p.type === "print-sheet" ? `📄 ${printPageTabLabel(p.label)}` : `🗄 ${p.label}`,
            checked: activePage === p.id,
            onClick: () => setActivePage(p.id),
          })),
        ]
      : []),
    { type: "separator" },
    {
      type: "item",
      label: "New rack elevation page…",
      onClick: () =>
        addRackPage(
          rackPageCount === 0 ? "Rack Elevations" : `Rack Elevations ${rackPageCount + 1}`,
        ),
    },
    {
      type: "item",
      label: "New Tower Elevation page…",
      onClick: () =>
        addTowerDraftPage(
          towerDraftCount === 0 ? "Tower Elevation" : `Tower Elevation ${towerDraftCount + 1}`,
        ),
    },
    {
      type: "item",
      label: "New print sheet page…",
      onClick: () => addPrintSheetPage(),
    },
  ];

  const menus: Record<string, MenuEntry[]> = {
    File: [
      { type: "item", label: "New", onClick: handleNew },
      { type: "separator" },
      {
        type: "item",
        label: trackItLinked ? "Save to trackIT" : "Save",
        shortcut: "Ctrl+S",
        onClick: handleSave,
      },
      ...(trackItLinked
        ? [{ type: "item" as const, label: "Save copy to disk...", onClick: handleSaveAs }]
        : []),
      { type: "item", label: "Save As...", shortcut: "Ctrl+Shift+S", onClick: handleSaveAs },
      { type: "item", label: "Open...", shortcut: "Ctrl+O", onClick: handleOpen },
      ...(onDrawingCanvas
        ? [
            {
              type: "item" as const,
              label: "Import into drawing…",
              title: "Merge another ES JSON file into this drawing sheet",
              onClick: handleImportIntoDrawing,
            },
          ]
        : []),
      { type: "separator" },
      { type: "item", label: "Save Device Archive", onClick: handleSaveArchive },
      { type: "item", label: "Import Device Archive...", onClick: handleOpenArchive },
      { type: "item", label: "Import Cable Schedule...", onClick: () => setShowCsvImport(true) },
      { type: "separator" },
      { type: "item", label: "Preferences...", onClick: () => setShowPreferences(true) },
    ],
    Edit: [
      { type: "item", label: "Undo", shortcut: "Ctrl+Z", disabled: undoSize === 0, onClick: undo },
      { type: "item", label: "Redo", shortcut: "Ctrl+Shift+Z", disabled: redoSize === 0, onClick: redo },
      { type: "separator" },
      { type: "item", label: "Copy", shortcut: "Ctrl+C", onClick: () => useSchematicStore.getState().copySelected() },
      { type: "item", label: "Paste", shortcut: "Ctrl+V", onClick: () => useSchematicStore.getState().pasteClipboard() },
      { type: "item", label: "Delete", shortcut: "Del", onClick: () => useSchematicStore.getState().removeSelected() },
      { type: "separator" },
      { type: "item", label: "Select All", shortcut: "Ctrl+A", onClick: () => useSchematicStore.getState().selectAll() },
    ],
    Devices: [
      ...(cloudPortal
        ? [
            {
              type: "item" as const,
              label: "Device library admin…",
              onClick: () => useUiChromeStore.getState().openDeviceAdmin({ tab: "manage" }),
            },
            {
              type: "item" as const,
              label: "Add devices (agent)…",
              onClick: () => useUiChromeStore.getState().openDeviceAdmin({ tab: "agent" }),
            },
            { type: "separator" as const },
          ]
        : []),
      {
        type: "item",
        label: "Save device archive",
        onClick: handleSaveArchive,
      },
      {
        type: "item",
        label: "Import device archive…",
        onClick: handleOpenArchive,
      },
    ],
    Insert: [
      { type: "caption", label: "Mountaintop / tower" },
      {
        type: "item",
        label: "Tower elevation layout…",
        title: "Stack lattice bays, platforms, lights, and access notes at the viewport center",
        onClick: () => insertTowerElevation(reactFlowInstance),
      },
      {
        type: "item",
        label: "Site plan layout…",
        title: "Shelter, gate, generator pad, transformer, cable tray, and tower base",
        onClick: () => insertTowerSitePlan(reactFlowInstance),
      },
      { type: "separator" },
      { type: "caption", label: "CAD markup" },
      {
        type: "item",
        label: "Dimension…",
        onClick: () => insertCadDimensionLine(reactFlowInstance),
      },
      {
        type: "item",
        label: "Callout…",
        onClick: () => insertCadLeader(reactFlowInstance),
      },
      {
        type: "item",
        label: "North arrow",
        onClick: () => insertCadNorthArrow(reactFlowInstance),
      },
      {
        type: "item",
        label: "Scale bar…",
        onClick: () => insertCadScaleBar(reactFlowInstance),
      },
      {
        type: "item",
        label: "Site fence (dashed)…",
        onClick: () => insertCadFenceFrame(reactFlowInstance),
      },
      { type: "item", label: "Line (horizontal)", onClick: () => addAnnotation("hline") },
      { type: "item", label: "Line (vertical)", onClick: () => addAnnotation("vline") },
      { type: "item", label: "Line (diagonal)", onClick: () => insertCadDiagonalLine(reactFlowInstance) },
      { type: "separator" },
      { type: "item", label: "Add Rectangle", onClick: () => addAnnotation("rectangle") },
      { type: "item", label: "Add Ellipse", onClick: () => addAnnotation("ellipse") },
      { type: "item", label: "Add Circle", onClick: () => addAnnotation("circle") },
      { type: "item", label: "Add Diamond", onClick: () => addAnnotation("diamond") },
      { type: "item", label: "Add Triangle", onClick: () => addAnnotation("triangle") },
    ],
    Pages: pagesMenuItems,
    Layout: layoutMenuItems,
    View: [
      {
        type: "item",
        label: "Print View",
        shortcut: "F9",
        checked: printView,
        onClick: () => useSchematicStore.getState().setPrintView(!printView),
      },
      {
        type: "item",
        label: "Show Owned Gear",
        checked: showOwnedGearPane,
        onClick: () => {
          const s = useSchematicStore.getState();
          s.setShowOwnedGearPane(!s.showOwnedGearPane);
        },
      },
      {
        type: "item",
        label: "Hide Unconnected Ports",
        checked: useSchematicStore.getState().hideUnconnectedPorts,
        onClick: () => {
          const s = useSchematicStore.getState();
          s.setHideUnconnectedPorts(!s.hideUnconnectedPorts);
        },
      },
      {
        type: "item",
        label: "Auto-Route Edges",
        checked: useSchematicStore.getState().autoRoute,
        onClick: () => useSchematicStore.getState().toggleAutoRoute(),
      },
      { type: "separator" },
      {
        type: "item",
        label: "Debug Edges",
        shortcut: "Ctrl+B",
        checked: useSchematicStore.getState().debugEdges,
        onClick: () => useSchematicStore.getState().toggleDebugEdges(),
      },
    ],
    Export: [
      { type: "item", label: "Export as PNG", onClick: doExportPng },
      { type: "item", label: "Export as SVG", onClick: doExportSvg },
      { type: "item", label: "Export as DXF", onClick: doExportDxf },
      { type: "item", label: "Export as PDF", onClick: doExportPdf },
      { type: "item", label: "Export Rack PDF", onClick: doExportRackPdf },
      { type: "item", label: "Export Print Sheets", onClick: doExportPrintSheets },
      { type: "separator" },
      { type: "item", label: "Title Block...", onClick: () => setShowTitleBlockDialog(true) },
    ],
    Reports: [
      { type: "item", label: "Device List...", onClick: () => setReportsTab("devices") },
      { type: "item", label: "Cable Schedule...", onClick: () => setReportsTab("cableSchedule") },
      { type: "item", label: "Patch Panels...", onClick: () => setReportsTab("patchPanel") },
      { type: "item", label: "Pack List...", onClick: () => setReportsTab("packList") },
      { type: "item", label: "Network Report...", onClick: () => setReportsTab("network") },
      { type: "item", label: "Power Report...", onClick: () => setReportsTab("power") },
      { type: "separator" },
      { type: "item", label: "Room Distances...", onClick: () => setShowRoomDistances(true) },
    ],
    Help: [
      {
        type: "item",
        label: `${KGO_ES_NAME} on GitHub \u2197`,
        onClick: () => window.open(KGO_ES_REPO_URL, "_blank", "noopener,noreferrer"),
      },
      {
        type: "item",
        label: "Report a bug \u2197",
        onClick: () => window.open(KGO_ES_ISSUES_URL, "_blank", "noopener,noreferrer"),
      },
      {
        type: "item",
        label: "Contact support",
        onClick: () => { window.location.href = `mailto:${KGO_ES_SUPPORT_EMAIL}`; },
      },
      { type: "separator" },
      {
        type: "item",
        label: "Upstream docs \u2197",
        onClick: () => window.open(KGO_ES_UPSTREAM_DOCS_URL, "_blank", "noopener,noreferrer"),
      },
      {
        type: "item",
        label: "Device database \u2197",
        onClick: () => window.open(KGO_ES_UPSTREAM_DEVICES_URL, "_blank", "noopener,noreferrer"),
      },
      { type: "separator" },
      {
        type: "item",
        label: `About ${KGO_ES_NAME}`,
        onClick: () => setShowAboutDialog(true),
      },
      { type: "separator" },
      { type: "caption", label: `Version ${appVersion}`, footer: true },
      {
        type: "caption",
        label: appCommit ? `Commit ${appCommit}` : "Commit —",
        footer: true,
      },
    ],
  };

  const menuNames = Object.keys(menus);
  const navMenuNames = [
    ...menuNames.slice(0, menuNames.indexOf("Export")),
    "Toolbar",
    ...menuNames.slice(menuNames.indexOf("Export")),
  ];

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setOpenSection(null);
  };

  const MobileAccordionSection = ({ name, items }: { name: string; items: MenuEntry[] }) => {
    const isOpen = openSection === name;
    return (
      <div className="border-b border-[var(--color-border)]">
        <button
          className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[var(--color-text-heading)] hover:bg-[var(--color-surface-hover)] transition-colors"
          onClick={() => setOpenSection(isOpen ? null : name)}
        >
          {name}
          <svg
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="pb-2 px-2">
            {items.map((entry, i) => {
              if (entry.type === "separator") return <div key={i} className="h-px bg-[var(--color-border)] my-1 mx-2" />;
              if (entry.type === "caption") {
          return <MenuCaption key={i} label={entry.label} footer={entry.footer} />;
        }
              return (
                <button
                  key={i}
                  disabled={entry.disabled}
                  onClick={() => {
                    entry.onClick();
                    closeMobileMenu();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left gap-3"
                >
                  <span className="w-5 text-center shrink-0 text-xs">
                    {entry.checked != null ? (entry.checked ? "\u2713" : "") : ""}
                  </span>
                  <span className="flex-1 text-[var(--color-text)]">{entry.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={menuBarRef}>
      {/* Desktop top bar — design v2 (52px, --ti-* tokens) */}
      <div
        className="hidden md:flex items-center shrink-0 select-none gap-2.5"
        style={{
          height: 52,
          padding: "0 14px",
          borderBottom: "1px solid var(--ti-border)",
          background: "var(--ti-surface)",
        }}
      >
        {/* Left: ES chip + wordmark + divider + project chip + menu nav */}
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {/* ES logo chip */}
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "var(--ti-ink)", color: "var(--ti-bg)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--ti-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "-0.03em",
            flexShrink: 0,
          }}>ES</div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
            {KGO_ES_NAME}
          </span>
          <div style={{ width: 1, height: 22, background: "var(--ti-divider)", margin: "0 2px" }} />
          <button
            ref={projectChipRef}
            type="button"
            title={`${projectChipDisplay} — drawings, sheets, and viewports`}
            aria-expanded={projectMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setProjectMenuOpen((o) => !o);
              setOpenMenu(null);
            }}
            style={{
              height: 28,
              maxWidth: 200,
              padding: "0 10px",
              border: `1px solid ${projectMenuOpen ? "var(--ti-accent)" : "var(--ti-border)"}`,
              borderRadius: 8,
              background: projectMenuOpen ? "var(--ti-accent-soft)" : "var(--ti-surface)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ti-ink-2)",
              fontFamily: "var(--ti-font-sans)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <TiIcon name="folder" size={13} color="var(--ti-muted)" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectChipDisplay}</span>
            <TiIcon name="chevD" size={12} color="var(--ti-faint)" />
          </button>
          <DrawingProjectDropdown
            anchorRef={projectChipRef}
            open={projectMenuOpen}
            onClose={() => setProjectMenuOpen(false)}
            projectLabel={projectChipLabel}
            fileName={schematicName}
          />
          {/* Menu nav */}
          {navMenuNames.map((name) => (
            <div key={name} className="relative">
              <button
                style={{
                  height: 28, padding: "0 9px", border: 0,
                  background: openMenu === name ? "var(--ti-surface-2)" : "transparent",
                  borderRadius: 6,
                  fontSize: 12.5, fontWeight: 500,
                  color: openMenu === name ? "var(--ti-ink)" : "var(--ti-ink-2)",
                  fontFamily: "var(--ti-font-sans)",
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "background 100ms",
                }}
                onClick={() => setOpenMenu(openMenu === name ? null : name)}
                onMouseEnter={() => { if (openMenu && openMenu !== name) setOpenMenu(name); }}
              >
                {name}
              </button>
              {openMenu === name && (
                name === "Toolbar" ? (
                  <ToolbarSidebarMenu />
                ) : (
                  <MenuDropdown items={menus[name]} onClose={closeMenu} />
                )
              )}
            </div>
          ))}
          {onDrawingCanvas && (
            <>
              <div style={{ width: 1, height: 22, background: "var(--ti-divider)", margin: "0 2px" }} />
              <AlignmentMenu variant="menubar" />
            </>
          )}
        </div>

        {/* Center: trackIT link status badge + document title */}
        <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0 px-3">
          <TrackItModeBadge />
          {editingName ? (
            <input
              style={{
                background: "transparent", border: "none",
                borderBottom: "2px solid var(--ti-accent)",
                outline: "none", fontSize: 13, fontWeight: 600,
                color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)",
                maxWidth: 280, textAlign: "center",
              }}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
            />
          ) : (
            <span
              style={{
                fontSize: 13, fontWeight: 600, color: "var(--ti-ink)",
                fontFamily: "var(--ti-font-sans)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                cursor: "pointer",
              }}
              onDoubleClick={() => { setNameValue(schematicName); setEditingName(true); }}
              title="Double-click to rename"
            >
              {schematicName}
            </span>
          )}
          {!isOnline && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
              padding: "2px 7px", borderRadius: 999,
              background: "var(--ti-warning-soft)",
              color: "color-mix(in oklab, var(--ti-warning) 65%, var(--ti-ink))",
              flexShrink: 0,
            }} title="No internet connection. Editing works normally — save to your computer via File → Save.">
              Offline
            </span>
          )}
        </div>

        {/* Right: TrackIt sync pill + utility buttons + avatar */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSyncPillClick}
            aria-expanded={syncDrawerOpen}
            aria-controls="kgo-sync-drawer"
            title={
              syncStatus.needsSchematicSave
                ? "Save drawing to TrackIt now (Alt+click for sync panel)"
                : syncDrawerOpen
                  ? "Close TrackIt sync panel (Alt+click)"
                  : "TrackIt sync panel (Alt+click) · save is automatic every 25s after edits"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              border: `1px solid ${syncPillWarning ? "color-mix(in oklab, var(--ti-warning) 45%, transparent)" : "var(--ti-border)"}`,
              background: syncPillWarning ? "var(--ti-warning-soft)" : "var(--ti-surface)",
              color: syncPillWarning ? "color-mix(in oklab, var(--ti-warning) 70%, var(--ti-ink))" : "var(--ti-ink-2)",
              cursor: "pointer",
              fontFamily: "var(--ti-font-sans)",
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: syncPillWarning ? "var(--ti-warning)" : "var(--ti-success)",
              }}
            />
            {syncStatus.pillLabel}
            <TiIcon name="arrowSwap" size={12} color="currentColor" />
          </button>
          <div style={{ width: 1, height: 20, background: "var(--ti-divider)", margin: "0 4px" }} />
          <UndoHistoryControls variant="desktop" />
          <div style={{ width: 1, height: 20, background: "var(--ti-divider)", margin: "0 4px" }} />
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 30, height: 30, display: "grid", placeItems: "center",
              border: 0, background: "transparent", borderRadius: 7,
              cursor: "pointer", color: "var(--ti-ink-2)",
              transition: "background 100ms",
            }}
            className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
          >
            <TiIcon name={isDark ? "sun" : "moon"} size={16} color="var(--ti-ink-2)" />
          </button>
        </div>
      </div>

      {/* Mobile header bar */}
      <div className="flex md:hidden h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] items-center px-3 shrink-0 select-none justify-between gap-2">
        <img src="/favicon.svg" alt="" className="w-5 h-5 shrink-0" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <TrackItModeBadge />
          <span className="text-sm font-semibold text-[var(--color-text-heading)] truncate">
            {schematicName}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--color-surface)] flex flex-col">
          {/* Overlay header: undo/redo + close */}
          <div className="flex items-center justify-between px-3 h-12 border-b border-[var(--color-border)] shrink-0">
            <UndoHistoryControls variant="mobile" />
            <span className="text-sm font-semibold text-[var(--color-text-heading)]">Menu</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="p-2 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
              >
                {isDark ? (
                  <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="3.5" />
                    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="w-5 h-5" fill="currentColor">
                    <path d="M6 .278a.77.77 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
                  </svg>
                )}
              </button>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable menu sections */}
          <div className="flex-1 overflow-y-auto">
            {menuNames.map((name) => (
              <MobileAccordionSection key={name} name={name} items={menus[name]} />
            ))}

            {/* Panels section */}
            <div className="border-b border-[var(--color-border)]">
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Panels
              </div>
              {[
                { key: "viewOptions", label: "View Options" },
                { key: "showInfo", label: "Show Info" },
                { key: "signalColors", label: "Signal Colors" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    closeMobileMenu();
                    setActiveMobilePanel(key);
                  }}
                  className="flex items-center w-full px-8 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile panel overlay */}
      {activeMobilePanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--color-surface)] flex flex-col md:hidden">
          {activeMobilePanel === "viewOptions" && (
            <ViewOptionsPanel mobile onClose={() => setActiveMobilePanel(null)} />
          )}
          {activeMobilePanel === "showInfo" && (
            <ShowInfoPanel mobile onClose={() => setActiveMobilePanel(null)} />
          )}
          {activeMobilePanel === "signalColors" && (
            <SignalColorPanel mobile onClose={() => setActiveMobilePanel(null)} />
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      <input
        ref={importDrawingInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportIntoDrawingFile}
      />
      <input
        ref={archiveInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportArchive}
      />

      {reportsTab && (
        <ReportsDialog initialTab={reportsTab} onClose={() => setReportsTab(null)} />
      )}
      {showTitleBlockDialog && (
        <TitleBlockDialog onClose={() => setShowTitleBlockDialog(false)} />
      )}
      {showAboutDialog && (
        <AboutDialog onClose={() => setShowAboutDialog(false)} />
      )}
      {showPreferences && (
        <PreferencesDialog onClose={() => setShowPreferences(false)} />
      )}
      {showRoomDistances && (
        <RoomDistancesDialog onClose={() => setShowRoomDistances(false)} />
      )}
      {showCsvImport && (
        <CsvImportWizard onClose={() => setShowCsvImport(false)} />
      )}
      <DeviceLibraryAdminPanel />
    </div>
  );
}
