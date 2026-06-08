/**
 * trackIT popup integration — save back to plant_drawings via postMessage.
 * See trackIT: docs/kgo-es-writeback-protocol.md
 */

import { shouldShowCadTools } from "./cadDrawingUtils";
import { reconcileTrackItNumberingFromEdges } from "./trackitNumberingReconcile";
import {
  markSchematicStorageHydrated,
  trackItAutosaveKey,
  useSchematicStore,
} from "./store";
import { useSidebarStore } from "./sidebarStore";
import { LEGACY_SCHEMATIC_PAGE_ID } from "./drawingPageUtils";
import { listSchematicUndoHistory } from "./schematicUndo";
import type { SchematicFile, TrackItLinkContext } from "./types";

/** Mirrors trackIT `TrackItFocusPagePayload` (Pack tab sheet deep links). */
export type TrackItFocusPagePayload = {
  pageId?: string;
  pageType?: string;
};

let pendingFocusPage: TrackItFocusPagePayload | null = null;

/** Switch active page after schematic load (retries until pages exist). */
export function focusTrackItSchematicPage(payload: TrackItFocusPagePayload): boolean {
  const store = useSchematicStore.getState();
  const { pages } = store;

  if (payload.pageId && payload.pageId !== "__main__") {
    const byId = pages.find((p) => p.id === payload.pageId);
    if (byId) {
      store.setActivePage(byId.id);
      pendingFocusPage = null;
      return true;
    }
  }

  const type = payload.pageType?.trim();
  if (!type || type === "signal-flow" || type === "__main__") {
    store.setActivePage(LEGACY_SCHEMATIC_PAGE_ID);
    pendingFocusPage = null;
    return true;
  }

  const normalizedType =
    type === "rack-draft" || type === "rack-elevation"
      ? "rack-elevation"
      : type === "tower-draft"
        ? "tower-draft"
        : type;

  const byType = pages.find((p) => p.type === normalizedType);
  if (byType) {
    store.setActivePage(byType.id);
    pendingFocusPage = null;
    return true;
  }

  return false;
}

export function queueTrackItFocusPage(payload: TrackItFocusPagePayload): void {
  pendingFocusPage = payload;
  focusTrackItSchematicPage(payload);
}

export function flushPendingTrackItFocusPage(): void {
  if (!pendingFocusPage) return;
  if (focusTrackItSchematicPage(pendingFocusPage)) return;
  window.setTimeout(() => {
    if (pendingFocusPage) focusTrackItSchematicPage(pendingFocusPage);
  }, 200);
}

/** Last linked plant_drawings row — survives popup reload when trackIT bootstrap is delayed. */
export const TRACKIT_ACTIVE_LINK_KEY = "kgo-es-trackit-active-link";

export type { TrackItLinkContext };

export type TrackItEditorMode = "standalone" | "popup-awaiting-link" | "linked";

/** Debounced push to trackIT after edits (manual Ctrl+S is immediate). */
const TRACKIT_AUTOSAVE_MS = 25_000;

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let pagehideHookInstalled = false;
/** Avoid duplicate link/toast handling when trackIT bootstrap retries postMessage. */
let trackItLinkAppliedForDrawingId: string | null = null;
/** Avoid resetting the canvas when empty TRACKIT_LOAD_SCHEMATIC arrives after TRACKIT_LINK. */
let trackItBlankInitializedForDrawingId: string | null = null;

/** How this KGO-ES session relates to trackIT (drives banner + save targets). */
export function getTrackItEditorMode(): TrackItEditorMode {
  if (useSchematicStore.getState().trackItLink?.drawingId) return "linked";
  if (isTrackItPopupOpener()) return "popup-awaiting-link";
  return "standalone";
}

/** Linked to a plant_drawings row (save/autosave target is defined). */
export function isTrackItDrawingLinked(): boolean {
  return getTrackItEditorMode() === "linked";
}

/** Opened from trackIT popup — use trackIT-oriented layout even before link arrives. */
export function isTrackItPopupSession(): boolean {
  const mode = getTrackItEditorMode();
  return mode === "linked" || mode === "popup-awaiting-link";
}

/** @deprecated Prefer isTrackItDrawingLinked() or isTrackItPopupSession(). */
export function isTrackItLinked(): boolean {
  return isTrackItDrawingLinked();
}

/** Autosave to trackIT runs only after at least one device (node) is on the canvas. */
export function hasTrackItAutosaveContent(): boolean {
  return useSchematicStore.getState().nodes.length > 0;
}

export function canRunTrackItAutosave(): boolean {
  return isTrackItDrawingLinked() && hasTrackItAutosaveContent();
}

/** Push saved schematic JSON to trackIT opener (Plant drawing panel). */
export function notifyTrackItParentSaved(
  file: SchematicFile,
  opts?: { silent?: boolean },
): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "KGO_ES_SAVED", payload: file, silent: opts?.silent === true },
        "*",
      );
    }
  } catch {
    // cross-origin opener
  }
}

