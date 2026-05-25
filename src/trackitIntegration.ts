/**
 * trackIT popup integration — save back to plant_drawings via postMessage.
 * See trackIT: docs/easyschematic-writeback-protocol.md
 */

import { useSchematicStore } from "./store";
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

export function isTrackItLinked(): boolean {
  const link = useSchematicStore.getState().trackItLink;
  if (link?.drawingId) return true;
  try {
    return !!(typeof window !== "undefined" && window.opener && !window.opener.closed);
  } catch {
    return false;
  }
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

export function applyTrackItLink(link: TrackItLinkContext): void {
  useSchematicStore.getState().setTrackItLink(link);
  useSchematicStore.getState().addToast(
    `Linked to trackIT DWG ${link.dwgNumber} — Ctrl+S saves to the drawing (not just a local file)`,
    "info",
    6000,
  );
}
