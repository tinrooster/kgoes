import type { DeviceTemplate, Port, SignalType } from "../types";

function mdfPassthroughPort(
  label: string,
  signalType: SignalType,
  connector: Port["connectorType"],
  section?: string,
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
    ...(section ? { section } : {}),
  };
}

/** Row × port grid labels (e.g. 1-05, 2-14) — CAD MD panel addressing. */
export function mdfPanelCircuits(
  rows: number,
  portsPerRow: number,
  opts: {
    signalType: SignalType;
    rearConnectorType: Port["connectorType"];
    frontConnectorType: Port["connectorType"];
  },
): Port[] {
  const ports: Port[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let port = 1; port <= portsPerRow; port++) {
      ports.push(
        mdfPassthroughPort(
          `${row}-${port}`,
          opts.signalType,
          opts.rearConnectorType,
          `Row ${row}`,
        ),
      );
    }
  }
  return ports;
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
    label,
    shortName: "MDF",
    category: "MDF Elements",
    libraryKind: "element",
    searchTerms: ["mdf", "mda", "mdb", "main distribution", "patch pair", "inline", pairLabel, ...searchExtra],
    rackHeightU: 1,
    mountingClass: "rack-full",
    heightMm: 44,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    ports: [mdfPassthroughPort(pairLabel, signalType, connector)],
  };
}

function mdfPanelTemplate(
  id: string,
  label: string,
  rows: number,
  portsPerRow: number,
  signalType: SignalType,
  connector: Port["connectorType"],
  rackHeightU: number,
  searchExtra: string[] = [],
): DeviceTemplate {
  return {
    id,
    deviceType: "mdf",
    label,
    shortName: "MDF Panel",
    category: "MDF Elements",
    libraryKind: "element",
    searchTerms: [
      "mdf",
      "mda",
      "mdb",
      "main distribution",
      "panel",
      `${rows}x${portsPerRow}`,
      ...searchExtra,
    ],
    rackHeightU,
    mountingClass: "rack-full",
    heightMm: rackHeightU * 44,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    ports: mdfPanelCircuits(rows, portsPerRow, {
      signalType,
      rearConnectorType: connector,
      frontConnectorType: connector,
    }),
  };
}

/**
 * MDF devices — panel code MDA/MDB/MDC from rack elevation (top-down).
 * Port labels use row-port (e.g. 2-14 → housename TD08 MDB 2-14).
 * - Panel view: all pairs visible for patching.
 * - Inline view: active pairs only (toolbar / preferences).
 */
export const templates: DeviceTemplate[] = [
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000001",
    "MDF SDI Pair (inline)",
    "1-1",
    "sdi",
    "bnc",
    ["sdi", "bnc", "video"],
  ),
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000002",
    "MDF SDI Pair (inline)",
    "1-2",
    "sdi",
    "bnc",
    ["sdi", "bnc", "video"],
  ),
  mdfPairTemplate(
    "c0a80101-00f0-4000-8000-000000000003",
    "MDF Ethernet Pair (inline)",
    "1-1",
    "ethernet",
    "rj45",
    ["ethernet", "datacom", "ejf"],
  ),
  {
    id: "c0a80101-00f0-4000-8000-000000000010",
    deviceType: "mdf",
    label: "MDF Pair (custom inline)",
    shortName: "MDF",
    category: "MDF Elements",
    libraryKind: "element",
    searchTerms: ["mdf", "mda", "main distribution", "custom pair", "inline"],
    rackHeightU: 1,
    mountingClass: "rack-full",
    heightMm: 44,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    ports: [mdfPassthroughPort("1-1", "custom", "other")],
  },
  mdfPanelTemplate(
    "c0a80101-00f0-4000-8000-000000000020",
    "MDF SDI Panel 2×6 (12-pair)",
    2,
    6,
    "sdi",
    "bnc",
    2,
    ["sdi", "bnc", "panel", "12 pair"],
  ),
  mdfPanelTemplate(
    "c0a80101-00f0-4000-8000-000000000021",
    "MDF SDI Panel 2×12 (24-pair)",
    2,
    12,
    "sdi",
    "bnc",
    2,
    ["sdi", "bnc", "panel", "24 pair"],
  ),
  mdfPanelTemplate(
    "c0a80101-00f0-4000-8000-000000000022",
    "MDF Ethernet Panel 2×12 (24-pair)",
    2,
    12,
    "ethernet",
    "rj45",
    2,
    ["ethernet", "datacom", "panel", "24 pair"],
  ),
];
