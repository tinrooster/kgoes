/** Cross-component tower viewport commands (toolbar ↔ elevation canvas). */

export const TOWER_VIEWPORT_SAVE_EVENT = "kgo-es:save-tower-viewport";
export const TOWER_VIEWPORT_APPLY_EVENT = "kgo-es:apply-tower-viewport";
export const TOWER_VIEWPORT_REDEFINE_EVENT = "kgo-es:redefine-tower-viewport";
export const TOWER_VIEWPORT_EDITOR_EVENT = "kgo-es:open-tower-viewport-editor";

export function dispatchOpenTowerViewportEditor(): void {
  window.dispatchEvent(new CustomEvent(TOWER_VIEWPORT_EDITOR_EVENT));
}

export function dispatchSaveTowerViewport(): void {
  window.dispatchEvent(new CustomEvent(TOWER_VIEWPORT_SAVE_EVENT));
}

export function dispatchApplyTowerViewport(pageId: string, viewportId: string): void {
  window.dispatchEvent(
    new CustomEvent(TOWER_VIEWPORT_APPLY_EVENT, { detail: { pageId, viewportId } }),
  );
}

export function dispatchRedefineTowerViewport(pageId: string, viewportId: string): void {
  window.dispatchEvent(
    new CustomEvent(TOWER_VIEWPORT_REDEFINE_EVENT, { detail: { pageId, viewportId } }),
  );
}
