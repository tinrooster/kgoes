/**
 * Build schematic report CSV for trackIT postMessage bridge (TRACKIT_EXPORT_REPORT).
 */
import { computeCableSchedule } from "./cableSchedule";
import { escapeCsv, csvRow, computePackList } from "./packList";
import { computeNetworkReport } from "./networkReport";
import {
  computePatchPanelSchedule,
} from "./patchPanelSchedule";
import { computePowerReport } from "./powerReport";
import { useSchematicStore } from "./store";
import type { ReportsTab } from "./components/ReportsDialog";

export type TrackItExportReportTab = Exclude<ReportsTab, "devices">;

export type TrackItReportCsvPayload = {
  csv: string;
  filename: string;
  rowCount: number;
};

function countDataRows(csv: string): number {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return 0;
  return Math.max(0, lines.length - 1);
}

function buildNetworkCsv(schematicName: string): TrackItReportCsvPayload {
  const store = useSchematicStore.getState();
  const rows = computeNetworkReport(store.nodes, store.edges);
  const header = [
    "Device",
    "Port",
    "Room",
    "Signal",
    "Hostname",
    "IP",
    "Subnet Mask",
    "Gateway",
    "VLAN",
    "Speed",
    "PoE (W)",
    "DHCP",
    "DHCP Server",
    "Notes",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsv(r.deviceLabel),
        escapeCsv(r.portLabel),
        escapeCsv(r.room),
        escapeCsv(r.signalType),
        escapeCsv(r.hostname),
        r.ip,
        r.subnetMask,
        r.gateway,
        r.vlan,
        r.linkSpeed,
        r.poeDrawW,
        r.dhcp ? "Yes" : "No",
        escapeCsv(r.dhcpServerLabel),
        escapeCsv(r.notes),
      ].join(","),
    ),
  ];
  const csv = lines.join("\n");
  return {
    csv,
    filename: `${schematicName} - Network Report.csv`,
    rowCount: rows.length,
  };
}

