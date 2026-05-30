import type { DeviceTemplate } from "./types";
import { checkSession, createDraft, createHandoff } from "./templateApi";

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

export function buildCommunityDraftFromTemplate(template: DeviceTemplate): Record<string, unknown> {
  let deviceType = template.deviceType?.trim() || "custom";
  if (deviceType.startsWith("custom-")) deviceType = "";

  const ports = (template.ports ?? [])
    .filter((p) => p.label?.trim())
    .map((p, i) => ({
      ...p,
      id: `tpl-${i}`,
      label: p.label.trim(),
    }));

  const draft: Record<string, unknown> = {
    label: template.label?.trim() || "Custom Device",
    deviceType,
    ports,
  };

  if (template.shortName?.trim()) draft.shortName = template.shortName.trim();
  if (template.color) draft.color = template.color;
  if (template.manufacturer?.trim()) draft.manufacturer = template.manufacturer.trim();
  if (template.modelNumber?.trim()) draft.modelNumber = template.modelNumber.trim();
  if (template.referenceUrl?.trim()) draft.referenceUrl = template.referenceUrl.trim();
  if (template.category?.trim()) draft.category = template.category.trim();
  if (template.hostname?.trim()) draft.hostname = template.hostname.trim();
  if (template.powerDrawW != null) draft.powerDrawW = template.powerDrawW;
  if (template.powerCapacityW != null) draft.powerCapacityW = template.powerCapacityW;
  if (template.voltage) draft.voltage = template.voltage;
  if (template.thermalBtuh != null) draft.thermalBtuh = template.thermalBtuh;
  if (template.poeBudgetW != null) draft.poeBudgetW = template.poeBudgetW;
  if (template.poeDrawW != null) draft.poeDrawW = template.poeDrawW;
  if (template.unitCost != null) draft.unitCost = template.unitCost;
  if (template.heightMm != null) draft.heightMm = template.heightMm;
  if (template.widthMm != null) draft.widthMm = template.widthMm;
  if (template.depthMm != null) draft.depthMm = template.depthMm;
  if (template.weightKg != null) draft.weightKg = template.weightKg;
  if (template.isVenueProvided) draft.isVenueProvided = true;
  if (template.slots?.length) draft.slots = template.slots;
  if (template.slotFamily) draft.slotFamily = template.slotFamily;
  if (template.auxiliaryData?.some((r) => r.text?.trim())) {
    draft.auxiliaryData = template.auxiliaryData;
  }
  if (template.searchTerms?.length) {
    draft.searchTerms = template.searchTerms.slice(0, 20);
  }

  return draft;
}

const PENDING_SUBMISSION_KEY = "easyschematic-pending-submission";

export async function submitTemplateToCommunity(
  template: DeviceTemplate,
): Promise<"opened" | "login_required"> {
  const draftData = buildCommunityDraftFromTemplate(template);
  if (!Array.isArray(draftData.ports) || draftData.ports.length === 0) {
    throw new Error("Template has no ports to submit");
  }

  const devicesUrl = import.meta.env.VITE_DEVICES_URL ?? "https://devices.easyschematic.live";
  const user = await checkSession();
  if (!user) {
    localStorage.setItem(
      PENDING_SUBMISSION_KEY,
      JSON.stringify({ data: draftData, timestamp: Date.now() }),
    );
    return "login_required";
  }

  const draftId = await createDraft(draftData);
  let url = `${devicesUrl}/#/submit?draft=${draftId}`;
  try {
    const authToken = await createHandoff();
    url += `&auth=${authToken}`;
  } catch {
    /* cookie domain should handle it */
  }
  window.open(url, "_blank");
  return "opened";
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
