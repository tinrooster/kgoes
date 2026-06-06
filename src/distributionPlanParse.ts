/**
 * Parse / serialize distribution plans in KGO-ES (no Zod — mirrors trackIT schema).
 */

import {
  DISTRIBUTION_PLAN_VERSION,
  type DistributionPlan,
} from "./distributionPlan";

export type ParseDistributionPlanResult =
  | { ok: true; plan: DistributionPlan }
  | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function err(errors: string[], msg: string): ParseDistributionPlanResult {
  return { ok: false, errors: [...errors, msg] };
}

export function parseDistributionPlanJson(raw: unknown): ParseDistributionPlanResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return err(errors, "Plan must be a JSON object.");
  if (raw.version !== DISTRIBUTION_PLAN_VERSION) {
    return err(errors, `version must be ${DISTRIBUTION_PLAN_VERSION}.`);
  }
  if (!isRecord(raw.layout) || raw.layout.kind !== "grid") {
    return err(errors, "layout.kind must be \"grid\".");
  }
  const layout = raw.layout;
  const columns = layout.columns;
  const rowCount = layout.rowCount;
  if (typeof columns !== "number" || columns < 1) return err(errors, "layout.columns must be a positive number.");
  if (typeof rowCount !== "number" || rowCount < 1) return err(errors, "layout.rowCount must be a positive number.");
  if (typeof layout.designationPrefix !== "string" || !layout.designationPrefix.trim()) {
    return err(errors, "layout.designationPrefix is required.");
  }
  if (typeof layout.masterDesignation !== "string" || !layout.masterDesignation.trim()) {
    return err(errors, "layout.masterDesignation is required.");
  }
  const pathOrder = layout.pathOrder;
  if (pathOrder !== "row-major" && pathOrder !== "col-major") {
    return err(errors, "layout.pathOrder must be row-major or col-major.");
  }

  if (!isRecord(raw.jackFields)) return err(errors, "jackFields is required.");
  const jf = raw.jackFields;
  if (typeof jf.bottomU !== "number" || jf.bottomU < 1) return err(errors, "jackFields.bottomU must be >= 1.");
  const ports = jf.portsPerPanel;
  if (ports !== 12 && ports !== 24 && ports !== 48) {
    return err(errors, "jackFields.portsPerPanel must be 12, 24, or 48.");
  }

  if (!isRecord(raw.lengthModel) || raw.lengthModel.kind !== "hub-serpentine") {
    return err(errors, "lengthModel.kind must be \"hub-serpentine\".");
  }
  const lm = raw.lengthModel;
  for (const key of ["baseFt", "incrementFt", "crossoverExtraFt"] as const) {
    if (typeof lm[key] !== "number" || lm[key] <= 0) return err(errors, `lengthModel.${key} must be positive.`);
  }
  if (typeof lm.crossoverAfterRack !== "number" || lm.crossoverAfterRack < 1) {
    return err(errors, "lengthModel.crossoverAfterRack must be >= 1.");
  }
  if (lm.trayLocation !== "ceiling" && lm.trayLocation !== "floor") {
    return err(errors, "lengthModel.trayLocation must be ceiling or floor.");
  }

  if (!isRecord(raw.cablePool)) return err(errors, "cablePool is required.");
  const pool = raw.cablePool;
  if (typeof pool.start !== "number" || pool.start < 1) return err(errors, "cablePool.start must be >= 1.");
  const step = pool.step ?? 1;
  if (typeof step !== "number" || step < 1) return err(errors, "cablePool.step must be >= 1.");

  let fanout: DistributionPlan["fanout"];
  if (raw.fanout !== undefined) {
    if (!isRecord(raw.fanout)) return err(errors, "fanout must be an object.");
    const mode = raw.fanout.mode;
    if (mode !== "trunk-per-dest" && mode !== "port-pair") {
      return err(errors, "fanout.mode must be trunk-per-dest or port-pair.");
    }
    fanout = {
      mode,
      portsPerDest:
        typeof raw.fanout.portsPerDest === "number" ? raw.fanout.portsPerDest : ports,
      portStart:
        typeof raw.fanout.portStart === "number" ? raw.fanout.portStart : 1,
    };
  }

  let labels: DistributionPlan["labels"];
  if (raw.labels !== undefined) {
    if (!isRecord(raw.labels)) return err(errors, "labels must be an object.");
    labels = {
      jackSourceLabel:
        typeof raw.labels.jackSourceLabel === "string" ? raw.labels.jackSourceLabel : undefined,
      jackDestLabelTemplate:
        typeof raw.labels.jackDestLabelTemplate === "string"
          ? raw.labels.jackDestLabelTemplate
          : undefined,
      trunkLabelPrefix:
        typeof raw.labels.trunkLabelPrefix === "string" ? raw.labels.trunkLabelPrefix : undefined,
      wireTypeRaw:
        typeof raw.labels.wireTypeRaw === "string" ? raw.labels.wireTypeRaw : undefined,
    };
  }

  const plan: DistributionPlan = {
    version: DISTRIBUTION_PLAN_VERSION,
    siteCode: typeof raw.siteCode === "string" ? raw.siteCode.trim() || undefined : undefined,
    layout: {
      kind: "grid",
      columns,
      rowCount,
      designationPrefix: layout.designationPrefix.trim().toUpperCase(),
      masterDesignation: layout.masterDesignation.trim().toUpperCase(),
      pathOrder,
    },
    jackFields: {
      bottomU: jf.bottomU,
      portsPerPanel: ports,
      panelCount: typeof jf.panelCount === "number" ? jf.panelCount : undefined,
      sparePanelIndex: typeof jf.sparePanelIndex === "number" ? jf.sparePanelIndex : undefined,
      blankUAfterPanel:
        typeof jf.blankUAfterPanel === "number" ? jf.blankUAfterPanel : undefined,
      masterPanelForFanout:
        typeof jf.masterPanelForFanout === "number" ? jf.masterPanelForFanout : undefined,
      satellitePanel: typeof jf.satellitePanel === "number" ? jf.satellitePanel : 1,
    },
    fanout,
    lengthModel: {
      kind: "hub-serpentine",
      baseFt: lm.baseFt as number,
      incrementFt: lm.incrementFt as number,
      crossoverAfterRack: lm.crossoverAfterRack as number,
      crossoverExtraFt: lm.crossoverExtraFt as number,
      trayLocation: lm.trayLocation as "ceiling" | "floor",
    },
    cablePool: {
      start: pool.start,
      end: typeof pool.end === "number" ? pool.end : undefined,
      step,
      perRackBlockOffset:
        typeof pool.perRackBlockOffset === "number"
          ? pool.perRackBlockOffset
          : typeof pool.perRackBlockStride === "number"
            ? pool.perRackBlockStride
            : undefined,
      firstInBlock:
        typeof pool.firstInBlock === "number" ? pool.firstInBlock : undefined,
    },
    labels,
    endpointTemplate:
      typeof raw.endpointTemplate === "string" ? raw.endpointTemplate : undefined,
  };

  return { ok: true, plan };
}

