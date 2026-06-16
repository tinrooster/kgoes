import { registerSW } from "virtual:pwa-register";

const UPDATE_RELOAD_KEY = "kgoes:pwa-update-reload";

/**
 * Register the service worker and reload when a new production build is ready.
 * `injectRegister: null` in vite.config — this replaces the minimal auto-injected script
 * that only called register() without reloading long-lived tabs.
 */
export function initPwaAutoUpdate(): void {
  if (import.meta.env.DEV) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (sessionStorage.getItem(UPDATE_RELOAD_KEY)) return;
      sessionStorage.setItem(UPDATE_RELOAD_KEY, "1");
      void updateSW(true);
    },
  });
}
