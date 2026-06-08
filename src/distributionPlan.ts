/**
 * Distribution plan types + builder (mirrors trackIT src/lib/distributionPlan/schema.ts).
 * Kept in KGO-ES without Zod so the elevation JSON shape stays portable.
 */

import { resolveRackDesignation } from "./rackDesignation";

export const DISTRIBUTION_PLAN_VERSION = 1 as const;

export type DistributionPlan = {
  version: typeof DISTRIBUTION_PLAN_VERSION;
  siteCode?: string;
  layout: {
    kind: "grid";
    columns: number;
    rowCount: number;
    designationPrefix: string;
    masterDesignation: string;
    pathOrder: "row-major" | "col-major";
  };
  jackFields: {
    bottomU: number;
    portsPerPanel: 12 | 24 | 48;
    panelCount?: number;
    sparePanelIndex?: number;
    /** 1U blank after each stacked master EJF (panel + blank = 2U). */
    blankUAfterPanel?: number;
    masterPanelForFanout?: number;
    satellitePanel?: number;
  };
  fanout?: {
    mode: "trunk-per-dest" | "port-pair";
    portsPerDest?: number;
    portStart?: number;
    /** Drawing style when mode is port-pair: one trunk line per dest (default) or one line per port. */
    schematicStyle?: "trunk" | "port-pair";
  };
  lengthModel: {
    kind: "hub-serpentine";
    baseFt: number;
    incrementFt: number;
    crossoverAfterRack: number;
    crossoverExtraFt: number;
    trayLocation: "ceiling" | "floor";
  };
  cablePool: {
    start: number;
    end?: number;
    step: number;
    perRackBlockOffset?: number;
    firstInBlock?: number;
  };
  labels?: {
    jackSourceLabel?: string;
    jackDestLabelTemplate?: string;
    trunkLabelPrefix?: string;
    wireTypeRaw?: string;
  };
  endpointTemplate?: string;
};

export function buildDistributionPlanFromHubDialog(opts: {
  siteCode?: string;
  designationPrefix: string;
  masterDesignation: string;
  gridColumns: number;
  rowCount: number;
  jackFieldBottomU: number;
  jackFieldPorts: 12 | 24 | 48;
  jackSourceLabel?: string;
  jackDestLabelTemplate?: string;
  trunkLabelPrefix?: string;
  cablePoolStart?: number;
  cablePoolEnd?: number;
  fanoutMode?: "trunk-per-dest" | "port-pair";
  lengthModel?: DistributionPlan["lengthModel"];
}): DistributionPlan {
  return {
    version: DISTRIBUTION_PLAN_VERSION,
    siteCode: opts.siteCode?.trim() || undefined,
    layout: {
      kind: "grid",
      columns: opts.gridColumns,
      rowCount: opts.rowCount,
      designationPrefix: opts.designationPrefix.trim().toUpperCase(),
      masterDesignation: opts.masterDesignation.trim().toUpperCase(),
      pathOrder: "row-major",
    },
    jackFields: {
      bottomU: opts.jackFieldBottomU,
      portsPerPanel: opts.jackFieldPorts,
      panelCount: 6,
      blankUAfterPanel: 1,
      sparePanelIndex: 6,
      satellitePanel: 1,
    },
    fanout: {
      mode: opts.fanoutMode ?? "trunk-per-dest",
      portsPerDest: opts.jackFieldPorts,
      portStart: 1,
      schematicStyle: opts.fanoutMode === "port-pair" ? "trunk" : undefined,
    },
    lengthModel: opts.lengthModel ?? {
      kind: "hub-serpentine",
      baseFt: 14,
      incrementFt: 3,
      crossoverAfterRack: 6,
      crossoverExtraFt: 8,
      trayLocation: "ceiling",
    },
    cablePool: {
      start: opts.cablePoolStart ?? 101,
      end: opts.cablePoolEnd ?? 9999,
      step: 1,
      perRackBlockOffset: 100,
      firstInBlock: 1,
    },
    labels: {
      jackSourceLabel: opts.jackSourceLabel,
      jackDestLabelTemplate: opts.jackDestLabelTemplate,
      trunkLabelPrefix: opts.trunkLabelPrefix,
      wireTypeRaw: "CAT6",
    },
  };
}

/** Total front U consumed by stacked master EJFs (including blanks after each panel). */
export function masterJackStackTotalU(
  plan: DistributionPlan,
  jackHeightU: number,
): number {
  const panelCount = plan.jackFields.panelCount ?? 1;
  const spare = plan.jackFields.sparePanelIndex;
  const blankU = plan.jackFields.blankUAfterPanel ?? 0;
  let active = 0;
  for (let i = 1; i <= panelCount; i += 1) {
    if (spare != null && i === spare) continue;
    active += 1;
  }
  if (active <= 0) return jackHeightU;
  return active * (jackHeightU + blankU);
}

export function masterDesignationFromRack(
  designationPrefix: string,
  rackLabel: string,
  rackDesignation?: string,
): string {
  if (rackDesignation?.trim()) return rackDesignation.trim().toUpperCase();
  const prefix = designationPrefix.trim().toUpperCase();
  const m = rackLabel.match(/(\d+)\s*$/);
  if (m) return `${prefix}${String(parseInt(m[1], 10)).padStart(2, "0")}`;
  return `${prefix}01`;
}

export function rackNumFromDesignation(
  designation: string,
  prefix: string,
): number | null {
  const p = prefix.trim().toUpperCase();
  const d = designation.trim().toUpperCase();
  if (!d.startsWith(p)) return null;
  const num = parseInt(d.slice(p.length), 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Master stacked EJF panel (1-based) for a destination rack.
 * Panel index = destRackNum − masterRackNum (e.g. SR02 → panel 1 when master is SR01).
 */
export function masterPanelIndexForDestRack(
  destRackNum: number,
  masterRackNum: number,
  plan: DistributionPlan,
): number | null {
  const panelIndex = destRackNum - masterRackNum;
  if (panelIndex < 1) return null;
  const spare = plan.jackFields.sparePanelIndex;
  if (spare != null && panelIndex === spare) return null;
  const panelCount = plan.jackFields.panelCount ?? 1;
  if (panelIndex > panelCount) return null;
  return panelIndex;
}

export function resolveMasterPanelForDestRack(
  masterRack: { designation?: string; label: string },
  destRack: { designation?: string; label: string },
  plan: DistributionPlan,
): number | null {
  const prefix = plan.layout.designationPrefix.trim().toUpperCase();
  const masterCode = resolveRackDesignation(
    masterRack as import("./types").RackData,
    prefix,
  );
  const destCode = resolveRackDesignation(
    destRack as import("./types").RackData,
    prefix,
  );
  const masterNum = rackNumFromDesignation(masterCode, prefix);
  const destNum = rackNumFromDesignation(destCode, prefix);
  if (masterNum == null || destNum == null) return null;
  const panelCount = plan.jackFields.panelCount ?? 1;
  if (panelCount <= 1) {
    return plan.jackFields.masterPanelForFanout ?? 1;
  }
  return masterPanelIndexForDestRack(destNum, masterNum, plan);
}
