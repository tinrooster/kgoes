import { create } from "zustand";

/** Avoid importing trackitIntegration (circular with sidebar store). */
function isTrackItPopupOpener(): boolean {
  try {
    return !!(typeof window !== "undefined" && window.opener && !window.opener.closed);
  } catch {
    return false;
  }
}

export const SIDEBAR_PREFS_KEY = "easyschematic-sidebar-prefs";
export const LIBRARY_BROWSE_MODE_KEY = "easyschematic-library-browse-mode";

export type LibraryBrowseMode = "full" | "userTemplatesOnly";

export type RightPanelId = "viewOptions" | "trackIt" | "showInfo" | "colors" | "cadTools";

/** Right dock panels (excluding inspector) — order controls render sequence. */
export type RightDockPanelId = "viewOptions" | "trackItNumbers" | "showInfo" | "colors" | "cadTools";

export const RIGHT_DOCK_PANEL_LABELS: Record<RightDockPanelId, string> = {
  viewOptions: "View options",
  trackItNumbers: "trackIT numbers",
  showInfo: "Show info",
  colors: "Colors",
  cadTools: "CAD tools",
};

export const DEFAULT_RIGHT_PANEL_ORDER: RightDockPanelId[] = [
  "viewOptions",
  "trackItNumbers",
  "showInfo",
  "colors",
  "cadTools",
];

export interface SidebarPanelVisibility {
  devices: boolean;
  viewOptions: boolean;
  trackItNumbers: boolean;
  showInfo: boolean;
  colors: boolean;
  cadTools: boolean;
}

export interface SidebarPrefs {
  leftExpanded: boolean;
  rightViewOptionsExpanded: boolean;
  rightTrackItExpanded: boolean;
  rightShowInfoExpanded: boolean;
  rightColorsExpanded: boolean;
  rightCadToolsExpanded: boolean;
  /** Compact icon buttons for tool-palette sidebars (CAD tools, etc.) */
  toolPaletteIconOnly: boolean;
  libraryBrowseMode: LibraryBrowseMode;
  panelsVisible: SidebarPanelVisibility;
  rightInspectorOpen: boolean;
  rightPanelOrder: RightDockPanelId[];
}

function trackItSessionDefaults(): Partial<SidebarPrefs> {
  if (!isTrackItPopupOpener()) return {};
  return {
    leftExpanded: false,
    rightTrackItExpanded: false,
    rightShowInfoExpanded: false,
    rightColorsExpanded: false,
    rightCadToolsExpanded: false,
    libraryBrowseMode: "userTemplatesOnly",
    panelsVisible: {
      devices: true,
      viewOptions: false,
      trackItNumbers: true,
      showInfo: false,
      colors: false,
      cadTools: false,
    },
  };
}

function loadLibraryBrowseMode(): LibraryBrowseMode {
  try {
    const v = localStorage.getItem(LIBRARY_BROWSE_MODE_KEY);
    if (v === "full" || v === "userTemplatesOnly") return v;
  } catch {
    /* ignore */
  }
  const trackIt = trackItSessionDefaults();
  return trackIt.libraryBrowseMode ?? "userTemplatesOnly";
}

/** Fresh installs: Devices + trackIT numbers only; other panels via Toolbar / Preferences. */
const DEFAULT_PANELS_VISIBLE: SidebarPanelVisibility = {
  devices: true,
  viewOptions: false,
  trackItNumbers: true,
  showInfo: false,
  colors: false,
  cadTools: false,
};

function loadSidebarPrefs(): SidebarPrefs {
  const defaults: SidebarPrefs = {
    leftExpanded: false,
    rightViewOptionsExpanded: false,
    rightTrackItExpanded: false,
    rightShowInfoExpanded: false,
    rightColorsExpanded: false,
    rightCadToolsExpanded: false,
    toolPaletteIconOnly: false,
    libraryBrowseMode: loadLibraryBrowseMode(),
    panelsVisible: { ...DEFAULT_PANELS_VISIBLE },
    rightInspectorOpen: true,
    rightPanelOrder: [...DEFAULT_RIGHT_PANEL_ORDER],
    ...trackItSessionDefaults(),
  };
  try {
    const raw = localStorage.getItem(SIDEBAR_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      ...defaults,
      ...parsed,
      libraryBrowseMode: loadLibraryBrowseMode(),
      panelsVisible: {
        ...DEFAULT_PANELS_VISIBLE,
        ...(parsed.panelsVisible ?? {}),
      },
      rightPanelOrder: normalizeRightPanelOrder(parsed.rightPanelOrder),
    };
  } catch {
    return defaults;
  }
}

function normalizeRightPanelOrder(raw: unknown): RightDockPanelId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_RIGHT_PANEL_ORDER];
  const valid = raw.filter(
    (id): id is RightDockPanelId =>
      typeof id === "string" && (DEFAULT_RIGHT_PANEL_ORDER as readonly string[]).includes(id),
  );
  const missing = DEFAULT_RIGHT_PANEL_ORDER.filter((id) => !valid.includes(id));
  return valid.length > 0 ? [...valid, ...missing] : [...DEFAULT_RIGHT_PANEL_ORDER];
}

