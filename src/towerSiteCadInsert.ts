import type { ReactFlowInstance } from "@xyflow/react";
import type { AnnotationData, NoteData, SchematicNode } from "./types";
import { GRID_SIZE, useSchematicStore } from "./store";
import {
  buildSitePlanCadSvg,
  buildTowerElevationCadSvg,
  buildTowerSectionCadSvg,
  towerCadContextFrom,
} from "./towerSiteCadSvg";
import {
  insertTowerElevation,
  insertTowerSitePlan,
  viewportFlowCenter,
  type TowerSiteInsertOptions,
} from "./towerSiteInsert";
import { isTrackItDrawingLinked, saveToTrackItParent } from "./trackitIntegration";

export type { TowerSiteInsertOptions };

type CadAnnotationSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  data: AnnotationData;
};

function snap(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
  };
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function placeCadNote(
  html: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  opts?: { locked?: boolean },
): void {
  const pos = snap(position);
  useSchematicStore.getState().addNote(pos);
  const note = useSchematicStore.getState().nodes.filter((n) => n.type === "note").at(-1);
  if (!note) return;
  useSchematicStore.getState().updateNoteHtml(note.id, html);
  const noteData: NoteData = {
    ...(note.data as NoteData),
    html,
    ...(opts?.locked ? { cadLocked: true as const, cadWireframe: true as const } : {}),
  };
  useSchematicStore.setState({
    nodes: useSchematicStore.getState().nodes.map((n) =>
      n.id === note.id ? { ...n, style: { width: size.width, height: size.height }, data: noteData } : n,
    ) as SchematicNode[],
  });
}

function placeCadAnnotations(specs: CadAnnotationSpec[]): void {
  const state = useSchematicStore.getState();
  const newNodes: SchematicNode[] = specs.map((spec) => ({
    id: nextId("annotation"),
    type: "annotation",
    position: snap({ x: spec.x, y: spec.y }),
    data: spec.data,
    style: { width: spec.width, height: spec.height },
  }));
  useSchematicStore.setState({ nodes: [...state.nodes, ...newNodes] });
}

function finishCadInsert(message: string): void {
  const store = useSchematicStore.getState();
  store.saveToLocalStorage();
  if (isTrackItDrawingLinked()) saveToTrackItParent({ silent: true });
  store.addToast(message, "success", 3000);
}

/** CAD wireframe elevation (SVG lattice profile + dimension). */
export function insertTowerCadElevation(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const ctx = towerCadContextFrom(opts);
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const center = viewportFlowCenter(rf);
  const ox = center.x - 200;
  const oy = center.y - 200;

  placeCadNote(
    `<div style="margin:0;padding:4px;background:#fff">${buildTowerElevationCadSvg(ctx)}</div>`,
    { x: ox, y: oy },
    { width: 300, height: 260 },
    { locked: true },
  );

  placeCadAnnotations([
    {
      x: ox + 310,
      y: oy + 40,
      width: 90,
      height: 22,
      data: {
        shape: "dimension",
        label: `${ctx.towerHeightFt}′ AGL`,
        borderColor: "#475569",
        fontSize: 10,
      },
    },
    {
      x: ox - 20,
      y: oy + 220,
      width: 200,
      height: 6,
      data: { shape: "hline", borderColor: "#334155" },
    },
  ]);

  placeCadNote(
    `<p style="margin:0;font-size:11px;line-height:1.35"><strong>Access</strong> · ${ctx.towerCompany}<br/>${ctx.accessNotes.replace(/\n/g, "<br/>")}</p>`,
    { x: ox + 320, y: oy },
    { width: 220, height: 100 },
  );

  finishCadInsert("CAD tower elevation wireframe inserted");
  return true;
}

