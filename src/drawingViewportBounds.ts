import type { DrawingViewportPreset, SchematicNode } from "./types";
import { boundsForDrawingViewport } from "./drawingPageUtils";
import {
  computeFitViewport,
  computeSchematicContentBounds,
  unionBounds,
  type ContentBounds,
} from "./viewNavUtils";

/** Visible flow-space rectangle for a React Flow viewport on a given canvas size. */
export function flowBoundsFromViewport(
  viewport: { x: number; y: number; zoom: number },
  containerWidth: number,
  containerHeight: number,
): ContentBounds {
  const z = Math.max(viewport.zoom, 1e-6);
  return {
    minX: -viewport.x / z,
    minY: -viewport.y / z,
    maxX: (containerWidth - viewport.x) / z,
    maxY: (containerHeight - viewport.y) / z,
  };
}

/**
 * React Flow viewport for a flow-space rectangle.
 * With `exact: true` (or padding 0), the visible flow rect matches bounds exactly —
 * required for viewport editor round-trip. `computeFitViewport` letterboxes and must
 * only be used for "fit content" presets (overview / room).
 */
export function viewportFromFlowBounds(
  bounds: ContentBounds,
  containerWidth: number,
  containerHeight: number,
  options?: { padding?: number; maxZoom?: number; minZoom?: number; exact?: boolean },
): { x: number; y: number; zoom: number } {
  const padding = options?.padding ?? 0;
  const maxZoom = options?.maxZoom ?? 2;
  const minZoom = options?.minZoom ?? 0.05;
  const useExact = options?.exact ?? padding === 0;

  if (useExact) {
    const contentW = Math.max(bounds.maxX - bounds.minX, 1);
    const contentH = Math.max(bounds.maxY - bounds.minY, 1);
    const zoomX = containerWidth / contentW;
    const zoomY = containerHeight / contentH;
    // Inverse of flowBoundsFromViewport — width-led; editor locks box aspect to the pane.
    let zoom = zoomX;
    if (Math.abs(zoomX - zoomY) / Math.max(zoomX, zoomY, 1e-6) > 0.02) {
      zoom = (zoomX + zoomY) / 2;
    }
    zoom = Math.min(maxZoom, Math.max(minZoom, zoom));
    return {
      x: -bounds.minX * zoom,
      y: -bounds.minY * zoom,
      zoom,
    };
  }

  const { zoom, pan } = computeFitViewport(containerWidth, containerHeight, bounds, options);
  return { x: pan.x, y: pan.y, zoom };
}

/** Size of the React Flow pane (visible drawing area). */
export function getSchematicCanvasSize(): { w: number; h: number } {
  const pane = document.querySelector(".react-flow__pane") as HTMLElement | null;
  if (pane && pane.clientWidth > 0 && pane.clientHeight > 0) {
    return { w: pane.clientWidth, h: pane.clientHeight };
  }
  const root = document.querySelector(".react-flow") as HTMLElement | null;
  if (root && root.clientWidth > 0 && root.clientHeight > 0) {
    return { w: root.clientWidth, h: root.clientHeight };
  }
  const fallback = document.querySelector(".react-flow__viewport")?.parentElement;
  if (fallback && fallback.clientWidth > 0 && fallback.clientHeight > 0) {
    return { w: fallback.clientWidth, h: fallback.clientHeight };
  }
  return { w: 1200, h: 800 };
}

export function presetFlowBounds(
  preset: DrawingViewportPreset,
  nodes: SchematicNode[],
  containerWidth: number,
  containerHeight: number,
): ContentBounds | null {
  if (preset.fit === "custom" && preset.viewport) {
    return flowBoundsFromViewport(preset.viewport, containerWidth, containerHeight);
  }
  return boundsForDrawingViewport(preset, nodes);
}

export interface EditorLayout {
  world: ContentBounds;
  scale: number;
  offsetX: number;
  offsetY: number;
  pad: number;
}

export function buildEditorLayout(
  world: ContentBounds,
  width: number,
  height: number,
  pad = 40,
): EditorLayout {
  const worldW = Math.max(world.maxX - world.minX, 1);
  const worldH = Math.max(world.maxY - world.minY, 1);
  const innerW = Math.max(width - pad * 2, 1);
  const innerH = Math.max(height - pad * 2, 1);
  const scale = Math.min(innerW / worldW, innerH / worldH);
  const contentW = worldW * scale;
  const contentH = worldH * scale;
  const offsetX = pad + (innerW - contentW) / 2 - world.minX * scale;
  const offsetY = pad + (innerH - contentH) / 2 - world.minY * scale;
  return { world, scale, offsetX, offsetY, pad };
}

/** Pixel rect of the fitted world in editor coordinates (for frame / clip). */
export function editorWorldPixelRect(layout: EditorLayout) {
  const tl = flowToEditor(layout.world.minX, layout.world.minY, layout);
  const br = flowToEditor(layout.world.maxX, layout.world.maxY, layout);
  return {
    left: tl.x,
    top: tl.y,
    width: br.x - tl.x,
    height: br.y - tl.y,
  };
}

function expandBounds(bounds: ContentBounds, margin: number): ContentBounds {
  return {
    minX: bounds.minX - margin,
    minY: bounds.minY - margin,
    maxX: bounds.maxX + margin,
    maxY: bounds.maxY + margin,
  };
}

