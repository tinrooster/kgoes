export type WorkspacePanelId =
  | "devices"
  | "viewOptions"
  | "trackItNumbers"
  | "showInfo"
  | "colors"
  | "cadTools"
  | "inspector"
  | "canvasToolbar";

export type PanelDockEdge = "left" | "right" | "top" | "bottom" | "float";

export interface WorkspacePanelLayout {
  edge: PanelDockEdge;
  floatX: number;
  floatY: number;
}

export const WORKSPACE_PANEL_LABELS: Record<WorkspacePanelId, string> = {
  devices: "Devices",
  viewOptions: "View options",
  trackItNumbers: "trackIT numbers",
  showInfo: "Show info",
  colors: "Colors",
  cadTools: "CAD tools",
  inspector: "Inspector",
  canvasToolbar: "Canvas toolbar",
};

export const DEFAULT_PANEL_LAYOUTS: Record<WorkspacePanelId, WorkspacePanelLayout> = {
  devices: { edge: "left", floatX: 16, floatY: 72 },
  viewOptions: { edge: "right", floatX: 96, floatY: 72 },
  trackItNumbers: { edge: "right", floatX: 112, floatY: 88 },
  showInfo: { edge: "right", floatX: 128, floatY: 104 },
  colors: { edge: "right", floatX: 144, floatY: 120 },
  cadTools: { edge: "right", floatX: 160, floatY: 136 },
  inspector: { edge: "right", floatX: 200, floatY: 72 },
  canvasToolbar: { edge: "float", floatX: 14, floatY: 14 },
};

export const SNAP_EDGE_PX = 52;

const ALL_PANEL_IDS = Object.keys(DEFAULT_PANEL_LAYOUTS) as WorkspacePanelId[];

function sanitizeLayout(id: WorkspacePanelId, layout: WorkspacePanelLayout): WorkspacePanelLayout {
  if (id === "inspector" && layout.edge === "float") {
    const offScreen = layout.floatX < 0 || layout.floatY < 0 || layout.floatX > 1600 || layout.floatY > 900;
    if (offScreen) return { ...DEFAULT_PANEL_LAYOUTS.inspector };
  }
  if (id === "inspector" && (layout.edge === "top" || layout.edge === "bottom")) {
    return { ...layout, edge: "right" };
  }
  return layout;
}

export function normalizePanelLayouts(
  raw: Partial<Record<WorkspacePanelId, Partial<WorkspacePanelLayout>>> | undefined,
): Record<WorkspacePanelId, WorkspacePanelLayout> {
  const out = { ...DEFAULT_PANEL_LAYOUTS };
  if (!raw) return out;
  for (const id of ALL_PANEL_IDS) {
    const item = raw[id];
    if (!item || typeof item !== "object") continue;
    const edge =
      item.edge === "left" ||
      item.edge === "right" ||
      item.edge === "top" ||
      item.edge === "bottom" ||
      item.edge === "float"
        ? item.edge
        : out[id].edge;
    out[id] = sanitizeLayout(id, {
      edge,
      floatX: typeof item.floatX === "number" && Number.isFinite(item.floatX) ? item.floatX : out[id].floatX,
      floatY: typeof item.floatY === "number" && Number.isFinite(item.floatY) ? item.floatY : out[id].floatY,
    });
  }
  return out;
}

/** Inspector is always on the right rail when collapsed; when open follows dock edge. */
export function resolveInspectorPlacement(
  edge: PanelDockEdge,
  open: boolean,
): "right" | "left" | "float" {
  if (!open) return "right";
  if (edge === "left") return "left";
  if (edge === "float") return "float";
  return "right";
}

/** Pick dock edge when pointer is near workspace boundary; otherwise float. */
export function resolveSnapEdge(
  clientX: number,
  clientY: number,
  workspaceRect: DOMRect,
  panelId: WorkspacePanelId,
): PanelDockEdge {
  const left = clientX - workspaceRect.left;
  const right = workspaceRect.right - clientX;
  const top = clientY - workspaceRect.top;
  const bottom = workspaceRect.bottom - clientY;
  const distances: { edge: PanelDockEdge; d: number }[] = [
    { edge: "left", d: left },
    { edge: "right", d: right },
    { edge: "top", d: top },
    { edge: "bottom", d: bottom },
  ];
  distances.sort((a, b) => a.d - b.d);
  const nearest = distances[0];
  if (!nearest || nearest.d > SNAP_EDGE_PX) return "float";

  if (panelId === "canvasToolbar") {
    if (nearest.edge === "top" || nearest.edge === "bottom") return nearest.edge;
    return "float";
  }

  if (nearest.edge === "left" || nearest.edge === "right") return nearest.edge;
  return "float";
}

export function clampFloatPosition(
  x: number,
  y: number,
  workspaceRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
): { x: number; y: number } {
  const pad = 8;
  const maxX = Math.max(pad, workspaceRect.width - panelWidth - pad);
  const maxY = Math.max(pad, workspaceRect.height - panelHeight - pad);
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}
