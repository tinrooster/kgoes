/**
 * Rack elevation distribution presets (facility MDF / datacom hub patterns).
 * Graphics + callouts in KGO-ES; cable IDs / cutlists remain in trackIT Plant.
 */

import {
  rackDesignationFromLabel,
  formatTrunkCalloutLabel,
  resolveRackDesignation,
} from "./rackDesignation";
import {
  DEFAULT_BLANK_SIZES_U,
  formatFillOrderShort,
  rollupFillOrderLines,
  type FillOrderSummary,
} from "./rackFillCatalog";
import { planFillPlacements } from "./rackFillPacking";
import {
  buildJackFieldDeviceData,
  formatJackFieldLabel,
  jackFieldTemplateForPorts,
} from "./rackJackFieldDevice";
import { layoutRackPositions, sortRacksByLabel, sortRacksForLayout } from "./rackLayout";
import type {
  DeviceData,
  RackCrossLink,
  RackData,
  RackDevicePlacement,
  RackElevationPage,
} from "./types";

export type { FillOrderSummary, FillOrderLineItem } from "./rackFillCatalog";

export const TOWER_DATACOM_HUB_PRESET_ID = "tower-datacom-hub";
export const RACK_FILL_ORDER_PRESET_ID = "rack-fill-order";

export type JackFieldPorts = 12 | 24 | 48;

export interface RackDistributionPresetMeta {
  id: string;
  title: string;
  description: string;
  minRacks: number;
}

export const RACK_DISTRIBUTION_PRESETS: RackDistributionPresetMeta[] = [
  {
    id: TOWER_DATACOM_HUB_PRESET_ID,
    title: "Tower datacom hub",
    description:
      "Master MDF with Ethernet trunk callouts, patch-panel jack fields (12/24/48 port) as rack devices with source/destination labels, and optional 2×6 layout.",
    minRacks: 2,
  },
  {
    id: RACK_FILL_ORDER_PRESET_ID,
    title: "Fill blanks / vents",
    description:
      "Fill empty rack U slots with blank or vent panels and summarize counts for procurement.",
    minRacks: 1,
  },
];

export interface TowerDatacomHubApplyOptions {
  masterRackId: string;
  /** Satellite racks that receive an Ethernet trunk callout from the master. */
  ethTrunkRackIds: string[];
  layoutGrid?: boolean;
  gridColumns?: number;
  replaceExisting?: boolean;
  jackFieldBottomU?: number;
  jackFieldPorts?: JackFieldPorts;
  /** Show preset trunk callouts on the canvas after apply. */
  showTrunkCallouts?: boolean;
  trunkLabelPrefix?: string;
  /** Prefix for auto designations (e.g. RACK, STR). */
  designationPrefix?: string;
  /** MDF / hub name shown on the master jack field (source). */
  jackSourceLabel?: string;
  /** Satellite label template; `{dest}`, `{source}`, `{ports}` — default `{dest} JKF`. */
  jackDestLabelTemplate?: string;
  /** @deprecated Use jackSourceLabel / jackDestLabelTemplate */
  jackLabelMaster?: string;
  /** @deprecated Use jackDestLabelTemplate */
  jackLabelSatellite?: string;
}

export type JackFieldPlacementPlan = {
  deviceNodeId: string;
  deviceData: DeviceData;
  placement: Omit<RackDevicePlacement, "id">;
};

export type TowerDatacomHubPresetOutput = {
  page: RackElevationPage;
  result: ApplyPresetResult;
  jackFields: JackFieldPlacementPlan[];
  removedJackDeviceNodeIds: string[];
};

