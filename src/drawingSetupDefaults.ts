import type { SchematicFile, TrackItLinkContext } from "./types";
import type { Orientation } from "./printConfig";
import signalFlowStarter from "./templates/signal-flow-starter.json";
import rackRoomShell from "./templates/rack-room-shell.json";
import {
  getUserDrawingTemplate,
  isUserTemplateId,
  listUserDrawingTemplates,
  type UserDrawingTemplate,
} from "./userDrawingTemplates";

export type DrawingSetupMode = "new-project" | "new-sheet" | "trackit-blank";

/** Built-in ids; user templates use `user:<id>`. */
export type BuiltInDrawingTemplateId = "blank" | "signal-flow" | "rack-room" | "import-file";
export type DrawingTemplateId = BuiltInDrawingTemplateId | `user:${string}`;

export type InitialViewportMode = "overview" | "origin";

export interface DrawingSetupOptions {
  sheetName: string;
  templateId: DrawingTemplateId;
  /** Populated when templateId is import-file. */
  importFile?: SchematicFile;
  printOriginOffsetX: number;
  printOriginOffsetY: number;
  initialViewport: InitialViewportMode;
  setupTemplateId?: string;
  /** When true, apply print paper / scale below on create. */
  customizePrintPage: boolean;
  printPaperId: string;
  printOrientation: Orientation;
  printScale: number;
  printCustomWidthIn: number;
  printCustomHeightIn: number;
}

export interface DrawingSetupRequest {
  mode: DrawingSetupMode;
  defaultSheetName?: string;
  trackItLink?: TrackItLinkContext | null;
  onComplete?: (pageId?: string) => void;
}

export interface BundledDrawingTemplate {
  id: Exclude<DrawingTemplateId, "blank" | "import-file">;
  label: string;
  description: string;
  file: SchematicFile;
}

export const BUNDLED_DRAWING_TEMPLATES: BundledDrawingTemplate[] = [
  {
    id: "signal-flow",
    label: "Signal flow (two rooms)",
    description: "Empty Room A and Room B containers to start routing.",
    file: signalFlowStarter as SchematicFile,
  },
  {
    id: "rack-room",
    label: "Rack room shell",
    description: "Single equipment room ready for rack elevation linking.",
    file: rackRoomShell as SchematicFile,
  },
];

const SKIP_KEY = "kgo-es-drawing-setup-skip";
const LAST_DEFAULTS_KEY = "kgo-es-drawing-setup-last";

export const DEFAULT_DRAWING_SETUP: DrawingSetupOptions = {
  sheetName: "Drawing",
  templateId: "blank",
  printOriginOffsetX: 0,
  printOriginOffsetY: 0,
  initialViewport: "overview",
  customizePrintPage: false,
  printPaperId: "arch-d",
  printOrientation: "landscape",
  printScale: 1,
  printCustomWidthIn: 24,
  printCustomHeightIn: 36,
};

export function getDrawingSetupSkip(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDrawingSetupSkip(skip: boolean): void {
  try {
    if (skip) localStorage.setItem(SKIP_KEY, "1");
    else localStorage.removeItem(SKIP_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLastDrawingSetup(): DrawingSetupOptions {
  try {
    const raw = localStorage.getItem(LAST_DEFAULTS_KEY);
    if (!raw) return { ...DEFAULT_DRAWING_SETUP };
    const parsed = JSON.parse(raw) as Partial<DrawingSetupOptions>;
    return {
      ...DEFAULT_DRAWING_SETUP,
      ...parsed,
      templateId: (parsed.templateId ?? DEFAULT_DRAWING_SETUP.templateId) as DrawingTemplateId,
      initialViewport: parsed.initialViewport ?? DEFAULT_DRAWING_SETUP.initialViewport,
      customizePrintPage: parsed.customizePrintPage ?? DEFAULT_DRAWING_SETUP.customizePrintPage,
      printPaperId: parsed.printPaperId ?? DEFAULT_DRAWING_SETUP.printPaperId,
      printOrientation: parsed.printOrientation ?? DEFAULT_DRAWING_SETUP.printOrientation,
      printScale: parsed.printScale ?? DEFAULT_DRAWING_SETUP.printScale,
      printCustomWidthIn: parsed.printCustomWidthIn ?? DEFAULT_DRAWING_SETUP.printCustomWidthIn,
      printCustomHeightIn: parsed.printCustomHeightIn ?? DEFAULT_DRAWING_SETUP.printCustomHeightIn,
      importFile: undefined,
    };
  } catch {
    return { ...DEFAULT_DRAWING_SETUP };
  }
}

export function saveLastDrawingSetup(options: DrawingSetupOptions): void {
  try {
    const { importFile: _, ...persisted } = options;
    localStorage.setItem(LAST_DEFAULTS_KEY, JSON.stringify(persisted));
  } catch {
    /* ignore */
  }
}

export function resolveBundledTemplate(id: DrawingTemplateId): SchematicFile | null {
  if (id === "blank" || id === "import-file") return null;
  if (isUserTemplateId(id)) {
    return getUserDrawingTemplate(id)?.file ?? null;
  }
  return BUNDLED_DRAWING_TEMPLATES.find((t) => t.id === id)?.file ?? null;
}

export function listAllDrawingTemplateChoices(): {
  bundled: BundledDrawingTemplate[];
  user: UserDrawingTemplate[];
} {
  return {
    bundled: BUNDLED_DRAWING_TEMPLATES,
    user: listUserDrawingTemplates(),
  };
}

export function defaultSheetNameForMode(mode: DrawingSetupMode, existingCount = 0): string {
  if (mode === "new-sheet") {
    return existingCount === 0 ? "Drawing" : `Drawing ${existingCount + 1}`;
  }
  return "Drawing";
}

export function mergeSetupWithRequest(
  request: DrawingSetupRequest,
  base: DrawingSetupOptions,
): DrawingSetupOptions {
  const sheetName =
    request.defaultSheetName?.trim() ||
    base.sheetName.trim() ||
    defaultSheetNameForMode(request.mode);
  return { ...base, sheetName };
}
