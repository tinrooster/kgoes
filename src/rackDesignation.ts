import type { RackData } from "./types";

/** Extract a numeric rack index from labels like "Rack 7" → "07". */
export function rackDesignationFromLabel(label: string, pad = 2): string | null {
  const trimmed = label.trim();
  const tail = trimmed.match(/(\d+)\s*$/);
  if (tail) return String(parseInt(tail[1], 10)).padStart(pad, "0");
  const any = trimmed.match(/(\d+)/);
  if (any) return String(parseInt(any[1], 10)).padStart(pad, "0");
  return null;
}

/** Plant/cable short code for a rack (explicit designation or derived from label). */
export function resolveRackDesignation(rack: RackData, prefix = "RACK"): string {
  const explicit = rack.designation?.trim();
  if (explicit) return explicit.toUpperCase();
  const num = rackDesignationFromLabel(rack.label);
  if (num) return `${prefix}${num}`;
  return rack.label.trim().toUpperCase().replace(/\s+/g, "");
}

export function formatTrunkCalloutLabel(
  master: RackData,
  target: RackData,
  opts?: { prefix?: string; prefixCode?: string },
): string {
  const labelPrefix = opts?.prefix?.trim() || "Datacom";
  const codePrefix = opts?.prefixCode ?? "RACK";
  const from = resolveRackDesignation(master, codePrefix);
  const to = resolveRackDesignation(target, codePrefix);
  return `${labelPrefix} (${from}→${to})`;
}
