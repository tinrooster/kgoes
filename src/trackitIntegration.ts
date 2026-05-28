/**
 * trackIT popup integration — save back to plant_drawings via postMessage.
 * See trackIT: docs/easyschematic-writeback-protocol.md
 */

import { trackItAutosaveKey, useSchematicStore } from "./store";
import type { SchematicFile, TrackItLinkContext } from "./types";

export type { TrackItLinkContext };

/** Push saved schematic JSON to trackIT opener (Plant drawing panel). */
export function notifyTrackItParentSaved(file: SchematicFile): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "EASYSCHEMATIC_SAVED", payload: file }, "*");
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

export function isTrackItLinked(): boolean {
  const link = useSchematicStore.getState().trackItLink;
  if (link?.drawingId) return true;
  return isTrackItPopupOpener();
}

/** Push current schematic JSON to trackIT opener (Plant drawing panel). */
export function saveToTrackItParent(opts?: { silent?: boolean }): boolean {
  if (!isTrackItLinked()) return false;
  const file = useSchematicStore.getState().exportToJSON();
  notifyTrackItParentSaved(file);
  useSchematicStore.setState({ trackItLastPushedAt: new Date().toISOString() });
  if (!opts?.silent) {
    useSchematicStore.getState().addToast("Saved to trackIT drawing", "success", 2800);
  }
  return true;
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push to trackIT while editing (does not replace explicit Ctrl+S). */
export function scheduleTrackItAutosave(): void {
  if (!isTrackItLinked()) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveToTrackItParent({ silent: true });
  }, 60_000);
}

export function loadTrackItDrawingAutosave(drawingId: string): boolean {
  return useSchematicStore.getState().loadAutosaveFromKey(trackItAutosaveKey(drawingId));
}

/** Empty canvas for a linked plant drawing (no legacy demo / other drawing content). */
export function beginBlankTrackItDrawing(link: TrackItLinkContext): void {
  const store = useSchematicStore.getState();
  store.newSchematic();
  store.setTrackItLink(link);
  const drawingName = link.drawingName?.trim();
  if (drawingName) {
    store.setSchematicName(drawingName);
  }
  useSchematicStore.setState({ isDemo: false });
}

export function applyTrackItLink(link: TrackItLinkContext): void {
  if (!link?.drawingId) return;
  const store = useSchematicStore.getState();
  const switched = store.trackItLink?.drawingId !== link.drawingId;

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
      useSchematicStore.setState({ isDemo: false });
    }
  } else {
    store.setTrackItLink(link);
    const drawingName = link.drawingName?.trim();
    if (drawingName) {
      store.setSchematicName(drawingName);
    }
  }

  store.addToast(
    `Linked to trackIT DWG ${link.dwgNumber} — Ctrl+S saves to the drawing (not just a local file)`,
    "info",
    6000,
  );
}
