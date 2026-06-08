/**
 * Ethernet jack field (EJF) devices for the tower datacom hub preset —
 * full rack devices (patch panels), not blank accessories.
 */

import { getTemplateById } from "./templateApi";
import { DEVICE_TEMPLATES } from "./deviceLibraryRuntime";
import { resolveRackDesignation } from "./rackDesignation";
import { patchPanelCircuits } from "./devices/_helpers";
import { autoLayoutAllFacePlateItems } from "./facePlateUtils";
import { buildVjfGridLayout } from "./vjfLayout";
import type { JackFieldPorts } from "./rackDistributionPresets";
import { rowPosition } from "./auxiliaryData";
import type {
  DeviceData,
  DeviceTemplate,
  Port,
  RackData,
  RackElevationPage,
  SchematicNode,
  SchematicPage,
} from "./types";

export const JACK_FIELD_TEMPLATE_ID: Record<JackFieldPorts, string> = {
  12: "c0a80101-00e8-4000-8000-000000000308",
  24: "c0a80101-00e9-4000-8000-000000000309",
  48: "c0a80101-00ea-4000-8000-000000000310",
};

function clonePorts(ports: Port[]): Port[] {
  const prefix = `ejf-${Date.now()}`;
  return ports.map((p, i) => {
    const clone: Port = { ...p, id: `${prefix}-${i}` };
    if (p.capabilities) clone.capabilities = { ...p.capabilities };
    if (p.networkConfig) clone.networkConfig = { ...p.networkConfig };
    if (p.activeConfig) clone.activeConfig = { ...p.activeConfig };
    return clone;
  });
}

/** Ensure exactly N passthrough RJ45 circuits (template catalog may be stale). */
function portsForJackField(template: DeviceTemplate, portCount: JackFieldPorts): Port[] {
  const existing = template.ports ?? [];
  const passthroughOnly =
    existing.length === portCount
    && existing.every((p) => p.direction === "passthrough");
  if (passthroughOnly) return clonePorts(existing);
  return patchPanelCircuits("Port ", portCount, {
    signalType: "ethernet",
    rearConnectorType: "rj45",
    frontConnectorType: "rj45",
  });
}

function jackFieldPortsNeedUpgrade(data: DeviceData, jackFieldPorts: JackFieldPorts): boolean {
  const ports = data.ports ?? [];
  if (ports.length !== jackFieldPorts) return true;
  return !ports.every((p) => p.direction === "passthrough");
}

function mergePreservingPortIds(existing: Port[] | undefined, fresh: Port[]): Port[] {
  if (!existing?.length) return fresh;
  return fresh.map((p, i) => {
    const prev = existing[i];
    return prev ? { ...p, id: prev.id } : p;
  });
}

function inferJackFieldMeta(data: DeviceData): {
  isMaster: boolean;
  sourceLabel: string;
  destDesignation?: string;
} {
  const aux = data.auxiliaryData ?? [];
  const header = aux.find((a) => rowPosition(a) === "gheader")?.text ?? "";
  const footer = aux.find((a) => a.position === "footer")?.text ?? "";
  if (header.startsWith("Source:")) {
    return { isMaster: true, sourceLabel: header.replace(/^Source:\s*/i, "").trim() || "MDF" };
  }
  const to = header.match(/^To:\s*(.+)$/i)?.[1]?.trim();
  const from = footer.match(/^From:\s*(.+)$/i)?.[1]?.trim();
  return {
    isMaster: false,
    sourceLabel: from || "MDF",
    destDesignation: to && to !== "—" ? to : data.designation,
  };
}

/** Refresh EJF port circuits + face-plate layout (keeps port ids when possible). */
export function upgradeJackFieldDeviceData(
  data: DeviceData,
  jackFieldPorts: JackFieldPorts,
): DeviceData {
  const template = jackFieldTemplateForPorts(jackFieldPorts);
  if (!template) return data;
  const facePlateForPorts = (ports: Port[], deviceType: string) =>
    jackFieldPorts === 12
      ? buildVjfGridLayout({ ports, colsPerRow: 6, portLabelPrefix: "Port " })
      : {
          positions: autoLayoutAllFacePlateItems(ports, deviceType),
          deviceLabel: { x: 50, y: jackFieldPorts > 6 ? 8 : 12 },
        };

  if (!jackFieldPortsNeedUpgrade(data, jackFieldPorts)) {
    const ports = data.ports ?? [];
    return {
      ...data,
      facePlateLayout: {
        ...data.facePlateLayout,
        ...facePlateForPorts(ports, data.deviceType ?? template.deviceType),
      },
    };
  }
  const meta = inferJackFieldMeta(data);
  const freshPorts = portsForJackField(template, jackFieldPorts);
  const ports = mergePreservingPortIds(data.ports, freshPorts);
  const templatePorts = template.ports ?? [];
  ports.forEach((p, i) => {
    if (templatePorts[i]) p.templatePortId = templatePorts[i].id;
  });
  const source = meta.sourceLabel.trim() || "MDF";
  const dest = meta.destDesignation ?? data.designation ?? "";
  return {
    ...data,
    ports,
    deviceType: template.deviceType,
    templateId: template.id,
    facePlateLayout: facePlateForPorts(ports, template.deviceType),
    auxiliaryData: meta.isMaster
      ? [
          { text: `Source: ${source}`, position: "header" },
          { text: `${jackFieldPorts}P Ethernet MDF`, position: "footer" },
        ]
      : [
          { text: `To: ${dest || "—"}`, position: "header" },
          { text: `From: ${source}`, position: "footer" },
        ],
  };
}

