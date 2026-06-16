const TRUE_VALUES = new Set(["1", "true", "yes"]);
const FALSE_VALUES = new Set(["0", "false", "no"]);

export function isStudioshareInternalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith(".disneystudiostech.com") || host.endsWith(".launch.internal");
}

/**
 * Upstream EasySchematic cloud portal (api.easyschematic.live login, community device submit).
 * Disabled on Disney Studioshare / trackIT-hosted KGO-ES where edge SSO covers access.
 */
export function isCloudPortalEnabled(): boolean {
  const explicit = import.meta.env.VITE_KGO_ES_CLOUD_PORTAL?.trim().toLowerCase();
  if (FALSE_VALUES.has(explicit ?? "")) return false;
  if (TRUE_VALUES.has(explicit ?? "")) return true;
  return import.meta.env.PROD ? !isStudioshareInternalHost() : true;
}
