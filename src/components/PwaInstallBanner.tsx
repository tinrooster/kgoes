import { useEffect, useState } from "react";
import { isTrackItPopupOpener } from "../trackitIntegration";
import {
  canPromptPwaInstall,
  initPwaInstallCapture,
  isIosInstallable,
  isPwaStandalone,
  promptPwaInstall,
  subscribePwaInstallable,
} from "../pwaInstall";
import { KGO_ES_NAME } from "../branding";

const DISMISS_KEY = "kgo-es:pwa-install-dismissed";

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    initPwaInstallCapture();
    if (import.meta.env.DEV || isPwaStandalone() || isTrackItPopupOpener()) return;

    const sync = () => {
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") {
          setVisible(false);
          return;
        }
      } catch {
        /* ignore */
      }
      const canInstall = canPromptPwaInstall();
      const ios = isIosInstallable();
      setIosHint(ios && !canInstall);
      setVisible(canInstall || ios);
    };

    sync();
    return subscribePwaInstallable(sync);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const handleInstall = async () => {
    const outcome = await promptPwaInstall();
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <div
      className="text-sm px-4 py-2 flex items-center justify-between gap-4 border-b border-[var(--color-border)]"
      style={{ background: "var(--color-surface)", color: "var(--color-text)" }}
      data-print-hide
    >
      <span className="min-w-0">
        {iosHint ? (
          <>
            Install <strong>{KGO_ES_NAME}</strong> from your browser menu (Share → Add to Home Screen) for a
            dedicated app window without tabs.
          </>
        ) : (
          <>
            Install <strong>{KGO_ES_NAME}</strong> for a dedicated desktop app — open from your taskbar or dock
            instead of a browser tab.
          </>
        )}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {!iosHint ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="text-xs font-semibold px-3 py-1.5 rounded cursor-pointer transition-colors"
            style={{ background: "var(--color-accent)", color: "var(--color-accent-text, #fff)" }}
          >
            Install app
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="text-xs cursor-pointer hover:underline"
          style={{ color: "var(--color-text-muted)" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
