import { useEffect, useMemo, useRef, useState } from "react";
import { useSchematicStore } from "../store";
import type { TrackItEditorMode } from "../trackitIntegration";
import {
  isTrackItDrawingLinked,
  isTrackItPopupOpener,
  saveToTrackItParent,
} from "../trackitIntegration";
import {
  buildTrackItPlantDrawingUrl,
  buildTrackItPlantDrawingsUrl,
  openTrackItUrl,
} from "../trackitAppLinks";

const PANEL_CLOSE_DELAY_MS = 450;

function useEditorMode(): TrackItEditorMode {
  const drawingId = useSchematicStore((s) => s.trackItLink?.drawingId);
  if (drawingId) return "linked";
  if (isTrackItPopupOpener()) return "popup-awaiting-link";
  return "standalone";
}

const BADGE_STYLES: Record<
  TrackItEditorMode,
  { label: string; className: string }
> = {
  standalone: {
    label: "Standalone",
    className:
      "bg-[var(--color-surface-2)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]",
  },
  "popup-awaiting-link": {
    label: "trackIT…",
    className: "bg-amber-500/15 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/35",
  },
  linked: {
    label: "trackIT linked",
    className: "bg-blue-500/15 text-blue-800 dark:text-blue-200 ring-1 ring-blue-500/35",
  },
};

export default function TrackItModeBadge() {
  const mode = useEditorMode();
  const link = useSchematicStore((s) => s.trackItLink);
  const lastPushed = useSchematicStore((s) => s.trackItLastPushedAt);
  const deviceCount = useSchematicStore((s) => s.nodes.length);
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const showPanel = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleHidePanel = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), PANEL_CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const { title, detailLines, href, linkLabel } = useMemo(() => {
    const hasDevices = deviceCount > 0;

    if (mode === "standalone") {
      return {
        title: "Standalone KGO-ES editor",
        detailLines: [
          "Saves to this browser or a file on disk.",
          "Open a drawing from trackIT Plant → Drawings and choose Open KGO-ES to link and sync to your station register.",
        ],
        href: buildTrackItPlantDrawingsUrl(),
        linkLabel: "Open trackIT → Plant → Drawings",
      };
    }

    if (mode === "popup-awaiting-link") {
      return {
        title: "Opened from trackIT",
        detailLines: [
          "Waiting for the drawing link from trackIT.",
          "If this persists, return to trackIT and use Open KGO-ES on a drawing row.",
        ],
        href: buildTrackItPlantDrawingsUrl(),
        linkLabel: "Open trackIT → Drawings",
      };
    }

    const dwg = link?.dwgNumber ? `DWG ${link.dwgNumber}` : "Drawing";
    const name = link?.drawingName?.trim();
    const lines = [
      name ? `${dwg} — ${name}` : dwg,
      !hasDevices
        ? "Add a device to enable autosave (every 60s). Ctrl+S saves to trackIT anytime."
        : lastPushed
          ? `Last saved ${new Date(lastPushed).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} · autosave every 60s after edits`
          : `Autosave every 60s after edits · ${deviceCount} device${deviceCount === 1 ? "" : "s"} on canvas`,
    ];

    return {
      title: "Linked to trackIT",
      detailLines: lines,
      href: link?.drawingId
        ? buildTrackItPlantDrawingUrl({
            drawingId: link.drawingId,
            dwgNumber: link.dwgNumber,
          })
        : buildTrackItPlantDrawingsUrl(),
      linkLabel: link?.drawingId ? "Open this drawing in trackIT" : "Open trackIT → Drawings",
    };
  }, [mode, link, lastPushed, deviceCount]);

  const badge = BADGE_STYLES[mode];

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={showPanel}
      onMouseLeave={scheduleHidePanel}
    >
      <button
        type="button"
        tabIndex={0}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight cursor-help ${badge.className}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={title}
        onFocus={showPanel}
      >
        {badge.label}
      </button>

      {open ? (
        <div
          className="absolute left-1/2 top-full z-[200] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 pt-2"
          onMouseEnter={showPanel}
          onMouseLeave={scheduleHidePanel}
        >
          <div
            role="dialog"
            aria-label={title}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-[11px] leading-snug text-[var(--color-text)] shadow-lg"
          >
            <p className="font-semibold text-[var(--color-text-heading)]">{title}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[var(--color-text-muted)]">
              {detailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2.5 text-left text-[11px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline-offset-2 hover:underline"
              onClick={() => openTrackItUrl(href)}
            >
              {linkLabel} →
            </button>
            {mode === "linked" && isTrackItDrawingLinked() ? (
              <button
                type="button"
                className="mt-1.5 block text-left text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer underline-offset-2 hover:underline"
                onClick={() => saveToTrackItParent()}
              >
                Save to trackIT now (Ctrl+S)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