/** CAD site plan wireframe (SVG plan view). */
export function insertTowerCadSitePlan(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const ctx = towerCadContextFrom(opts);
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const center = viewportFlowCenter(rf);
  const ox = center.x - 220;
  const oy = center.y - 160;

  placeCadNote(
    `<div style="margin:0;padding:4px;background:#fff">${buildSitePlanCadSvg(ctx)}</div>`,
    { x: ox, y: oy },
    { width: 380, height: 280 },
    { locked: true },
  );

  finishCadInsert("CAD site plan wireframe inserted");
  return true;
}

/** CAD tower section wireframe (looking up — sector bearings). */
export function insertTowerCadSection(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const ctx = towerCadContextFrom(opts);
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const center = viewportFlowCenter(rf);
  const ox = center.x - 160;
  const oy = center.y - 120;

  placeCadNote(
    `<div style="margin:0;padding:4px;background:#fff">${buildTowerSectionCadSvg(ctx)}</div>`,
    { x: ox, y: oy },
    { width: 300, height: 260 },
    { locked: true },
  );

  finishCadInsert("CAD tower section wireframe inserted");
  return true;
}

/** Symbolic library blocks plus CAD SVG wireframes on one sheet. */
export function insertTowerCadFullSheet(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  insertTowerSitePlan(rf, opts);
  insertTowerElevation(rf, opts);
  insertTowerCadSitePlan(rf, opts);
  insertTowerCadElevation(rf, opts);
  finishCadInsert("Mountaintop sheet: symbols + CAD wireframes");
  return true;
}

/** Place a resizable dimension line at the viewport center. */
export function insertCadDimensionLine(
  rf: ReactFlowInstance,
  label = "150′",
): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  placeCadAnnotations([
    {
      x: c.x - 80,
      y: c.y,
      width: 160,
      height: 22,
      data: { shape: "dimension", label, borderColor: "#475569", fontSize: 10 },
    },
  ]);
  finishCadInsert("Dimension line added");
  return true;
}

/** Dashed fence / compound outline. */
export function insertCadFenceFrame(
  rf: ReactFlowInstance,
  size?: { width?: number; height?: number },
): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  const width = Math.max(80, size?.width ?? 360);
  const height = Math.max(80, size?.height ?? 240);
  placeCadAnnotations([
    {
      x: c.x - width / 2,
      y: c.y - height / 2,
      width,
      height,
      data: { shape: "frame-dashed", borderColor: "#64748b" },
    },
  ]);
  finishCadInsert("Dashed site fence frame added");
  return true;
}

/** North arrow symbol at viewport center. */
export function insertCadNorthArrow(rf: ReactFlowInstance): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  placeCadAnnotations([
    {
      x: c.x - 24,
      y: c.y - 40,
      width: 48,
      height: 56,
      data: { shape: "north-arrow", borderColor: "#334155", fontSize: 10 },
    },
  ]);
  finishCadInsert("North arrow added");
  return true;
}

/** Graphic scale bar with optional label (e.g. 100′). */
export function insertCadScaleBar(rf: ReactFlowInstance, label = "100′"): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  placeCadAnnotations([
    {
      x: c.x - 100,
      y: c.y + 40,
      width: 200,
      height: 28,
      data: { shape: "scale-bar", label, borderColor: "#475569", fontSize: 9 },
    },
  ]);
  finishCadInsert("Scale bar added");
  return true;
}

/** Leader / callout with elbow. */
export function insertCadLeader(rf: ReactFlowInstance, label = "Callout"): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  placeCadAnnotations([
    {
      x: c.x - 60,
      y: c.y - 20,
      width: 140,
      height: 72,
      data: { shape: "leader", label, borderColor: "#334155", fontSize: 10 },
    },
  ]);
  finishCadInsert("Leader / callout added");
  return true;
}

/** Diagonal line segment (guy wire, roof line, etc.). */
export function insertCadDiagonalLine(rf: ReactFlowInstance): boolean {
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const c = viewportFlowCenter(rf);
  placeCadAnnotations([
    {
      x: c.x - 70,
      y: c.y - 50,
      width: 140,
      height: 100,
      data: { shape: "dline", borderColor: "#334155" },
    },
  ]);
  finishCadInsert("Diagonal line added");
  return true;
}