export interface RackFillOrderApplyOptions {
  face?: "front" | "rear";
  /** Limit fill to these rack ids. Omit/empty = all racks on page. */
  rackIds?: string[];
  /** Use vent-panel every N U within filled range; 0 = all blank. */
  ventEveryNU?: number;
  /** Vent panel height when a vent U is hit (2U only if next U is free). */
  ventPanelHeightU?: 1 | 2;
  /** Blank panel sizes to use, largest first (default 6,4,2,1). */
  blankSizesU?: number[];
  /** When false, only 1U blanks are placed. */
  preferLargeBlanks?: boolean;
  /** Do not fill U at or above this position (reserve jack field). */
  skipFillFromU?: number;
  skipBottomU?: number;
  replaceExisting?: boolean;
  /** Optional rack-device heights keyed by deviceNodeId for accurate occupied-U blocking. */
  deviceHeightsByNodeId?: Record<string, number>;
}

export interface ApplyPresetResult {
  layoutApplied: boolean;
  jacksAdded: number;
  jacksSkipped: number;
  ethLinksAdded: number;
  ethLinksSkipped: number;
  blanksAdded?: number;
  ventsAdded?: number;
  fillSkippedU?: number;
  orderSummary?: FillOrderSummary;
}

export interface PresetIdGenerators {
  accessory: () => string;
  crossLink: () => string;
  deviceNode: () => string;
  placement: () => string;
}

export function jackFieldSpec(ports: JackFieldPorts): { heightU: number; portsLabel: string } {
  switch (ports) {
    case 12:
      return { heightU: 1, portsLabel: "12P" };
    case 48:
      return { heightU: 4, portsLabel: "48P" };
    case 24:
    default:
      return { heightU: 2, portsLabel: "24P" };
  }
}

export function guessMasterRackId(racks: RackData[]): string | null {
  if (racks.length === 0) return null;
  const byLabel = racks.find((r) => /^rack\s*1\b/i.test(r.label.trim()));
  return byLabel?.id ?? sortRacksForLayout(racks)[0]?.id ?? null;
}

/** Default: all satellites checked for Ethernet trunk. */
export function defaultEthTrunkRackIds(racks: RackData[], masterRackId: string): string[] {
  return sortRacksByLabel(racks)
    .filter((r) => r.id !== masterRackId)
    .map((r) => r.id);
}

function applyRackDesignations(
  racks: RackData[],
  designationPrefix: string,
): RackData[] {
  return racks.map((r) => {
    if (r.designation?.trim()) return r;
    const num = rackDesignationFromLabel(r.label);
    if (!num) return r;
    return { ...r, designation: `${designationPrefix}${num}` };
  });
}

function slotOverlapsPlacement(
  page: RackElevationPage,
  rackId: string,
  uPosition: number,
  heightU: number,
  face: "front" | "rear",
  placementHeights: Map<string, number>,
  ignorePlacementIds: Set<string>,
): boolean {
  const newTop = uPosition + heightU - 1;
  for (const p of page.placements) {
    if (p.rackId !== rackId || p.face !== face) continue;
    if (ignorePlacementIds.has(p.id)) continue;
    const pHeight = placementHeights.get(p.id) ?? 1;
    const pTop = p.uPosition + pHeight - 1;
    if (p.uPosition <= newTop && uPosition <= pTop) return true;
  }
  return false;
}

function slotOverlapsAccessory(
  page: RackElevationPage,
  rackId: string,
  uPosition: number,
  heightU: number,
  face: "front" | "rear",
  ignoreAccessoryIds: Set<string>,
): boolean {
  const rack = page.racks.find((r) => r.id === rackId);
  if (!rack) return true;
  if (uPosition < 1 || uPosition + heightU - 1 > rack.heightU) return true;
  const newTop = uPosition + heightU - 1;
  for (const a of page.accessories) {
    if (a.rackId !== rackId || a.face !== face) continue;
    if (ignoreAccessoryIds.has(a.id)) continue;
    const aTop = a.uPosition + a.heightU - 1;
    if (a.uPosition <= newTop && uPosition <= aTop) return true;
  }
  for (const p of page.placements) {
    if (p.rackId !== rackId || p.face !== face || p.mountedOnShelfId) continue;
    const pTop = p.uPosition;
    if (p.uPosition <= newTop && pTop <= newTop) return true;
  }
  return false;
}