function persistSidebar(prefs: SidebarPrefs): void {
  try {
    const { libraryBrowseMode, ...rest } = prefs;
    localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(rest));
    localStorage.setItem(LIBRARY_BROWSE_MODE_KEY, libraryBrowseMode);
  } catch {
    /* ignore */
  }
}

interface SidebarState extends SidebarPrefs {
  setLeftExpanded: (v: boolean) => void;
  setRightViewOptionsExpanded: (v: boolean) => void;
  setRightTrackItExpanded: (v: boolean) => void;
  setRightShowInfoExpanded: (v: boolean) => void;
  setRightColorsExpanded: (v: boolean) => void;
  setRightCadToolsExpanded: (v: boolean) => void;
  setToolPaletteIconOnly: (v: boolean) => void;
  toggleToolPaletteIconOnly: () => void;
  setLibraryBrowseMode: (mode: LibraryBrowseMode) => void;
  setPanelVisible: (panel: keyof SidebarPanelVisibility, visible: boolean) => void;
  setPanelsVisible: (next: Partial<SidebarPanelVisibility>) => void;
  moveRightPanel: (sourceId: RightDockPanelId, targetId: RightDockPanelId) => void;
  /** Only one wide right panel at a time */
  expandRightPanel: (panel: RightPanelId) => void;
  setRightInspectorOpen: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  ...loadSidebarPrefs(),

  setLeftExpanded: (leftExpanded) => {
    set({ leftExpanded });
    persistSidebar({ ...get(), leftExpanded });
  },

  setRightViewOptionsExpanded: (rightViewOptionsExpanded) => {
    set({ rightViewOptionsExpanded });
    persistSidebar({ ...get(), rightViewOptionsExpanded });
  },

  setRightTrackItExpanded: (rightTrackItExpanded) => {
    set({ rightTrackItExpanded });
    persistSidebar({ ...get(), rightTrackItExpanded });
  },

  setRightShowInfoExpanded: (rightShowInfoExpanded) => {
    set({ rightShowInfoExpanded });
    persistSidebar({ ...get(), rightShowInfoExpanded });
  },

  setRightColorsExpanded: (rightColorsExpanded) => {
    set({ rightColorsExpanded });
    persistSidebar({ ...get(), rightColorsExpanded });
  },

  setRightCadToolsExpanded: (rightCadToolsExpanded) => {
    set({ rightCadToolsExpanded });
    persistSidebar({ ...get(), rightCadToolsExpanded });
  },

  setToolPaletteIconOnly: (toolPaletteIconOnly) => {
    set({ toolPaletteIconOnly });
    persistSidebar({ ...get(), toolPaletteIconOnly });
  },

  toggleToolPaletteIconOnly: () => {
    const toolPaletteIconOnly = !get().toolPaletteIconOnly;
    set({ toolPaletteIconOnly });
    persistSidebar({ ...get(), toolPaletteIconOnly });
  },

  setLibraryBrowseMode: (libraryBrowseMode) => {
    set({ libraryBrowseMode });
    persistSidebar({ ...get(), libraryBrowseMode });
  },

  setPanelVisible: (panel, visible) => {
    const panelsVisible = { ...get().panelsVisible, [panel]: visible };
    set({ panelsVisible });
    persistSidebar({ ...get(), panelsVisible });
  },

  setPanelsVisible: (partial) => {
    const panelsVisible = { ...get().panelsVisible, ...partial };
    set({ panelsVisible });
    persistSidebar({ ...get(), panelsVisible });
  },

  moveRightPanel: (sourceId, targetId) => {
    const order = [...get().rightPanelOrder];
    const from = order.indexOf(sourceId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    order.splice(from, 1);
    order.splice(to, 0, sourceId);
    set({ rightPanelOrder: order });
    persistSidebar({ ...get(), rightPanelOrder: order });
  },

  expandRightPanel: (panel) => {
    const next = {
      rightViewOptionsExpanded: panel === "viewOptions",
      rightTrackItExpanded: panel === "trackIt",
      rightShowInfoExpanded: panel === "showInfo",
      rightColorsExpanded: panel === "colors",
      rightCadToolsExpanded: panel === "cadTools",
    };
    set(next);
    persistSidebar({ ...get(), ...next });
  },

  setRightInspectorOpen: (rightInspectorOpen) => {
    set({ rightInspectorOpen });
    persistSidebar({ ...get(), rightInspectorOpen });
  },
}));

// ─── Sync drawer state (not persisted — session only) ──────────────────────
import { create as createSyncStore } from "zustand";

interface SyncDrawerState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useSyncDrawerStore = createSyncStore<SyncDrawerState>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