/** Opened from trackIT Plant — do not restore the legacy global demo autosave on mount. */
export function isTrackItPopupOpener(): boolean {
  try {
    return !!(typeof window !== "undefined" && window.opener && !window.opener.closed);
  } catch {
    return false;
  }
}

/** Push current schematic JSON to trackIT opener (Plant drawing panel). */
export function notifyTrackItParentUndoState(): void {
  if (!isTrackItPopupOpener()) return;
  try {
    const store = useSchematicStore.getState();
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "KGO_ES_UNDO_STATE",
          payload: {
            canUndo: store.canUndo(),
            canRedo: store.canRedo(),
            undoSize: store.undoSize,
            redoSize: store.redoSize,
            undoHistory: listSchematicUndoHistory(8),
          },
        },
        "*",
      );
    }
  } catch {
    // cross-origin opener
  }
}

/** Push current schematic JSON to trackIT opener (Plant drawing panel). */
export function saveToTrackItParent(opts?: { silent?: boolean }): boolean {
  if (!isTrackItDrawingLinked()) {
    if (!opts?.silent && isTrackItPopupOpener()) {
      useSchematicStore
        .getState()
        .addToast("Waiting for trackIT drawing link…", "info", 3500);
    }
    return false;
  }
  if (opts?.silent && !canRunTrackItAutosave()) {
    return false;
  }

  const store = useSchematicStore.getState();
  const reconciled = reconcileTrackItNumberingFromEdges(store.trackItNumbering, store.edges);
  if (reconciled) {
    store.setTrackItNumbering(reconciled);
  }
  const file = useSchematicStore.getState().exportToJSON();
  notifyTrackItParentSaved(file, { silent: opts?.silent });
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "KGO_ES_CLEAN" }, "*");
    }
  } catch {
    // ignore
  }
  useSchematicStore.setState({
    trackItLastPushedAt: new Date().toISOString(),
    trackItUnsavedChanges: false,
  });

  if (!opts?.silent) {
    const deviceCount = store.nodes.length;
    if (deviceCount === 0) {
      store.addToast("Empty layout saved to trackIT drawing", "success", 2800);
    } else {
      store.addToast("Saved to trackIT drawing", "success", 2800);
    }
  }
  return true;
}

function installTrackItAutosavePagehideHook(): void {
  if (pagehideHookInstalled || typeof window === "undefined") return;
  pagehideHookInstalled = true;
  window.addEventListener("pagehide", () => {
    try {
      useSchematicStore.getState().saveToLocalStorage();
    } catch {
      // tab closing
    }
    flushTrackItAutosave();
  });
}

export function persistTrackItActiveLink(link: TrackItLinkContext): void {
  try {
    localStorage.setItem(TRACKIT_ACTIVE_LINK_KEY, JSON.stringify(link));
  } catch {
    // Storage unavailable
  }
}

export function readTrackItActiveLink(): TrackItLinkContext | null {
  try {
    const raw = localStorage.getItem(TRACKIT_ACTIVE_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrackItLinkContext>;
    if (!parsed?.drawingId || !parsed?.dwgNumber) return null;
    return parsed as TrackItLinkContext;
  } catch {
    return null;
  }
}

/** Restore per-drawing autosave on popup reload before trackIT postMessage bootstrap. */
export function restoreTrackItPopupAutosaveOnMount(): void {
  if (!isTrackItPopupOpener()) return;

  const store = useSchematicStore.getState();
  const link = readTrackItActiveLink();

  if (link?.drawingId) {
    if (store.trackItLink?.drawingId !== link.drawingId || store.nodes.length === 0) {
      const loaded = loadTrackItDrawingAutosave(link.drawingId);
      store.setTrackItLink(link);
      const drawingName = link.drawingName?.trim();
      if (drawingName) store.setSchematicName(drawingName);
      if (loaded) {
        trackItLinkAppliedForDrawingId = link.drawingId;
        return;
      }
    }
  }

  markSchematicStorageHydrated();
}

/** Push pending debounced save immediately (e.g. popup close). */
export function flushTrackItAutosave(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  if (!canRunTrackItAutosave()) return;
  saveToTrackItParent({ silent: true });
}

/** Debounced push to trackIT while editing (after first device; does not replace Ctrl+S). */
export function scheduleTrackItAutosave(): void {
  if (!isTrackItDrawingLinked()) return;
  installTrackItAutosavePagehideHook();
  if (!hasTrackItAutosaveContent()) {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    return;
  }
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    if (!canRunTrackItAutosave()) return;
    saveToTrackItParent({ silent: true });
  }, TRACKIT_AUTOSAVE_MS);
}

export function loadTrackItDrawingAutosave(drawingId: string): boolean {
  return useSchematicStore.getState().loadAutosaveFromKey(trackItAutosaveKey(drawingId));
}

