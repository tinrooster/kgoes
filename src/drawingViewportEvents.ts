/** Cross-component viewport commands (MenuBar ↔ canvas toolbar). */

export const DRAWING_VIEWPORT_SAVE_EVENT = "kgo-es:save-drawing-viewport";
export const DRAWING_VIEWPORT_APPLY_EVENT = "kgo-es:apply-drawing-viewport";
export const DRAWING_VIEWPORT_REDEFINE_EVENT = "kgo-es:redefine-drawing-viewport";
export const DRAWING_VIEWPORT_EDITOR_EVENT = "kgo-es:open-viewport-editor";

export function dispatchOpenViewportEditor(): void {
  window.dispatchEvent(new CustomEvent(DRAWING_VIEWPORT_EDITOR_EVENT));
}

export function dispatchSaveDrawingViewport(): void {
  window.dispatchEvent(new CustomEvent(DRAWING_VIEWPORT_SAVE_EVENT));
}

export function dispatchApplyDrawingViewport(pageId: string, viewportId: string): void {
  window.dispatchEvent(
    new CustomEvent(DRAWING_VIEWPORT_APPLY_EVENT, { detail: { pageId, viewportId } }),
  );
}

export function dispatchRedefineDrawingViewport(pageId: string, viewportId: string): void {
  window.dispatchEvent(
    new CustomEvent(DRAWING_VIEWPORT_REDEFINE_EVENT, { detail: { pageId, viewportId } }),
  );
}
