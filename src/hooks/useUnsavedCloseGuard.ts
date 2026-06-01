import { useEffect } from "react";
import { useSchematicStore } from "../store";

const TRACKIT_DIRTY_MESSAGE = "KGO_ES_DIRTY";
const TRACKIT_CLEAN_MESSAGE = "KGO_ES_CLEAN";

function notifyTrackItOpenerDirty(dirty: boolean): void {
  try {
    if (!window.opener || window.opener.closed) return;
    window.opener.postMessage({ type: dirty ? TRACKIT_DIRTY_MESSAGE : TRACKIT_CLEAN_MESSAGE }, "*");
  } catch {
    // cross-origin
  }
}

/** Warn before closing the tab/window when the schematic has unsaved edits. */
export function useUnsavedCloseGuard(): void {
  const undoSize = useSchematicStore((s) => s.undoSize);
  const shouldWarn = undoSize > 0;

  useEffect(() => {
    notifyTrackItOpenerDirty(shouldWarn);
  }, [shouldWarn]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [shouldWarn]);
}
