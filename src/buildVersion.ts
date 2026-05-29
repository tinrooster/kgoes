import { useEffect, useState } from "react";
import packageJson from "../package.json";

declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;

const DEV_BUILD_INFO_PATH = "/__kgoes-build-info.json";

let devBuildHash: string | null = null;
let devBuildVersion: string | null = null;

function formatCommitHash(hash: string): string {
  return hash ? hash.toUpperCase() : "";
}

/** App semver from package.json (always current in dev). */
export function getAppVersion(): string {
  if (import.meta.env.DEV && devBuildVersion) return devBuildVersion;
  return packageJson.version ?? __APP_VERSION__ ?? "0.0.0";
}

/** Short git commit hash from build, or dev refresh endpoint. */
export function getAppBuildHash(): string {
  if (import.meta.env.DEV && devBuildHash) return formatCommitHash(devBuildHash);
  const hash = typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__ : "";
  return hash && hash !== "unknown" ? formatCommitHash(hash) : "";
}

/** Legacy single-line label (About copy button, etc.). */
export function getAppVersionLabel(): string {
  const hash = getAppBuildHash();
  return hash ? `${getAppVersion()} (${hash})` : getAppVersion();
}

/** Fetch latest git hash from the Vite dev server (no full restart needed). */
export async function refreshDevBuildHash(): Promise<string> {
  if (!import.meta.env.DEV) return getAppBuildHash();
  try {
    const res = await fetch(DEV_BUILD_INFO_PATH, { cache: "no-store" });
    if (!res.ok) return getAppBuildHash();
    const data = (await res.json()) as { hash?: string; version?: string };
    if (data.hash) devBuildHash = data.hash;
    if (data.version) devBuildVersion = data.version;
  } catch {
    // dev middleware unavailable
  }
  return getAppBuildHash();
}

/**
 * Version + commit for Help / About footers.
 * Pass `refreshWhen` truthy (e.g. Help menu open) to reload commit hash in dev.
 */
export function useAppBuildInfo(refreshWhen?: boolean): { version: string; commit: string } {
  const [commit, setCommit] = useState(getAppBuildHash);

  useEffect(() => {
    void refreshDevBuildHash().then(setCommit);
  }, [refreshWhen]);

  return { version: getAppVersion(), commit };
}