/** Empty canvas for a linked plant drawing (no legacy demo / other drawing content). */
export function beginBlankTrackItDrawing(link: TrackItLinkContext): void {
  if (!link?.drawingId) return;
  if (
    trackItBlankInitializedForDrawingId === link.drawingId &&
    useSchematicStore.getState().trackItLink?.drawingId === link.drawingId
  ) {
    return;
  }
  trackItBlankInitializedForDrawingId = link.drawingId;
  const store = useSchematicStore.getState();
  store.newSchematic();
  store.setTrackItLink(link);
  const drawingName = link.drawingName?.trim();
  if (drawingName) {
    store.setSchematicName(drawingName);
  }
}

export function applyTrackItLink(link: TrackItLinkContext): void {
  if (!link?.drawingId) return;

  const store = useSchematicStore.getState();
  const switched = store.trackItLink?.drawingId !== link.drawingId;

  if (!switched && trackItLinkAppliedForDrawingId === link.drawingId) {
    persistTrackItActiveLink(link);
    store.setTrackItLink(link);
    const drawingName = link.drawingName?.trim();
    if (drawingName) store.setSchematicName(drawingName);
    return;
  }

  persistTrackItActiveLink(link);
  if (switched) {
    trackItLinkAppliedForDrawingId = null;
    trackItBlankInitializedForDrawingId = null;
    cadToolsAutoOpenedForDrawingId = null;
    towerDraftAutoOpenedForDrawingId = null;
  }

  if (switched) {
    const loaded = loadTrackItDrawingAutosave(link.drawingId);
    if (!loaded) {
      beginBlankTrackItDrawing(link);
    } else {
      store.setTrackItLink(link);
      const drawingName = link.drawingName?.trim();
      if (drawingName) {
        store.setSchematicName(drawingName);
      }
    }
  } else {
    store.setTrackItLink(link);
    const drawingName = link.drawingName?.trim();
    if (drawingName) {
      store.setSchematicName(drawingName);
    }
  }

  trackItLinkAppliedForDrawingId = link.drawingId;
  store.addToast(`Linked to trackIT DWG ${link.dwgNumber}`, "success", 3500);
  if (link.drawingType === "tower_stack") {
    window.setTimeout(() => maybeAutoOpenTowerDraftTab(), 0);
  }
}

/** After schematic load — open CAD tools once (deferred; avoids render loops on TRACKIT_LINK). */
let cadToolsAutoOpenedForDrawingId: string | null = null;

/** After tower_stack load — switch to tower elevation draft tab once. */
let towerDraftAutoOpenedForDrawingId: string | null = null;

export function maybeAutoOpenTowerDraftTab(): void {
  const store = useSchematicStore.getState();
  const link = store.trackItLink;
  if (!link?.drawingId || link.drawingType !== "tower_stack") return;
  if (towerDraftAutoOpenedForDrawingId === link.drawingId) return;

  const draftPage = store.pages.find((p) => p.type === "tower-draft");
  if (!draftPage) return;

  towerDraftAutoOpenedForDrawingId = link.drawingId;
  store.setActivePage(draftPage.id);
  store.addToast(
    "Tower elevation draft — drag devices from the sidebar to set mount heights (ft AGL)",
    "info",
    4500,
  );
}

export function maybeAutoOpenCadToolsPanel(): void {
  const store = useSchematicStore.getState();
  const link = store.trackItLink;
  if (!link?.drawingId) return;
  if (cadToolsAutoOpenedForDrawingId === link.drawingId) return;
  if (
    !shouldShowCadTools({
      trackItLink: link,
      nodes: store.nodes,
      schematicName: store.schematicName,
    })
  ) {
    return;
  }

  cadToolsAutoOpenedForDrawingId = link.drawingId;
  const sidebar = useSidebarStore.getState();
  sidebar.setPanelVisible("cadTools", true);
  sidebar.expandRightPanel("cadTools");
}

/** Ask trackIT opener to navigate to another plant drawing (fly link). */
export function requestOpenTrackItDrawing(payload: {
  dwgNumber: string;
  remoteDrawingId?: string;
}): void {
  const trimmed = payload.dwgNumber.trim();
  if (!trimmed) {
    useSchematicStore.getState().addToast("Set a remote DWG number on the fly endpoint", "info");
    return;
  }
  if (!isTrackItPopupOpener()) {
    useSchematicStore
      .getState()
      .addToast("Fly navigation requires opening ES from trackIT Plant", "info", 4000);
    return;
  }
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "KGO_ES_OPEN_DRAWING",
          payload: { dwgNumber: trimmed, drawingId: payload.remoteDrawingId },
        },
        "*",
      );
    }
  } catch {
    useSchematicStore.getState().addToast("Could not reach trackIT window", "error");
  }
}
