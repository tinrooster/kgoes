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

const DEFAULT_NODE_W = 180;
const DEFAULT_NODE_H = 60;

/** Axis-aligned bounds of all schematic nodes (accounts for room parenting). */
export function computeSchematicContentBounds(
  nodes: {
    id: string;
    position: { x: number; y: number };
    parentId?: string;
    measured?: { width?: number; height?: number };
  }[],
  padding = 40,
): ContentBounds | null {
  if (nodes.length === 0) return null;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  const absPos = (nodeId: string): { x: number; y: number } => {
    const node = byId.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    let x = node.position.x;
    let y = node.position.y;
    let parentId = node.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      parentId = parent.parentId;
    }
    return { x, y };
  };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const { x, y } = absPos(n.id);
    const w = n.measured?.width ?? DEFAULT_NODE_W;
    const h = n.measured?.height ?? DEFAULT_NODE_H;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

export function contentBoundsAspect(bounds: ContentBounds): number {
  const w = Math.max(bounds.maxX - bounds.minX, 1);
  const h = Math.max(bounds.maxY - bounds.minY, 1);
  return w / h;
}

/** Compute pan (top-left offset) and zoom to fit content in a viewport element. */
/** Rack elevation canvas bounds (matches RackRenderer layout constants). */
const RACK_PAGE_RACK_W = 260 + 40 + 28;
const RACK_PAGE_RACK_H_PAD = 40 + 24 + 40;

export function rackFootprintSize(maxHeightU: number): { width: number; height: number } {
  return {
    width: RACK_PAGE_RACK_W,
    height: RACK_PAGE_RACK_H_PAD + maxHeightU * 24,
  };
}

export function rackPageContentBounds(
  racks: { position: { x: number; y: number }; heightU: number }[],
  maxHeightU: number,
): ContentBounds | null {
  if (racks.length === 0) return null;
  const { width: rackW, height: rackH } = rackFootprintSize(maxHeightU);
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

/** Bounds for a single rack column (focus / zoom one rack). */
export function rackContentBoundsForRack(
  rack: { position: { x: number; y: number }; heightU: number },
  maxHeightU: number,
  padding = 32,
): ContentBounds {
  const { width: rackW, height: rackH } = rackFootprintSize(maxHeightU);
  return {
    minX: rack.position.x - padding,
    minY: rack.position.y - padding,
    maxX: rack.position.x + rackW + padding,
    maxY: rack.position.y + rackH + padding,
  };
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