export function parseDistributionPlanJsonString(text: string): ParseDistributionPlanResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, errors: ["JSON is empty."] };
  try {
    return parseDistributionPlanJson(JSON.parse(trimmed) as unknown);
  } catch {
    return { ok: false, errors: ["Invalid JSON syntax."] };
  }
}

export function formatDistributionPlanJson(plan: DistributionPlan, pretty = true): string {
  return JSON.stringify(plan, null, pretty ? 2 : 0);
}

export function downloadDistributionPlanJson(plan: DistributionPlan, filename: string): void {
  const blob = new Blob([formatDistributionPlanJson(plan)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Apply plan fields to datacom dialog state setters. */
export function hydrateDatacomFormFromPlan(
  plan: DistributionPlan,
  page: { racks: Array<{ id: string; label: string; designation?: string }> },
  setters: {
    setSiteCode: (v: string) => void;
    setDesignationPrefix: (v: string) => void;
    setGridColumns: (v: number) => void;
    setLayoutRowCount: (v: number) => void;
    setLayoutGrid: (v: boolean) => void;
    setJackBottomU: (v: number) => void;
    setJackFieldPorts: (v: 12 | 24 | 48) => void;
    setCablePoolStart: (v: number) => void;
    setCablePoolEnd: (v: number) => void;
    setJackSourceLabel: (v: string) => void;
    setJackDestLabelTemplate: (v: string) => void;
    setMasterRackId: (id: string) => void;
    setFanoutMode?: (v: "trunk-per-dest" | "port-pair") => void;
  },
): void {
  setters.setSiteCode(plan.siteCode ?? "");
  setters.setDesignationPrefix(plan.layout.designationPrefix);
  setters.setGridColumns(plan.layout.columns);
  setters.setLayoutRowCount(plan.layout.rowCount);
  setters.setLayoutGrid(plan.layout.rowCount > 1 || plan.layout.columns > 1);
  setters.setJackBottomU(plan.jackFields.bottomU);
  setters.setJackFieldPorts(plan.jackFields.portsPerPanel);
  setters.setCablePoolStart(plan.cablePool.start);
  setters.setCablePoolEnd(plan.cablePool.end ?? 999);
  setters.setJackSourceLabel(plan.labels?.jackSourceLabel ?? "MDF / Datacom");
  setters.setJackDestLabelTemplate(plan.labels?.jackDestLabelTemplate ?? "{dest} JKF");
  setters.setFanoutMode?.(plan.fanout?.mode ?? "trunk-per-dest");

  const prefix = plan.layout.designationPrefix;
  const masterDes = plan.layout.masterDesignation.toUpperCase();
  const masterRack = page.racks.find((r) => {
    const des = r.designation?.trim().toUpperCase();
    if (des === masterDes) return true;
    const m = r.label.match(/(\d+)\s*$/);
    if (m) return `${prefix}${String(parseInt(m[1], 10)).padStart(2, "0")}` === masterDes;
    return false;
  });
  if (masterRack) setters.setMasterRackId(masterRack.id);
}
