const OPEN_PREFIX = "kgoes:collapsible:";
const PIN_PREFIX = "kgoes:collapsible-pin:";

export function readCollapsibleOpen(persistKey: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${OPEN_PREFIX}${persistKey}`);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCollapsibleOpen(persistKey: string, open: boolean): void {
  try {
    localStorage.setItem(`${OPEN_PREFIX}${persistKey}`, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readCollapsiblePinned(persistKey: string): boolean {
  try {
    return localStorage.getItem(`${PIN_PREFIX}${persistKey}`) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsiblePinned(persistKey: string, pinned: boolean): void {
  try {
    localStorage.setItem(`${PIN_PREFIX}${persistKey}`, pinned ? "1" : "0");
    if (pinned) {
      writeCollapsibleOpen(persistKey, true);
    }
  } catch {
    /* ignore */
  }
}

export function slugCollapsiblePersistKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
