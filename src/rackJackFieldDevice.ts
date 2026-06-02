/**
 * Ethernet jack field (EJF) devices for the tower datacom hub preset —
 * full rack devices (patch panels), not blank accessories.
 */

import { getTemplateById } from "./templateApi";
import { DEVICE_TEMPLATES } from "./deviceLibraryRuntime";
import { resolveRackDesignation } from "./rackDesignation";
import type { JackFieldPorts } from "./rackDistributionPresets";
import type { DeviceData, DeviceTemplate, Port, RackData } from "./types";

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
  const templatePorts = template.ports ?? [];
  const ports = clonePorts(templatePorts);
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
