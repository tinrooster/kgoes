/**
 * Shared light/dark shell between trackIT and KGO-ES (localStorage + postMessage).
 * Keep in sync with trackIT_v2/src/lib/sharedAppearanceBridge.ts
 */

export type SharedAppearanceShell = "light" | "dark";

export type ThemeModeSetting = "light" | "dark" | "system" | "org";

export const SHARED_APPEARANCE_STORAGE_KEY = "trackit-shared-appearance";

export const SHARED_APPEARANCE_EVENT = "trackit-shared-appearance-change";

export const APPEARANCE_SYNC_MESSAGE = "TRACKIT_APPEARANCE_SYNC";

const LEGACY_KGO_ES_THEME_KEY = "easyschematic-theme";

export type AppearanceSyncPayload = {
  shell: SharedAppearanceShell;
  themeMode?: ThemeModeSetting;
};

function isShell(value: string | null | undefined): value is SharedAppearanceShell {
  return value === "light" || value === "dark";
}

export function readSharedAppearanceShell(): SharedAppearanceShell | null {
  try {
    const stored = localStorage.getItem(SHARED_APPEARANCE_STORAGE_KEY);
    if (isShell(stored)) return stored;
    const legacy = localStorage.getItem(LEGACY_KGO_ES_THEME_KEY);
    if (isShell(legacy)) {
      localStorage.setItem(SHARED_APPEARANCE_STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // ignore
  }
  return null;
}

export function writeSharedAppearanceShell(
  shell: SharedAppearanceShell,
  opts?: { broadcast?: boolean },
): void {
  try {
    localStorage.setItem(SHARED_APPEARANCE_STORAGE_KEY, shell);
    localStorage.setItem(LEGACY_KGO_ES_THEME_KEY, shell);
  } catch {
    // ignore
  }
  if (opts?.broadcast !== false) {
    window.dispatchEvent(
      new CustomEvent(SHARED_APPEARANCE_EVENT, { detail: { shell } satisfies AppearanceSyncPayload }),
    );
  }
}

export function toggleSharedAppearanceShell(currentIsDark: boolean): SharedAppearanceShell {
  const next: SharedAppearanceShell = currentIsDark ? "light" : "dark";
  writeSharedAppearanceShell(next);
  return next;
}

export function subscribeSharedAppearance(
  handler: (payload: AppearanceSyncPayload) => void,
): () => void {
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<AppearanceSyncPayload>).detail;
    if (detail?.shell) handler(detail);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SHARED_APPEARANCE_STORAGE_KEY) return;
    if (isShell(event.newValue)) handler({ shell: event.newValue });
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== APPEARANCE_SYNC_MESSAGE) return;
    const payload = event.data.payload as AppearanceSyncPayload | undefined;
    if (payload?.shell) {
      writeSharedAppearanceShell(payload.shell, { broadcast: false });
      handler(payload);
    }
  };
  window.addEventListener(SHARED_APPEARANCE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  window.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener(SHARED_APPEARANCE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("message", onMessage);
  };
}

export function postAppearanceSync(target: Window, payload: AppearanceSyncPayload): void {
  try {
    if (target.closed) return;
    target.postMessage({ type: APPEARANCE_SYNC_MESSAGE, payload }, "*");
  } catch {
    // cross-origin
  }
}

export function broadcastAppearanceToTrackItOpener(payload: AppearanceSyncPayload): void {
  try {
    if (window.opener && !window.opener.closed) {
      postAppearanceSync(window.opener, payload);
    }
  } catch {
    // ignore
  }
}
