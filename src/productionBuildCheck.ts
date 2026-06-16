declare const __BUILD_HASH__: string;

const RELOAD_KEY = "kgoes:build-reload-for";

function parseBuildMarker(html: string): string {
  const match = html.match(/<!--\s*kgoes-build:([^\s-]+)\s*-->/);
  return match?.[1]?.trim() ?? "";
}

async function fetchDeployedBuildId(): Promise<string> {
  try {
    const res = await fetch("/build-info.json", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { hash?: string; buildCommit?: string };
      const fromJson = (data.hash ?? data.buildCommit ?? "").trim();
      if (fromJson && fromJson !== "unknown") return fromJson;
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch("/", { cache: "no-store" });
    if (!res.ok) return "";
    return parseBuildMarker(await res.text());
  } catch {
    return "";
  }
}

async function clearServiceWorkersAndReload(deployed: string): Promise<void> {
  if (sessionStorage.getItem(RELOAD_KEY) === deployed) return;
  sessionStorage.setItem(RELOAD_KEY, deployed);

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  window.location.reload();
}

/**
 * If the server build id differs from this bundle, unregister SW and reload once.
 * Fixes stale PWA / precached index.html after Launch redeploys (especially when
 * GIT_COMMIT was not passed and older bundles embedded "unknown").
 */
export async function ensureLatestProductionBuild(): Promise<void> {
  if (import.meta.env.DEV) return;

  const embedded =
    typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__.trim() : "";

  try {
    const deployed = await fetchDeployedBuildId();
    if (!deployed || deployed === "unknown") return;

    const stale =
      !embedded ||
      embedded === "unknown" ||
      embedded !== deployed;

    if (!stale) return;

    await clearServiceWorkersAndReload(deployed);
  } catch {
    /* offline or blocked */
  }
}

/** Re-check when the user returns to a tab that may have been open across a deploy. */
export function watchForProductionBuildUpdates(): void {
  if (import.meta.env.DEV) return;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void ensureLatestProductionBuild();
    }
  });
}
