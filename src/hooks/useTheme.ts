import { useCallback, useEffect, useState } from "react";
import {
  broadcastAppearanceToTrackItOpener,
  readSharedAppearanceShell,
  subscribeSharedAppearance,
  toggleSharedAppearanceShell,
  writeSharedAppearanceShell,
  type SharedAppearanceShell,
} from "../sharedAppearanceBridge";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveInitialShell(): SharedAppearanceShell {
  const shared = readSharedAppearanceShell();
  if (shared) return shared;
  return systemPrefersDark() ? "dark" : "light";
}

function applyShellToDocument(shell: SharedAppearanceShell): void {
  const isDark = shell === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", shell);
}

export function useTheme() {
  const [shell, setShell] = useState<SharedAppearanceShell>(() => resolveInitialShell());

  useEffect(() => {
    applyShellToDocument(shell);
    writeSharedAppearanceShell(shell, { broadcast: false });
  }, [shell]);

  useEffect(() => {
    return subscribeSharedAppearance((payload) => {
      setShell(payload.shell);
    });
  }, []);

  const isDark = shell === "dark";

  const toggle = useCallback(() => {
    setShell((prev) => {
      const next = toggleSharedAppearanceShell(prev === "dark");
      broadcastAppearanceToTrackItOpener({ shell: next });
      return next;
    });
  }, []);

  const setAppearanceShell = useCallback((next: SharedAppearanceShell) => {
    setShell(next);
    writeSharedAppearanceShell(next);
    broadcastAppearanceToTrackItOpener({ shell: next });
  }, []);

  return { isDark, shell, toggle, setAppearanceShell };
}