function jackFieldPortsForPlacement(page: RackElevationPage): JackFieldPorts {
  const fromPlan = page.distributionPlan?.jackFields?.portsPerPanel;
  if (fromPlan === 12 || fromPlan === 24 || fromPlan === 48) return fromPlan;
  return 12;
}

/** Upgrade hub preset jack-field devices after load or apply (fixes stale 6P / in-out templates). */
export function upgradeJackFieldNodesForPages(
  nodes: SchematicNode[],
  pages: SchematicPage[],
): SchematicNode[] {
  const targets = new Map<string, JackFieldPorts>();
  for (const page of pages) {
    if (page.type !== "rack-elevation") continue;
    for (const pl of page.placements) {
      if (pl.distributionPresetRole !== "jack-field") continue;
      targets.set(pl.deviceNodeId, jackFieldPortsForPlacement(page));
    }
  }
  if (targets.size === 0) return nodes;
  return nodes.map((n) => {
    if (n.type !== "device") return n;
    const jackFieldPorts = targets.get(n.id);
    if (!jackFieldPorts) return n;
    return { ...n, data: upgradeJackFieldDeviceData(n.data as DeviceData, jackFieldPorts) };
  });
}

export function jackFieldTemplateForPorts(ports: JackFieldPorts): DeviceTemplate | undefined {
  return getTemplateById(JACK_FIELD_TEMPLATE_ID[ports], DEVICE_TEMPLATES);
}

/** User-facing device label on the rack elevation. */
export function formatJackFieldLabel(opts: {
  isMaster: boolean;
  jackFieldPorts: JackFieldPorts;
  sourceLabel: string;
  rack: RackData;
  designationPrefix: string;
  destLabelTemplate?: string;
}): string {
  const source = opts.sourceLabel.trim();
  if (opts.isMaster) {
    return source || `${opts.jackFieldPorts}P MDF`;
  }
  const dest = resolveRackDesignation(opts.rack, opts.designationPrefix);
  const tmpl = (opts.destLabelTemplate ?? "{dest} JKF").trim();
  return tmpl
    .replace(/\{dest\}/gi, dest)
    .replace(/\{source\}/gi, source || "MDF")
    .replace(/\{ports\}/gi, String(opts.jackFieldPorts));
}

export function buildJackFieldDeviceData(
  template: DeviceTemplate,
  opts: {
    label: string;
    designation?: string;
    rackHeightU: number;
    jackFieldPorts: JackFieldPorts;
    isMaster: boolean;
    sourceLabel: string;
    destDesignation?: string;
  },
): DeviceData {
  const ports = portsForJackField(template, opts.jackFieldPorts);
  const templatePorts = template.ports ?? [];
  ports.forEach((p, i) => {
    if (templatePorts[i]) p.templatePortId = templatePorts[i].id;
  });

  const source = opts.sourceLabel.trim() || "MDF";
  const dest = opts.destDesignation ?? opts.designation ?? "";

  return {
    label: opts.label,
    shortName: opts.label,
    model: template.label,
    deviceType: template.deviceType,
    ports,
    color: template.color,
    templateId: template.id,
    manufacturer: template.manufacturer,
    modelNumber: template.modelNumber,
    rackHeightU: opts.rackHeightU,
    mountingClass: "rack-full",
    rackForm: "full",
    rackMetadataSource: "explicit",
    heightMm: Math.round(opts.rackHeightU * 44.45),
    widthMm: template.widthMm ?? 482.6,
    depthMm: template.depthMm ?? 120,
    designation: opts.designation,
    // Jack fields are essentially patch panels; ensure the face-plate editor has a
    // fully defined layout object (positions keyed by port+panel) rather than
    // relying on per-session auto-layout defaults.
    facePlateLayout:
      opts.jackFieldPorts === 12
        ? buildVjfGridLayout({ ports, colsPerRow: 6, portLabelPrefix: "Port " })
        : {
            positions: autoLayoutAllFacePlateItems(ports, template.deviceType),
            deviceLabel: { x: 50, y: opts.jackFieldPorts > 6 ? 8 : 12 },
          },
    auxiliaryData: opts.isMaster
      ? [
          { text: `Source: ${source}`, position: "header" },
          { text: `${opts.jackFieldPorts}P Ethernet MDF`, position: "footer" },
        ]
      : [
          { text: `To: ${dest || "—"}`, position: "header" },
          { text: `From: ${source}`, position: "footer" },
        ],
  } as DeviceData;
}
