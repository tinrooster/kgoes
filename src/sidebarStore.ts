import { create } from "zustand";
import { isTrackItPopupSession } from "./trackitIntegration";

export const SIDEBAR_PREFS_KEY = "easyschematic-sidebar-prefs";
export const LIBRARY_BROWSE_MODE_KEY = "easyschematic-library-browse-mode";

export type LibraryBrowseMode = "full" | "userTemplatesOnly";

export type RightPanelId = "viewOptions" | "trackIt" | "showInfo" | "colors";

export interface SidebarPanelVisibility {
  devices: boolean;
  viewOptions: boolean;
  trackItNumbers: boolean;
  showInfo: boolean;
  colors: boolean;
}

export interface SidebarPrefs {
  leftExpanded: boolean;
  rightViewOptionsExpanded: boolean;
  rightTrackItExpanded: boolean;
  rightShowInfoExpanded: boolean;
  rightColorsExpanded: boolean;
  quickToolbarVisible: boolean;
  libraryBrowseMode: LibraryBrowseMode;
  panelsVisible: SidebarPanelVisibility;
}

function trackItSessionDefaults(): Partial<SidebarPrefs> {
  if (!isTrackItPopupSession()) return {};
  return {
    leftExpanded: false,
    rightTrackItExpanded: true,
    rightShowInfoExpanded: false,
    rightColorsExpanded: false,
    libraryBrowseMode: "userTemplatesOnly",
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

const DEFAULT_PANELS_VISIBLE: SidebarPanelVisibility = {
  devices: true,
  viewOptions: true,
  trackItNumbers: true,
  showInfo: true,
  colors: true,
};

function loadSidebarPrefs(): SidebarPrefs {
  const defaults: SidebarPrefs = {
    leftExpanded: false,
    rightViewOptionsExpanded: false,
    rightTrackItExpanded: false,
    rightShowInfoExpanded: false,
    rightColorsExpanded: false,
    quickToolbarVisible: true,
    libraryBrowseMode: loadLibraryBrowseMode(),
    panelsVisible: { ...DEFAULT_PANELS_VISIBLE },
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
    };
  } catch {
    return defaults;
  }
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
  setQuickToolbarVisible: (v: boolean) => void;
  toggleQuickToolbarVisible: () => void;
  setLibraryBrowseMode: (mode: LibraryBrowseMode) => void;
  setPanelVisible: (panel: keyof SidebarPanelVisibility, visible: boolean) => void;
  setPanelsVisible: (next: Partial<SidebarPanelVisibility>) => void;
  /** Only one wide right panel at a time */
  expandRightPanel: (panel: RightPanelId) => void;
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

  setQuickToolbarVisible: (quickToolbarVisible) => {
    set({ quickToolbarVisible });
    persistSidebar({ ...get(), quickToolbarVisible });
  },

  toggleQuickToolbarVisible: () => {
    const quickToolbarVisible = !get().quickToolbarVisible;
    set({ quickToolbarVisible });
    persistSidebar({ ...get(), quickToolbarVisible });
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

  expandRightPanel: (panel) => {
    const next = {
      rightViewOptionsExpanded: panel === "viewOptions",
      rightTrackItExpanded: panel === "trackIt",
      rightShowInfoExpanded: panel === "showInfo",
      rightColorsExpanded: panel === "colors",
    };
    set(next);
    persistSidebar({ ...get(), ...next });
  },
}));
