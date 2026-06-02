/** Persist tower elevation pan/zoom per page + view (survives tab switches and reload). */

export type TowerDraftViewportState = {
  zoom: number;
  pan: { x: number; y: number };
};

const STORAGE_KEY = "kgo-es-tower-draft-viewport-v1";
const MAX_ENTRIES = 48;

function readAll(): Record<string, TowerDraftViewportState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TowerDraftViewportState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, TowerDraftViewportState>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export const TOWER_DRAFT_ALL_FACES_VIEW = "all-faces";

const SINGLE_FACE_VIEWS = new Set(["N", "E", "S", "W"]);

export function towerDraftViewportStorageKey(pageId: string, elevationView: string): string {
  return `${pageId}:${elevationView}`;
}

/** Single-face views inherit all-faces pan/zoom until the user sets a face-specific view. */
export function loadTowerDraftViewportForView(
  pageId: string,
  elevationView: string,
): TowerDraftViewportState | null {
  const own = loadTowerDraftViewport(towerDraftViewportStorageKey(pageId, elevationView));
  if (own) return own;
  if (SINGLE_FACE_VIEWS.has(elevationView)) {
    return loadTowerDraftViewport(
      towerDraftViewportStorageKey(pageId, TOWER_DRAFT_ALL_FACES_VIEW),
    );
  }
  return null;
}

export function loadTowerDraftViewport(key: string): TowerDraftViewportState | null {
  const entry = readAll()[key];
  if (!entry || typeof entry.zoom !== "number" || !entry.pan) return null;
  if (!Number.isFinite(entry.zoom) || entry.zoom <= 0) return null;
  if (!Number.isFinite(entry.pan.x) || !Number.isFinite(entry.pan.y)) return null;
  return entry;
}

export function saveTowerDraftViewport(key: string, state: TowerDraftViewportState): void {
  const map = readAll();
  map[key] = state;
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) {
      delete map[k];
    }
  }
  writeAll(map);
}
