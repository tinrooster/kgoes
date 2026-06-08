import {
  DEFAULT_PANEL_LAYOUTS,
  normalizePanelLayouts,
  type WorkspacePanelId,
  type WorkspacePanelLayout,
} from "./workspacePanelLayout";

export const WORKSPACE_PRESETS_KEY = "easyschematic-workspace-presets";

const DEFAULT_RIGHT_PANEL_ORDER = [
  "viewOptions",
  "trackItNumbers",
  "showInfo",
  "colors",
  "cadTools",
] as const;

type RightDockPanelId = (typeof DEFAULT_RIGHT_PANEL_ORDER)[number];

export type WorkspaceLayoutSnapshot = {
  panelsVisible: {
    devices: boolean;
    viewOptions: boolean;
    trackItNumbers: boolean;
    showInfo: boolean;
    colors: boolean;
    cadTools: boolean;
  };
  rightPanelOrder: RightDockPanelId[];
  panelLayouts: Record<WorkspacePanelId, WorkspacePanelLayout>;
  rightInspectorOpen: boolean;
  leftExpanded: boolean;
  rightViewOptionsExpanded: boolean;
  rightTrackItExpanded: boolean;
  rightShowInfoExpanded: boolean;
  rightColorsExpanded: boolean;
  rightCadToolsExpanded: boolean;
  toolPaletteIconOnly: boolean;
};

export interface WorkspacePreset {
  name: string;
  savedAt: number;
  layout: WorkspaceLayoutSnapshot;
}

const MAX_PRESETS = 12;

function normalizeRightPanelOrder(raw: unknown): RightDockPanelId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_RIGHT_PANEL_ORDER];
  const valid = raw.filter(
    (id): id is RightDockPanelId =>
      typeof id === "string" && (DEFAULT_RIGHT_PANEL_ORDER as readonly string[]).includes(id),
  );
  const missing = DEFAULT_RIGHT_PANEL_ORDER.filter((id) => !valid.includes(id));
  return valid.length > 0 ? [...valid, ...missing] : [...DEFAULT_RIGHT_PANEL_ORDER];
}

export function normalizeWorkspaceSnapshot(raw: Partial<WorkspaceLayoutSnapshot>): WorkspaceLayoutSnapshot {
  const defaults = emptyWorkspaceSnapshot();
  return {
    ...defaults,
    ...raw,
    panelsVisible: { ...defaults.panelsVisible, ...(raw.panelsVisible ?? {}) },
    rightPanelOrder: normalizeRightPanelOrder(raw.rightPanelOrder),
    panelLayouts: normalizePanelLayouts(raw.panelLayouts),
  };
}

export function emptyWorkspaceSnapshot(): WorkspaceLayoutSnapshot {
  return {
    panelsVisible: {
      devices: true,
      viewOptions: false,
      trackItNumbers: true,
      showInfo: false,
      colors: false,
      cadTools: false,
    },
    rightPanelOrder: [...DEFAULT_RIGHT_PANEL_ORDER],
    panelLayouts: { ...DEFAULT_PANEL_LAYOUTS },
    rightInspectorOpen: true,
    leftExpanded: false,
    rightViewOptionsExpanded: false,
    rightTrackItExpanded: false,
    rightShowInfoExpanded: false,
    rightColorsExpanded: false,
    rightCadToolsExpanded: false,
    toolPaletteIconOnly: false,
  };
}

function readPresets(): WorkspacePreset[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspacePreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.name === "string" && p.layout)
      .map((p) => ({
        name: p.name.trim(),
        savedAt: typeof p.savedAt === "number" ? p.savedAt : Date.now(),
        layout: normalizeWorkspaceSnapshot(p.layout),
      }))
      .filter((p) => p.name.length > 0)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

function writePresets(presets: WorkspacePreset[]): void {
  try {
    localStorage.setItem(WORKSPACE_PRESETS_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
  } catch {
    /* ignore */
  }
}

export function listWorkspacePresets(): WorkspacePreset[] {
  return readPresets().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveWorkspacePreset(name: string, layout: WorkspaceLayoutSnapshot): WorkspacePreset {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Preset name is required");
  const presets = readPresets().filter((p) => p.name.toLowerCase() !== trimmed.toLowerCase());
  const preset: WorkspacePreset = {
    name: trimmed,
    savedAt: Date.now(),
    layout: normalizeWorkspaceSnapshot(layout),
  };
  writePresets([preset, ...presets].slice(0, MAX_PRESETS));
  return preset;
}

export function loadWorkspacePreset(name: string): WorkspaceLayoutSnapshot | null {
  const preset = readPresets().find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  return preset?.layout ?? null;
}

export function deleteWorkspacePreset(name: string): boolean {
  const before = readPresets();
  const next = before.filter((p) => p.name.toLowerCase() !== name.trim().toLowerCase());
  if (next.length === before.length) return false;
  writePresets(next);
  return true;
}
