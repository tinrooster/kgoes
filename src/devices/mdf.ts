import type { DeviceTemplate, Port, SignalType } from "../types";

function mdfPassthroughPort(
  label: string,
  signalType: SignalType,
  connector: Port["connectorType"],
): Port {
  return {
    id: `mdf-port-${label.replace(/\W+/g, "-")}`,
    label,
    signalType,
    direction: "passthrough",
    connectorType: connector,
    rearConnectorType: connector,
    frontConnectorType: connector,
    inheritsSignal: true,
  };
}

function mdfPairTemplate(
  id: string,
  label: string,
  pairLabel: string,
  signalType: SignalType,
  connector: Port["connectorType"],
  searchExtra: string[] = [],
): DeviceTemplate {
  return {
    id,
    deviceType: "mdf",
    deviceTypeCode: "MDA",
    label,
    shortName: "MDF",
    category: "Infrastructure",
    searchTerms: ["mdf", "mda", "main distribution", "patch pair", pairLabel, ...searchExtra],
    rackHeightU: 1,
    mountingClass: "rack-full",
    heightMm: 44,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    ports: [mdfPassthroughPort(pairLabel, signalType, connector)],
  };
}

/** Compact MDF pair devices — one passthrough in/out per instance (CAD inline format). */
export const templates: DeviceTemplate[] = [
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000001",
    "MDF SDI Pair",
    "1-29",
    "sdi",
    "bnc",
    ["sdi", "bnc", "video"],
  ),
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000002",
    "MDF SDI Pair",
    "1-30",
    "sdi",
    "bnc",
    ["sdi", "bnc", "video"],
  ),
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000003",
    "MDF Ethernet Pair",
    "1-01",
    "ethernet",
    "rj45",
    ["ethernet", "datacom", "ejf"],
  ),
  {
    id: "c0a80101-00f0-4000-8000-000000000010",
    deviceType: "mdf",
    deviceTypeCode: "MDA",
    label: "MDF Pair (custom)",
    shortName: "MDF",
    category: "Infrastructure",
    searchTerms: ["mdf", "mda", "main distribution", "custom pair"],
    rackHeightU: 1,
    mountingClass: "rack-full",
    heightMm: 44,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    ports: [mdfPassthroughPort("1-01", "custom", "other")],
  },
];