function hasEthCrossLink(links: RackCrossLink[], fromRackId: string, toRackId: string): boolean {
  return links.some(
    (l) =>
      l.fromRackId === fromRackId
      && l.toRackId === toRackId
      && (l.distributionPresetRole === "eth-trunk" || l.distributionPresetId === TOWER_DATACOM_HUB_PRESET_ID),
  );
}

function occupiedUSet(
  page: RackElevationPage,
  rackId: string,
  face: "front" | "rear",
  deviceHeightsByNodeId?: Record<string, number>,
): Set<number> {
  const occupied = new Set<number>();
  const rack = page.racks.find((r) => r.id === rackId);
  if (!rack) return occupied;

  for (const a of page.accessories) {
    if (a.rackId !== rackId || a.face !== face) continue;
    for (let u = a.uPosition; u <= a.uPosition + a.heightU - 1; u++) occupied.add(u);
  }
  for (const p of page.placements) {
    if (p.rackId !== rackId || p.face !== face || p.mountedOnShelfId) continue;
    const h = Math.max(
      1,
      Math.round(deviceHeightsByNodeId?.[p.deviceNodeId] ?? 1),
    );
    for (let u = p.uPosition; u <= p.uPosition + h - 1; u++) occupied.add(u);
  }
  return occupied;
}

