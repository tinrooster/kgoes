import type { DeviceTemplate } from "./types";
import { templateKey } from "./deviceTemplateActions";

export function mergeDeviceLibraryTemplates(
  bundled: DeviceTemplate[],
  custom: DeviceTemplate[],
  hiddenIds: ReadonlySet<string>,
): DeviceTemplate[] {
  const customByKey = new Map(custom.map((t) => [templateKey(t), t]));
  const merged: DeviceTemplate[] = [];
  const seen = new Set<string>();

  for (const bundledTemplate of bundled) {
    const key = templateKey(bundledTemplate);
    if (hiddenIds.has(key)) continue;
    const override = customByKey.get(key);
    merged.push(override ?? bundledTemplate);
    seen.add(key);
  }

  for (const customTemplate of custom) {
    const key = templateKey(customTemplate);
    if (seen.has(key)) continue;
    if (hiddenIds.has(key)) continue;
    merged.push(customTemplate);
    seen.add(key);
  }

  return merged;
}

export function bundledTemplateKeys(bundled: DeviceTemplate[]): Set<string> {
  return new Set(bundled.map((t) => templateKey(t)));
}

export function isPureUserTemplate(template: DeviceTemplate, bundledKeys: ReadonlySet<string>): boolean {
  const key = templateKey(template);
  if (key.startsWith("custom-")) return true;
  return !bundledKeys.has(key);
}
