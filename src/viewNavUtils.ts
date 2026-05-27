/** Axis-aligned bounds in canvas/content coordinates. */
export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function unionBounds(a: ContentBounds, b: ContentBounds): ContentBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function boundsFromSize(x: number, y: number, w: number, h: number): ContentBounds {
  return { minX: x, minY: y, maxX: x + w, maxY: y + h };
}

/** Compute pan (top-left offset) and zoom to fit content in a viewport element. */
/** Rack elevation canvas bounds (matches RackRenderer layout constants). */
export function rackPageContentBounds(
  racks: { position: { x: number; y: number }; heightU: number }[],
  maxHeightU: number,
): ContentBounds | null {
  if (racks.length === 0) return null;
  const rackW = 260 + 40 + 28;
  const rackH = 40 + 24 + maxHeightU * 24 + 40;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rack of racks) {
    minX = Math.min(minX, rack.position.x);
    minY = Math.min(minY, rack.position.y);
    maxX = Math.max(maxX, rack.position.x + rackW);
    maxY = Math.max(maxY, rack.position.y + rackH);
  }
  return { minX, minY, maxX, maxY };
}

export function computeFitViewport(
  containerWidth: number,
  containerHeight: number,
  bounds: ContentBounds,
  options?: { padding?: number; maxZoom?: number; minZoom?: number },
): { zoom: number; pan: { x: number; y: number } } {
  const padding = options?.padding ?? 48;
  const contentW = Math.max(bounds.maxX - bounds.minX, 1);
  const contentH = Math.max(bounds.maxY - bounds.minY, 1);
  const maxZoom = options?.maxZoom ?? 2;
  const minZoom = options?.minZoom ?? 0.1;
  const zoom = Math.min(
    maxZoom,
    Math.max(
      minZoom,
      Math.min(
        (containerWidth - padding * 2) / contentW,
        (containerHeight - padding * 2) / contentH,
      ),
    ),
  );
  return {
    zoom,
    pan: {
      x: (containerWidth - contentW * zoom) / 2 - bounds.minX * zoom,
      y: (containerHeight - contentH * zoom) / 2 - bounds.minY * zoom,
    },
  };
}
