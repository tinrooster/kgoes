declare const __BUILD_HASH__: string;

const RELOAD_KEY = "kgoes:build-reload-for";

/**
 * If the server build-info commit differs from this bundle, unregister SW and reload once.
 * Fixes stale PWA / cached index.html after Launch deploys.
 */
export async function ensureLatestProductionBuild(): Promise<void> {
  if (import.meta.env.DEV) return;

  const embedded = typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__.trim() : "";
  if (!embedded || embedded === "unknown") return;

  try {
    const res = await fetch("/build-info.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { hash?: string; buildCommit?: string };
    const deployed = (data.hash ?? data.buildCommit ?? "").trim();
    if (!deployed || deployed === "unknown" || deployed === embedded) return;

    if (sessionStorage.getItem(RELOAD_KEY) === deployed) return;
    sessionStorage.setItem(RELOAD_KEY, deployed);

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    window.location.reload();
  } catch {
    /* offline or blocked */
  }
}
