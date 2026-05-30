import type { ReactFlowInstance } from "@xyflow/react";
import { GRID_SIZE, useSchematicStore } from "./store";
import { getTemplateById } from "./templateApi";
import { TOWER_SITE_TEMPLATE_IDS } from "./towerSiteTemplateIds";
import { isTrackItDrawingLinked, saveToTrackItParent } from "./trackitIntegration";

export type TowerSiteInsertOptions = {
  siteName?: string;
  siteCode?: string;
  towerHeightFt?: number;
  towerCompany?: string;
  accessNotes?: string;
  elevationFt?: number;
};

function snap(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
  };
}

export function viewportFlowCenter(rf: ReactFlowInstance): { x: number; y: number } {
  const viewport = rf.getViewport();
  const x = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
  const y = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
  return snap({ x, y });
}

function layoutContext(opts: TowerSiteInsertOptions) {
  const towerHeightFt = opts.towerHeightFt ?? 150;
  const towerCompany = opts.towerCompany?.trim() || "Tower company TBD";
  const accessHtml = opts.accessNotes?.trim()
    ? opts.accessNotes.trim().replace(/\n/g, "<br/>")
    : "Gate / lock codes and visit procedure — add in trackIT Mountaintops catalog.";
  const elevationLabel =
    opts.elevationFt != null
      ? `${opts.elevationFt.toLocaleString()} ft AMSL`
      : "site elevation TBD";
  return {
    siteName: opts.siteName?.trim() || "Mountaintop site",
    siteCode: opts.siteCode?.trim() || "SITE",
    towerHeightFt,
    towerCompany,
    accessHtml,
    elevationLabel,
  };
}

function placeDevice(templateId: string, position: { x: number; y: number }, designation?: string): boolean {
  const template = getTemplateById(templateId);
  if (!template) return false;
  const store = useSchematicStore.getState();
  store.addDevice(template, snap(position));
  if (designation) {
    const node = useSchematicStore.getState().nodes.filter((n) => n.type === "device").at(-1);
    if (node?.type === "device") {
      useSchematicStore.getState().batchPatchDeviceData([{ nodeId: node.id, patch: { designation } }]);
    }
  }
  return true;
}

function placeNote(
  html: string,
  position: { x: number; y: number },
  size: { width: number; height: number } = { width: 240, height: 120 },
): void {
  const pos = snap(position);
  useSchematicStore.getState().addNote(pos);
  const note = useSchematicStore.getState().nodes.filter((n) => n.type === "note").at(-1);
  if (!note) return;
  useSchematicStore.getState().updateNoteHtml(note.id, html);
  useSchematicStore.setState({
    nodes: useSchematicStore.getState().nodes.map((n) =>
      n.id === note.id ? { ...n, style: { width: size.width, height: size.height } } : n,
    ),
  });
}

function finishInsert(): void {
  const store = useSchematicStore.getState();
  store.saveToLocalStorage();
  if (isTrackItDrawingLinked()) {
    saveToTrackItParent({ silent: true });
  }
  store.addToast("Tower site layout inserted", "success", 2800);
}

