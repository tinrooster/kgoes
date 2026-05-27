import { patchPanelCircuits } from "./_helpers";
import { buildVjf64Layout } from "../vjfLayout";
import type { DeviceTemplate } from "../types";

function vjf64Template(
  id: string,
  label: string,
  panelTitle: string,
  searchTerms: string[],
): DeviceTemplate {
  const ports = patchPanelCircuits("Port ", 64, {
    signalType: "sdi",
    rearConnectorType: "bnc",
    frontConnectorType: "bnc",
  });
  return {
    id,
    deviceType: "patch-panel",
    label,
    searchTerms,
    rackHeightU: 2,
    mountingClass: "rack-full",
    heightMm: 89,
    widthMm: 482,
    depthMm: 120,
    rackMetadataSource: "library",
    panelLayoutPreset: "vjf-2x32",
    facePlateLayout: buildVjf64Layout(ports, panelTitle),
    ports,
  };
}

export const templates: DeviceTemplate[] = [
  vjf64Template(
    "c0a80101-0280-4000-8000-000000000801",
    "VJF 64 — HD Router Sources",
    "HD ROUTER SOURCES",
    ["vjf", "video jack field", "patch panel", "64", "router sources", "bnc", "sdi"],
  ),
  vjf64Template(
    "c0a80101-0281-4000-8000-000000000802",
    "VJF 64 — HD Router Destinations",
    "HD ROUTER DESTINATIONS",
    ["vjf", "video jack field", "patch panel", "64", "router destinations", "bnc", "sdi"],
  ),
];
