import { isStudioshareInternalHost } from "./deployMode";

const TRUE_VALUES = new Set(["1", "true", "yes"]);

function isLocalDevHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}

/** Map Studioshare ES hostnames to the trackIT origin that hosts /api/launch/*. */
function inferTrackItOriginFromLaunchEsHost(hostname: string, protocol: string): string | null {
  const h = hostname.toLowerCase();
  if (h === "es.disneystudiostech.com") return `${protocol}//ti.disneystudiostech.com`;
  if (h.startsWith("es.") && h.endsWith(".disneystudiostech.com")) {
    return `${protocol}//ti.${h.slice(3)}`;
  }
  if (h === "kgoes.disneystudiotech.com") return `${protocol}//ti.disneystudiostech.com`;
  if (h === "ti.disneystudiostech.com" || h === "trackit.disneystudiostech.com") {
    return `${protocol}//${h}`;
  }
  return null;
}

/** trackIT web app origin (plant API + deep links). */
export function resolveTrackItAppOrigin(): string {
  if (typeof window === "undefined") return "";

  try {
    if (window.opener && !window.opener.closed) {
      return window.opener.location.origin;
    }
  } catch {
    // cross-origin opener
  }

  const fromEnv = (import.meta.env.VITE_TRACKIT_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (window.location.pathname.startsWith("/schematic")) {
    return window.location.origin;
  }

  const inferred = inferTrackItOriginFromLaunchEsHost(
    window.location.hostname,
    window.location.protocol,
  );
  if (inferred) return inferred;

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:5173`;
  }

  return window.location.origin;
}

/** Absolute URL for trackIT plant API routes (/api/launch/*). */
export function plantApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const explicit = (import.meta.env.VITE_PLANT_API_URL as string | undefined)?.trim();
  if (explicit && isLocalDevHostname(host)) {
    return `${explicit.replace(/\/$/, "")}${normalized}`;
  }
  return `${resolveTrackItAppOrigin().replace(/\/$/, "")}${normalized}`;
}

/** Standalone ES should submit feedback via Launch plant API when this is true. */
export function isLaunchPlantApiEnabled(): boolean {
  const flag = (import.meta.env.VITE_LAUNCH_DATA_BACKEND as string | undefined)?.trim().toLowerCase();
  if (TRUE_VALUES.has(flag ?? "")) return true;
  if (typeof window !== "undefined" && isStudioshareInternalHost()) return true;
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  if (isLocalDevHostname(host) && (import.meta.env.VITE_PLANT_API_URL as string | undefined)?.trim()) {
    return true;
  }
  return false;
}