export function applyTowerDatacomHubPreset(
  page: RackElevationPage,
  options: TowerDatacomHubApplyOptions,
  ids: PresetIdGenerators,
): TowerDatacomHubPresetOutput {
  const presetId = TOWER_DATACOM_HUB_PRESET_ID;
  const masterId = options.masterRackId;
  const master = page.racks.find((r) => r.id === masterId);
  if (!master) throw new Error("Master rack not found on this page");

  const jackPorts = options.jackFieldPorts ?? 24;
  const { heightU: jackHeightU } = jackFieldSpec(jackPorts);
  const jackBottomU = options.jackFieldBottomU ?? 41;
  const designationPrefix = (options.designationPrefix ?? "RACK").trim().toUpperCase() || "RACK";
  const trunkPrefix = options.trunkLabelPrefix ?? "Datacom";
  const sourceLabel =
    options.jackSourceLabel?.trim()
    || options.jackLabelMaster?.trim()
    || `${jackPorts}P MDF / Datacom`;
  const destLabelTemplate = options.jackDestLabelTemplate ?? options.jackLabelSatellite ?? "{dest} JKF";

  const removedJackDeviceNodeIds = options.replaceExisting
    ? [
        ...new Set(
          page.placements
            .filter((p) => p.distributionPresetId === presetId && p.distributionPresetRole === "jack-field")
            .map((p) => p.deviceNodeId),
        ),
      ]
    : [];

  let racks = applyRackDesignations([...page.racks], designationPrefix);
  let accessories = [...page.accessories];
  let crossLinks = [...(page.crossLinks ?? [])];
  let placements = [...page.placements];

  if (options.replaceExisting) {
    accessories = accessories.filter((a) => a.distributionPresetId !== presetId);
    crossLinks = crossLinks.filter((l) => l.distributionPresetId !== presetId);
    placements = placements.filter(
      (p) => !(p.distributionPresetId === presetId && p.distributionPresetRole === "jack-field"),
    );
  }

  const jackTemplate = jackFieldTemplateForPorts(jackPorts);
  const jackFields: JackFieldPlacementPlan[] = [];

  const result: ApplyPresetResult = {
    layoutApplied: false,
    jacksAdded: 0,
    jacksSkipped: 0,
    ethLinksAdded: 0,
    ethLinksSkipped: 0,
  };

  const gridColumns = options.gridColumns ?? 6;
  if (options.layoutGrid && racks.length >= 6) {
    const maxHeightU = racks.reduce((m, r) => Math.max(m, r.heightU), 42);
    const posById = layoutRackPositions(racks, { mode: "grid", columns: gridColumns, maxHeightU });
    racks = racks.map((r) => {
      const pos = posById.get(r.id);
      return pos ? { ...r, position: pos } : r;
    });
    result.layoutApplied = true;
  }

  const ethSet = new Set(options.ethTrunkRackIds.filter((id) => id !== masterId));
  const masterRack = racks.find((r) => r.id === masterId)!;
  let workingPage: RackElevationPage = { ...page, racks, accessories, crossLinks, placements };

  if (!jackTemplate) {
    result.jacksSkipped += racks.length;
  } else {
    for (const rack of racks) {
      const isMaster = rack.id === masterId;
      const label = formatJackFieldLabel({
        isMaster,
        jackFieldPorts: jackPorts,
        sourceLabel,
        rack,
        designationPrefix,
        destLabelTemplate,
      });
      const designation = resolveRackDesignation(rack, designationPrefix);

      if (jackBottomU + jackHeightU - 1 > rack.heightU) {
        result.jacksSkipped += 1;
        continue;
      }
      if (
        slotOverlapsAccessory(workingPage, rack.id, jackBottomU, jackHeightU, "front", new Set())
        || slotOverlapsPlacement(workingPage, rack.id, jackBottomU, jackHeightU, "front", new Map(), new Set())
      ) {
        result.jacksSkipped += 1;
        continue;
      }

      const deviceNodeId = ids.deviceNode();
      const deviceData = buildJackFieldDeviceData(jackTemplate, {
        label,
        designation,
        rackHeightU: jackHeightU,
        jackFieldPorts: jackPorts,
        isMaster,
        sourceLabel,
        destDesignation: isMaster ? undefined : designation,
      });

      const placementId = ids.placement();
      const placement: RackDevicePlacement = {
        id: placementId,
        rackId: rack.id,
        deviceNodeId,
        uPosition: jackBottomU,
        face: "front",
        distributionPresetId: presetId,
        distributionPresetRole: "jack-field",
      };

      placements.push(placement);
      jackFields.push({
        deviceNodeId,
        deviceData,
        placement: {
          rackId: rack.id,
          deviceNodeId,
          uPosition: jackBottomU,
          face: "front",
          distributionPresetId: presetId,
          distributionPresetRole: "jack-field",
        },
      });
      workingPage = { ...workingPage, placements };
      result.jacksAdded += 1;
    }
  }

  for (const target of racks) {
    if (target.id === masterId || !ethSet.has(target.id)) continue;
    if (hasEthCrossLink(crossLinks, masterId, target.id)) {
      result.ethLinksSkipped += 1;
      continue;
    }
    crossLinks.push({
      id: ids.crossLink(),
      fromRackId: masterId,
      toRackId: target.id,
      label: formatTrunkCalloutLabel(masterRack, target, {
        prefix: trunkPrefix,
        prefixCode: designationPrefix,
      }),
      distributionPresetId: presetId,
      distributionPresetRole: "eth-trunk",
    });
    result.ethLinksAdded += 1;
  }

  const showTrunkCallouts = options.showTrunkCallouts !== false;

  return {
    page: {
      ...page,
      racks,
      accessories,
      crossLinks,
      placements,
      showTrunkCallouts,
    },
    result,
    jackFields,
    removedJackDeviceNodeIds,
  };
}