/**
 * World extent for the viewport map: nodes + every viewport box + optional live view,
 * so the overview fits entirely in the editor pane.
 */
export function editorMapWorldBounds(
  nodes: SchematicNode[],
  viewportPresets: DrawingViewportPreset[],
  canvasSize: { w: number; h: number },
  boundsById: Record<string, ContentBounds> = {},
  liveBounds?: ContentBounds | null,
): ContentBounds {
  let world = editorWorldBounds(nodes, 48);
  for (const preset of viewportPresets) {
    const b =
      boundsById[preset.id] ??
      presetFlowBounds(preset, nodes, canvasSize.w, canvasSize.h);
    if (b) world = unionBounds(world, b);
  }
  if (liveBounds) world = unionBounds(world, liveBounds);
  const span = Math.max(world.maxX - world.minX, world.maxY - world.minY, 1);
  return expandBounds(world, Math.max(56, span * 0.04));
}

export function flowToEditor(
  fx: number,
  fy: number,
  layout: EditorLayout,
): { x: number; y: number } {
  return { x: fx * layout.scale + layout.offsetX, y: fy * layout.scale + layout.offsetY };
}

export function editorToFlow(
  sx: number,
  sy: number,
  layout: EditorLayout,
): { x: number; y: number } {
  return { x: (sx - layout.offsetX) / layout.scale, y: (sy - layout.offsetY) / layout.scale };
}

export function boundsToEditorRect(bounds: ContentBounds, layout: EditorLayout) {
  const tl = flowToEditor(bounds.minX, bounds.minY, layout);
  const br = flowToEditor(bounds.maxX, bounds.maxY, layout);
  return {
    left: tl.x,
    top: tl.y,
    width: Math.max(br.x - tl.x, 4),
    height: Math.max(br.y - tl.y, 4),
  };
}

const DEFAULT_NODE_W = 180;
const DEFAULT_NODE_H = 60;

export interface SchematicNodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "room" | "other";
  label: string;
}

/** Absolute node boxes for the viewport editor minimap. */
export function schematicNodeRects(nodes: SchematicNode[]): SchematicNodeRect[] {
  if (nodes.length === 0) return [];
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

  return nodes.map((n) => {
    const { x, y } = absPos(n.id);
    const w = n.measured?.width ?? (n.type === "room" ? n.width ?? 400 : DEFAULT_NODE_W);
    const h = n.measured?.height ?? (n.type === "room" ? n.height ?? 300 : DEFAULT_NODE_H);
    const label =
      n.type === "room"
        ? String((n.data as { label?: string })?.label ?? "Room")
        : String((n.data as { label?: string })?.label ?? n.type);
    return {
      id: n.id,
      x,
      y,
      w: typeof w === "number" ? w : DEFAULT_NODE_W,
      h: typeof h === "number" ? h : DEFAULT_NODE_H,
      kind: n.type === "room" ? "room" : "other",
      label,
    };
  });
}

export function editorWorldBounds(nodes: SchematicNode[], extraPad = 80): ContentBounds {
  const content = computeSchematicContentBounds(nodes, 40);
  if (!content) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }
  return {
    minX: content.minX - extraPad,
    minY: content.minY - extraPad,
    maxX: content.maxX + extraPad,
    maxY: content.maxY + extraPad,
  };
}

export function clampBoundsToWorld(bounds: ContentBounds, world: ContentBounds): ContentBounds {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  let minX = Math.max(world.minX, Math.min(bounds.minX, world.maxX - w));
  let minY = Math.max(world.minY, Math.min(bounds.minY, world.maxY - h));
  return { minX, minY, maxX: minX + w, maxY: minY + h };
}

export function resizeBoundsSE(
  bounds: ContentBounds,
  flowX: number,
  flowY: number,
  aspect: number,
  minFlowSize = 120,
): ContentBounds {
  let w = Math.max(flowX - bounds.minX, minFlowSize);
  let h = Math.max(flowY - bounds.minY, minFlowSize);
  if (w / h > aspect) w = h * aspect;
  else h = w / aspect;
  return { minX: bounds.minX, minY: bounds.minY, maxX: bounds.minX + w, maxY: bounds.minY + h };
}

export function translateBounds(bounds: ContentBounds, dx: number, dy: number): ContentBounds {
  return {
    minX: bounds.minX + dx,
    minY: bounds.minY + dy,
    maxX: bounds.maxX + dx,
    maxY: bounds.maxY + dy,
  };
}

/** Distinct fill/border colors per viewport index. */
export const VIEWPORT_EDITOR_COLORS = [
  { stroke: "var(--ti-accent)", fill: "color-mix(in oklab, var(--ti-accent) 22%, transparent)" },
  { stroke: "var(--ti-success)", fill: "color-mix(in oklab, var(--ti-success) 20%, transparent)" },
  { stroke: "var(--ti-warning)", fill: "color-mix(in oklab, var(--ti-warning) 22%, transparent)" },
  { stroke: "var(--ti-danger)", fill: "color-mix(in oklab, var(--ti-danger) 18%, transparent)" },
  { stroke: "oklch(55% 0.14 280)", fill: "color-mix(in oklab, oklch(55% 0.14 280) 18%, transparent)" },
  { stroke: "oklch(50% 0.12 200)", fill: "color-mix(in oklab, oklch(50% 0.12 200) 18%, transparent)" },
];