/** Site plan: compound room, shelter, gate, generator, transformer, tower base, cable tray. */
export function insertTowerSitePlan(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const ctx = layoutContext(opts);
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const center = viewportFlowCenter(rf);
  const ox = center.x - 420;
  const oy = center.y - 180;

  store.addRoom(`${ctx.siteName} compound`, snap({ x: ox, y: oy }));
  placeNote(
    `<p><strong>${ctx.siteName}</strong> (${ctx.siteCode})</p><p><strong>Site plan</strong> · ref. ${ctx.elevationLabel}</p>`,
    { x: ox + 20, y: oy - 100 },
    { width: 320, height: 100 },
  );
  placeDevice(TOWER_SITE_TEMPLATE_IDS.gate, { x: ox + 40, y: oy + 220 }, "Gate");
  placeDevice(TOWER_SITE_TEMPLATE_IDS.shelter, { x: ox + 100, y: oy + 60 }, "Shelter");
  placeDevice(TOWER_SITE_TEMPLATE_IDS.generatorPad, { x: ox + 100, y: oy + 200 }, "Generator");
  placeDevice(TOWER_SITE_TEMPLATE_IDS.transformerPad, { x: ox - 80, y: oy + 120 }, "Transformer");
  placeDevice(TOWER_SITE_TEMPLATE_IDS.cableTray, { x: ox + 300, y: oy + 140 });
  placeDevice(TOWER_SITE_TEMPLATE_IDS.lattice, { x: ox + 480, y: oy + 80 }, "Tower base");
  placeNote(
    `<p><strong>Access &amp; tower company</strong></p><p><em>${ctx.towerCompany}</em></p><p>${ctx.accessHtml}</p>`,
    { x: ox + 480, y: oy - 80 },
    { width: 300, height: 140 },
  );
  finishInsert();
  return true;
}

/** Elevation profile: stacked lattice bays, platforms, top lights, STL dish placeholder. */
export function insertTowerElevation(
  rf: ReactFlowInstance,
  opts: TowerSiteInsertOptions = {},
): boolean {
  const ctx = layoutContext(opts);
  const store = useSchematicStore.getState();
  store.pushSnapshot();
  const center = viewportFlowCenter(rf);
  const baseX = center.x - 80;
  let y = center.y + 200;
  const bayStep = 100;

  placeNote(
    `<p><strong>${ctx.siteName}</strong> · tower elevation</p><p>~${ctx.towerHeightFt.toLocaleString()} ft self-support · ${ctx.elevationLabel}</p>`,
    { x: baseX - 200, y: y - bayStep * 5 - 80 },
    { width: 300, height: 110 },
  );
  placeNote(
    `<p><strong>Access &amp; tower company</strong></p><p><em>${ctx.towerCompany}</em></p><p>${ctx.accessHtml}</p>`,
    { x: baseX + 200, y: y - bayStep * 5 - 80 },
    { width: 300, height: 140 },
  );

  const heights = [
    { label: "Base / shelter feeds", ft: 0 },
    { label: `~${Math.round(ctx.towerHeightFt * 0.25).toLocaleString()} ft`, ft: 0.25 },
    { label: `~${Math.round(ctx.towerHeightFt * 0.5).toLocaleString()} ft`, ft: 0.5 },
    { label: `~${Math.round(ctx.towerHeightFt * 0.75).toLocaleString()} ft`, ft: 0.75 },
  ];

  for (const band of heights) {
    placeDevice(TOWER_SITE_TEMPLATE_IDS.lattice, { x: baseX, y }, band.label);
    if (band.ft === 0.25 || band.ft === 0.75) {
      placeDevice(TOWER_SITE_TEMPLATE_IDS.restPlatform, { x: baseX + 200, y: y + 20 });
    }
    y -= bayStep;
  }

  placeDevice(TOWER_SITE_TEMPLATE_IDS.obstructionLight, { x: baseX, y: y - 20 }, "Top");
  y -= bayStep;
  const dishTpl = getTemplateById("kgo-rf-mw-0001-0000-4000-8000-000000000001");
  if (dishTpl) {
    store.addDevice(dishTpl, snap({ x: baseX + 40, y: y - 40 }));
    const node = store.nodes.filter((n) => n.type === "device").at(-1);
    if (node?.type === "device") {
      store.batchPatchDeviceData([
        { nodeId: node.id, patch: { designation: `${ctx.siteCode} STL` } },
      ]);
    }
  }
  placeNote(
    "<p><strong>Template tools</strong></p><p>Insert → tower blocks to add bays. Drag microwave / RF gear onto levels.</p>",
    { x: baseX - 200, y: center.y + 240 },
    { width: 280, height: 90 },
  );

  finishInsert();
  return true;
}
