import { getBundledTemplates } from "./templateApi";
import type { DeviceTemplate } from "./types";

/**
 * Runtime device catalog from generated JSON — not live `src/devices/*.ts` modules.
 * Keeps the app loadable when a template source file has a syntax/reference error;
 * fix the TS file and run `Update-KgoDeviceLibrary.ps1` to refresh the fallback.
 */
const allBundled = getBundledTemplates();

export const DEVICE_TEMPLATES: DeviceTemplate[] = allBundled.filter(
  (t) => t.deviceType !== "expansion-card",
);

export const CARD_TEMPLATES: DeviceTemplate[] = allBundled.filter(
  (t) => t.deviceType === "expansion-card",
);
