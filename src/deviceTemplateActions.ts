import type { DeviceTemplate } from "./types";

/** Place new editor instances near the printable origin without overlapping typical content. */
export const LIBRARY_EDIT_PLACEMENT = { x: 64, y: 64 };

export function templateKey(template: DeviceTemplate): string {
  return template.id ?? template.deviceType;
}

export function cloneTemplateDeep(template: DeviceTemplate): DeviceTemplate {
  return {
    ...template,
    ports: (template.ports ?? []).map((p) => ({ ...p })),
    searchTerms: template.searchTerms ? [...template.searchTerms] : undefined,
    slots: template.slots?.map((s) => ({ ...s })),
    auxiliaryData: template.auxiliaryData?.map((r) => ({ ...r })),
  };
}

export function cloneForUserLibrary(template: DeviceTemplate, labelSuffix = " (copy)"): DeviceTemplate {
  const clone = cloneTemplateDeep(template);
  return {
    ...clone,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: `${template.label}${labelSuffix}`,
  };
}

export function templateHasTag(template: DeviceTemplate, tag: string): boolean {
  const needle = tag.trim().toLowerCase();
  if (!needle) return true;
  return (template.searchTerms ?? []).some((t) => t.toLowerCase() === needle);
}

export function withSearchTerm(template: DeviceTemplate, tag: string, add: boolean): DeviceTemplate {
  const terms = [...(template.searchTerms ?? [])];
  const idx = terms.findIndex((t) => t.toLowerCase() === tag.toLowerCase());
  if (add && idx === -1) terms.push(tag);
  if (!add && idx >= 0) terms.splice(idx, 1);
  return { ...template, searchTerms: terms.length > 0 ? terms : undefined };
}
