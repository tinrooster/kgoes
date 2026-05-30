/** Keep aligned with trackIT src/lib/trackit3/kgoEs/kgoDeviceLibraryPrompt.ts */
export const KGO_DEVICE_VENDOR_CODES: { label: string; code: string }[] = [
  { label: "Ross Video", code: "rv" },
  { label: "Evertz", code: "ev" },
  { label: "Grass Valley", code: "gv" },
  { label: "Sony Broadcast", code: "so" },
  { label: "Calrec", code: "cr" },
  { label: "Riedel", code: "ri" },
  { label: "Cobalt Digital", code: "co" },
  { label: "Imagine Communications", code: "im" },
  { label: "Miranda / Grass Valley", code: "mi" },
  { label: "Dalet", code: "da" },
  { label: "AJA", code: "aj" },
  { label: "Blackmagic", code: "bm" },
  { label: "Lumantek", code: "lk" },
];

export const KGO_DEVICE_LIBRARY_PROMPT_TEMPLATE = `You are generating KGO-ES device templates for the KGO broadcast device library.
Output valid TypeScript that can be pasted into kgoes/src/devices/kgo-{vendor}.ts or imported via Devices → Add devices (agent).

SCHEMA: DeviceTemplate fields:
  id, deviceType, label, shortName, manufacturer, modelNumber, referenceUrl,
  searchTerms, heightMm, widthMm, depthMm, weightKg, powerDrawW, powerCapacityW,
  voltage, slots, slotFamily, ports, color,
  rackHeightU, mountingClass, rackForm, rackMetadataSource, auxiliaryData

FILE SHAPE (required):
  import { port, ports, patchPanelCircuits, trunkPort } from "./_helpers";
  import type { DeviceTemplate } from "../types";
  export const templates: DeviceTemplate[] = [
    { id: "kgo-...", deviceType: "...", label: "...", ports: [ port(...) ], ... },
  ];

RULES:
- IDs: "kgo-{code}-{seq4}-0000-4000-8000-{seq12}"
- searchTerms: include "kgo-es-deviceadd" as last term
- rackHeightU for 1U/3U/6U — never rackForm: "3RU"
- One paste = one vendor code`;

export function buildKgoDeviceLibraryPrompt(opts: {
  spec: string;
  manufacturer: string;
  model: string;
  vendorCode: string;
}): string {
  const hints: string[] = [];
  if (opts.manufacturer) hints.push(`- Manufacturer: ${opts.manufacturer}`);
  if (opts.model) hints.push(`- Model: ${opts.model}`);
  if (opts.vendorCode) hints.push(`- Vendor code: ${opts.vendorCode}`);
  const hintsBlock = hints.length > 0 ? `\nDEVICE HINTS:\n${hints.join("\n")}\n` : "";
  return `${KGO_DEVICE_LIBRARY_PROMPT_TEMPLATE}${hintsBlock}\nMANUFACTURER SPEC:\n${opts.spec.trim()}`;
}
