import type { DrawingSetupOptions } from "./drawingSetupDefaults";
import {
  resolveBundledTemplate,
  saveLastDrawingSetup,
  type DrawingSetupMode,
} from "./drawingSetupDefaults";
import { extractDrawingGraphFromFile } from "./importDrawingGraph";
import { migrateSchematic } from "./migrations";
import { useSchematicStore } from "./store";
import type { SchematicFile, TrackItLinkContext } from "./types";

function resolveTemplateSchematic(setup: DrawingSetupOptions): SchematicFile | undefined {
  if (setup.templateId === "blank") return undefined;
  if (setup.templateId === "import-file") return setup.importFile;
  const resolved = resolveBundledTemplate(setup.templateId);
  return resolved ?? undefined;
}

function applyPrintPageSetup(setup: DrawingSetupOptions): void {
  if (!setup.customizePrintPage) return;
  const store = useSchematicStore.getState();
  store.setPrintPaperId(setup.printPaperId);
  store.setPrintOrientation(setup.printOrientation);
  store.setPrintScale(setup.printScale);
  if (setup.printPaperId === "custom") {
    store.setPrintCustomWidthIn(setup.printCustomWidthIn);
    store.setPrintCustomHeightIn(setup.printCustomHeightIn);
  }
}

export function applyTrackItDrawingMetadata(link: TrackItLinkContext): void {
  const store = useSchematicStore.getState();
  store.setTrackItLink(link);
  const drawingName = link.drawingName?.trim();
  if (drawingName) {
    store.setSchematicName(drawingName);
    const tb = useSchematicStore.getState().titleBlock;
    store.setTitleBlock({
      ...tb,
      drawingTitle: drawingName,
    });
  }
}

function annotateSetupOnActiveDrawingPage(setup: DrawingSetupOptions): void {
  const state = useSchematicStore.getState();
  const drawingPage = state.pages.find((p) => p.id === state.activePage && p.type === "drawing");
  if (!drawingPage || drawingPage.type !== "drawing") return;
  useSchematicStore.setState({
    pages: state.pages.map((p) =>
      p.id === drawingPage.id && p.type === "drawing"
        ? {
            ...p,
            label: setup.sheetName.trim() || p.label,
            printOriginOffsetX: setup.printOriginOffsetX,
            printOriginOffsetY: setup.printOriginOffsetY,
            setupTemplateId: setup.setupTemplateId ?? setup.templateId,
          }
        : p,
    ),
  });
}

/** Apply user choices from New Drawing Setup (project, sheet, or trackIT blank). */
export function applyDrawingSetup(
  mode: DrawingSetupMode,
  setup: DrawingSetupOptions,
  trackItLink?: TrackItLinkContext | null,
): string | undefined {
  saveLastDrawingSetup(setup);
  const store = useSchematicStore.getState();
  const templateRaw = resolveTemplateSchematic(setup);
  const templateData = templateRaw
    ? (migrateSchematic(templateRaw) as SchematicFile)
    : undefined;

  const setupWithMeta: DrawingSetupOptions = {
    ...setup,
    setupTemplateId: setup.setupTemplateId ?? setup.templateId,
  };

  if (mode === "new-sheet") {
    const pageId = store.addDrawingPage(
      setupWithMeta.sheetName.trim() || "Drawing",
      setupWithMeta,
      templateData,
    );
    store.setPrintOriginOffset(setupWithMeta.printOriginOffsetX, setupWithMeta.printOriginOffsetY);
    store.setPendingInitialViewport(setupWithMeta.initialViewport);
    applyPrintPageSetup(setupWithMeta);
    store.saveToLocalStorage();
    return pageId;
  }

  store.newSchematicWithSetup(setupWithMeta, templateData, trackItLink ?? null);
  applyPrintPageSetup(setupWithMeta);
  return useSchematicStore.getState().activePage;
}

export function extractGraphForNewSheet(templateData?: SchematicFile): {
  nodes: import("./types").SchematicNode[];
  edges: import("./types").ConnectionEdge[];
} {
  if (!templateData) return { nodes: [], edges: [] };
  const extracted = extractDrawingGraphFromFile(templateData);
  return { nodes: extracted.nodes, edges: extracted.edges };
}

export { annotateSetupOnActiveDrawingPage };
