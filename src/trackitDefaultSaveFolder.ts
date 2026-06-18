/**
 * trackIT default-save-folder + local export feedback (postMessage from opener).
 */
import { publishKgoSaveFeedback, clearKgoSaveFeedback } from "./kgoSaveFeedbackStore";
import { useSchematicStore } from "./store";

export type TrackItDefaultSaveFolderPayload = {
  folderLinked: boolean;
  folderName?: string;
  backupPath?: string;
  dualWrite: boolean;
  delegateSaveToParent: boolean;
};

export type LocalCopyWriteResult = {
  synced: boolean;
  path?: string;
  error?: string;
};

export type TrackItLocalExportResultPayload = {
  devPath?: string;
  plantApi?: LocalCopyWriteResult;
  browsed?: LocalCopyWriteResult;
  localSyncError?: string;
};

export const TRACKIT_DEFAULT_SAVE_FOLDER_MESSAGE = "TRACKIT_DEFAULT_SAVE_FOLDER";
export const TRACKIT_LOCAL_EXPORT_RESULT_MESSAGE = "TRACKIT_LOCAL_EXPORT_RESULT";

let defaultSaveFolder: TrackItDefaultSaveFolderPayload | null = null;

export function getTrackItDefaultSaveFolder(): TrackItDefaultSaveFolderPayload | null {
  return defaultSaveFolder;
}

export function applyTrackItDefaultSaveFolder(payload: TrackItDefaultSaveFolderPayload): void {
  defaultSaveFolder = payload;
}

export function applyTrackItLocalExportResult(payload: TrackItLocalExportResultPayload): void {
  const store = useSchematicStore.getState();
  let showed = false;
  let hadError = false;

  if (payload.plantApi?.synced && payload.devPath) {
    store.addToast(`Saved to ${payload.devPath}`, "success", 3500);
    showed = true;
    clearKgoSaveFeedback();
  } else if (payload.plantApi && payload.devPath && !payload.plantApi.synced) {
    const err = payload.plantApi.error?.trim();
    const msg = err ? `Local path not saved — ${err}` : "Local path not saved (plant API)";
    publishKgoSaveFeedback(msg, "error", { title: "Local workstation save failed" });
    store.addToast(msg, "error", 9000);
    showed = true;
    hadError = true;
  }

  if (payload.browsed?.synced) {
    const label = defaultSaveFolder?.folderName?.trim() || "default save folder";
    store.addToast(`Saved to ${label}`, "info", 2500);
    showed = true;
    if (!hadError) clearKgoSaveFeedback();
  } else if (payload.browsed && !payload.browsed.synced) {
    const msg = payload.browsed.error?.trim() || "Default save folder write failed";
    publishKgoSaveFeedback(msg, "error", { title: "Default save folder failed" });
    store.addToast(msg, "error", 7000);
    showed = true;
    hadError = true;
  }

  if (!showed && payload.devPath && payload.localSyncError) {
    const msg = `Local save failed — ${payload.localSyncError}`;
    publishKgoSaveFeedback(msg, "error", { title: "Local save failed" });
    store.addToast(msg, "error", 8000);
  }
}
