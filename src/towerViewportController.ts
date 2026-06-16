export type TowerViewportHandle = {
  getViewport: () => { zoom: number; pan: { x: number; y: number } };
  applyViewport: (vp: { zoom: number; pan: { x: number; y: number } }) => void;
  fitOverview: () => void;
  getElevationView: () => string;
};

const handles = new Map<string, TowerViewportHandle>();

export function registerTowerViewportHandle(pageId: string, handle: TowerViewportHandle | null): void {
  if (handle) handles.set(pageId, handle);
  else handles.delete(pageId);
}

export function getTowerViewportHandle(pageId: string | undefined): TowerViewportHandle | undefined {
  if (!pageId) return undefined;
  return handles.get(pageId);
}