function buildCableScheduleCsv(schematicName: string): TrackItReportCsvPayload {
  const store = useSchematicStore.getState();
  const rows = computeCableSchedule(store.nodes, store.edges, store.cableNamingScheme, {
    roomDistances: store.roomDistances,
    distanceSettings: store.distanceSettings,
  });
  const lines: string[] = [];
  lines.push(`Cable Schedule — ${escapeCsv(schematicName)}`);
  lines.push(`Generated ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push(
    csvRow([
      "Cable ID",
      "Source",
      "Src Port",
      "Src Conn",
      "Target",
      "Tgt Port",
      "Tgt Conn",
      "Cable Type",
      "Signal",
      "Length",
      "Est. Length",
      "Src Room",
      "Tgt Room",
      "Snake",
    ]),
  );
  for (const r of rows) {
    lines.push(
      csvRow([
        r.cableId,
        r.sourceDevice,
        r.sourcePort,
        r.sourceConnector,
        r.targetDevice,
        r.targetPort,
        r.targetConnector,
        r.cableType,
        r.signalType,
        r.cableLength,
        r.computedLength ?? "",
        r.sourceRoom,
        r.targetRoom,
        r.multicableLabel,
      ]),
    );
  }
  const csv = lines.join("\n");
  return {
    csv,
    filename: `${schematicName} - Cable Schedule.csv`,
    rowCount: rows.length,
  };
}

function buildPatchPanelCsv(schematicName: string): TrackItReportCsvPayload {
  const store = useSchematicStore.getState();
  const rows = computePatchPanelSchedule(store.nodes, store.edges, store.cableNamingScheme, {
    roomDistances: store.roomDistances,
    distanceSettings: store.distanceSettings,
  });
  const lines: string[] = [];
  lines.push(`Patch Panel Schedule — ${escapeCsv(schematicName)}`);
  lines.push(`Generated ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push(
    csvRow([
      "Panel",
      "Panel Room",
      "Face",
      "Position",
      "Signal",
      "Connector",
      "M/F",
      "Remote Device",
      "Remote Port",
      "Remote Room",
      "Cable ID",
      "Cable Type",
      "Length",
      "Est. Length",
      "Snake",
    ]),
  );
  for (const r of rows) {
    if (r.face === "Passthrough") continue;
    lines.push(
      csvRow([
        r.panel,
        r.panelRoom,
        r.face,
        r.position,
        r.signalType,
        r.connector ?? "",
        r.gender ?? "",
        r.remoteDevice ?? "",
        r.remotePort ?? "",
        r.remoteRoom ?? "",
        r.cableId ?? "",
        r.cableType ?? "",
        r.cableLength ?? "",
        r.computedLength ?? "",
        r.multicableLabel ?? "",
      ]),
    );
  }
  const csv = lines.join("\n");
  return {
    csv,
    filename: `${schematicName} - Patch Panel Schedule.csv`,
    rowCount: rows.filter((r) => r.face !== "Passthrough").length,
  };
}

function buildPowerCsv(schematicName: string): TrackItReportCsvPayload {
  const store = useSchematicStore.getState();
  const data = computePowerReport(store.nodes, store.edges);
  const lines: string[] = [];
  lines.push(`Power Report — ${schematicName}`);
  lines.push(`Generated ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push(
    csvRow(["Qty", "Device", "Type", "Room", "Power (W)", "Thermal (BTU/h)", "Total Thermal (BTU/h)", "Voltage"]),
  );
  for (const d of data.devices) {
    const thermalCell =
      d.thermalBtuh > 0 ? `${d.thermalDerived ? "~" : ""}${d.thermalBtuh}` : "";
    const totalThermalCell =
      d.thermalBtuh > 0 ? `${d.thermalDerived ? "~" : ""}${d.thermalBtuh * d.count}` : "";
    lines.push(
      csvRow([
        `${d.count}`,
        d.model,
        d.deviceType,
        d.room,
        `${d.powerDrawW}`,
        thermalCell,
        totalThermalCell,
        d.voltage,
      ]),
    );
  }
  const csv = lines.join("\n");
  return {
    csv,
    filename: `${schematicName} - Power Report.csv`,
    rowCount: data.devices.length,
  };
}

function buildPackListCsv(schematicName: string): TrackItReportCsvPayload {
  const store = useSchematicStore.getState();
  const data = computePackList(store.nodes, store.edges, store.ownedGear);
  const lines: string[] = [];
  lines.push(`Pack List — ${schematicName}`);
  lines.push(`Generated ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push("DEVICE LIST");
  lines.push(
    csvRow(["Qty", "Device", "Manufacturer", "Model #", "Type", "Room", "Unit Cost", "Extended Cost"]),
  );
  for (const d of data.devices) {
    const extCost = d.unitCost > 0 ? d.unitCost * d.count : 0;
    lines.push(
      csvRow([
        `${d.count}`,
        d.model,
        d.manufacturer,
        d.modelNumber,
        d.deviceType,
        d.room,
        d.unitCost > 0 ? d.unitCost.toFixed(2) : "",
        extCost > 0 ? extCost.toFixed(2) : "",
      ]),
    );
  }
  const csv = lines.join("\n");
  return {
    csv,
    filename: `${schematicName} - Pack List.csv`,
    rowCount: data.devices.length,
  };
}

export function buildTrackItReportCsv(tab: TrackItExportReportTab): TrackItReportCsvPayload | null {
  const schematicName =
    useSchematicStore.getState().schematicName?.trim() ||
    useSchematicStore.getState().trackItLink?.drawingName?.trim() ||
    "schematic";

  switch (tab) {
    case "network":
      return buildNetworkCsv(schematicName);
    case "cableSchedule":
      return buildCableScheduleCsv(schematicName);
    case "patchPanel":
      return buildPatchPanelCsv(schematicName);
    case "power":
      return buildPowerCsv(schematicName);
    case "packList":
      return buildPackListCsv(schematicName);
    default:
      return null;
  }
}

export function parseTrackItExportTab(raw: unknown): TrackItExportReportTab | null {
  if (typeof raw !== "string") return null;
  const tabs: TrackItExportReportTab[] = [
    "network",
    "packList",
    "cableSchedule",
    "patchPanel",
    "power",
  ];
  return tabs.includes(raw as TrackItExportReportTab) ? (raw as TrackItExportReportTab) : null;
}

export { countDataRows };