export function applyRackFillOrderPreset(
  page: RackElevationPage,
  options: RackFillOrderApplyOptions,
  ids: PresetIdGenerators,
): { page: RackElevationPage; result: ApplyPresetResult } {
  const presetId = RACK_FILL_ORDER_PRESET_ID;
  const face = options.face ?? "front";
  const ventEvery = options.ventEveryNU ?? 0;
  const ventPanelHeightU = options.ventPanelHeightU ?? 1;
  const skipFromU = options.skipFillFromU ?? 41;
  const skipBottom = options.skipBottomU ?? 1;
  const selectedRackIds =
    options.rackIds && options.rackIds.length > 0
      ? new Set(options.rackIds)
      : null;
  const preferLarge = options.preferLargeBlanks !== false;
  const blankSizesU = preferLarge
    ? (options.blankSizesU?.length ? options.blankSizesU : [...DEFAULT_BLANK_SIZES_U])
    : [1];

  let accessories = [...page.accessories];
  if (options.replaceExisting) {
    accessories = accessories.filter((a) => {
      if (a.distributionPresetId !== presetId) return true;
      if (a.face !== face) return true;
      if (!selectedRackIds) return false;
      return !selectedRackIds.has(a.rackId);
    });
  }

  const result: ApplyPresetResult = {
    layoutApplied: false,
    jacksAdded: 0,
    jacksSkipped: 0,
    ethLinksAdded: 0,
    ethLinksSkipped: 0,
    blanksAdded: 0,
    ventsAdded: 0,
    fillSkippedU: 0,
  };

  const allPlacements: Array<{ kind: "blank" | "vent"; heightU: number }> = [];
  let workingPage: RackElevationPage = { ...page, accessories };

  for (const rack of page.racks) {
    if (selectedRackIds && !selectedRackIds.has(rack.id)) continue;
    const occupied = occupiedUSet(
      workingPage,
      rack.id,
      face,
      options.deviceHeightsByNodeId,
    );
    const freeU: number[] = [];
    for (let u = skipBottom; u < skipFromU && u <= rack.heightU; u++) {
      if (!occupied.has(u)) freeU.push(u);
      else result.fillSkippedU = (result.fillSkippedU ?? 0) + 1;
    }

    const planned = planFillPlacements({
      freeU,
      ventEveryNU: ventEvery,
      ventPanelHeightU,
      blankSizesU,
    });

    for (const p of planned) {
      if (
        slotOverlapsAccessory(workingPage, rack.id, p.uPosition, p.heightU, face, new Set())
      ) {
        result.fillSkippedU = (result.fillSkippedU ?? 0) + p.heightU;
        continue;
      }
      const isVent = p.kind === "vent";
      const type = isVent ? "vent-panel" : "blank-panel";
      accessories.push({
        id: ids.accessory(),
        rackId: rack.id,
        type,
        uPosition: p.uPosition,
        heightU: p.heightU,
        face,
        label: isVent ? undefined : `${p.heightU}U Blank`,
        distributionPresetId: presetId,
        distributionPresetRole: isVent ? "vent-fill" : "blank-fill",
      });
      for (let u = p.uPosition; u < p.uPosition + p.heightU; u++) occupied.add(u);
      allPlacements.push({ kind: p.kind, heightU: p.heightU });
      if (isVent) result.ventsAdded = (result.ventsAdded ?? 0) + 1;
      else result.blanksAdded = (result.blanksAdded ?? 0) + 1;
    }
    workingPage = { ...workingPage, accessories };
  }

  result.orderSummary = rollupFillOrderLines(allPlacements);

  return {
    page: { ...page, accessories, fillOrderSummary: result.orderSummary },
    result,
  };
}

export function formatApplyPresetSummary(result: ApplyPresetResult): string {
  if (result.orderSummary) {
    return formatFillOrderShort(result.orderSummary);
  }
  const parts: string[] = [];
  if (result.layoutApplied) parts.push("2×6 layout");
  parts.push(`${result.jacksAdded} jack field${result.jacksAdded === 1 ? "" : "s"}`);
  parts.push(`${result.ethLinksAdded} ETH trunk${result.ethLinksAdded === 1 ? "" : "s"}`);
  const skipped = result.jacksSkipped + result.ethLinksSkipped;
  if (skipped > 0) parts.push(`${skipped} skipped (occupied or duplicate)`);
  return parts.join(" · ");
}

/** Visible cross-links: manual links always show; preset links respect showTrunkCallouts. */
export function filterVisibleCrossLinks(
  links: RackCrossLink[],
  showPresetTrunkCallouts: boolean,
): RackCrossLink[] {
  return links.filter((l) => {
    if (!l.distributionPresetId) return true;
    return showPresetTrunkCallouts;
  });
}
