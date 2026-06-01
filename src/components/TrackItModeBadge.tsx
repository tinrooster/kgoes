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
  focusTrackItOpener,
  openTrackItUrl,
} from "../trackitAppLinks";

const PANEL_CLOSE_DELAY_MS = 450;

function useEditorMode(): TrackItEditorMode {
  const drawingId = useSchematicStore((s) => s.trackItLink?.drawingId);
  if (drawingId) return "linked";
  if (isTrackItPopupOpener()) return "popup-awaiting-link";
  return "standalone";
}

type BadgeStyle = {
  label: string;
  dotColor: string;
  background: string;
  color: string;
};

const BADGE_STYLES: Record<TrackItEditorMode, BadgeStyle> = {
  standalone: {
    label: "standalone",
    dotColor: "var(--ti-muted)",
    background: "var(--ti-surface-2)",
    color: "var(--ti-ink-2)",
  },
  "popup-awaiting-link": {
    label: "trackIT…",
    dotColor: "var(--ti-warning)",
    background: "var(--ti-warning-soft)",
    color: "color-mix(in oklab, var(--ti-warning) 70%, var(--ti-ink))",
  },
  linked: {
    label: "trackIT linked",
    dotColor: "var(--ti-accent)",
    background: "var(--ti-accent-soft)",
    color: "var(--ti-accent-ink)",
  },
};

function formatLastUpdate(iso: string | null | undefined): string {
  if (!iso) return "Not saved to trackIT yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not saved to trackIT yet";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "5.5rem 1fr",
        gap: 8,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--ti-muted)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: "var(--ti-ink)", lineHeight: 1.35 }}>{value}</span>
    </div>
  );
}

function PanelAction({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        margin: 0,
        padding: 0,
        border: 0,
        background: "transparent",
        textAlign: "left",
        fontSize: 11,
        fontWeight: primary ? 600 : 500,
        fontFamily: "var(--ti-font-sans)",
        color: primary ? "var(--ti-accent)" : "var(--ti-ink-2)",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 2,
      }}
      className="hover:opacity-80"
    >
      {label} →
    </button>
  );
}

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

  const panel = useMemo(() => {
    const hasDevices = deviceCount > 0;
    const canFocusOpener = isTrackItPopupOpener();

    if (mode === "standalone") {
      return {
        title: "Standalone KGO-ES",
        statusLabel: "Not linked",
        statusDetail: "Saves to this browser or a file on disk.",
        lastUpdate: "—",
        drawingLine: undefined as string | undefined,
        href: buildTrackItPlantDrawingsUrl(),
        linkLabel: "Link a drawing in trackIT",
        showFocus: false,
        showSave: false,
      };
    }

    if (mode === "popup-awaiting-link") {
      return {
        title: "Opened from trackIT",
        statusLabel: "Waiting for link",
        statusDetail: "Return to trackIT and use Open KGO-ES on a drawing row.",
        lastUpdate: "—",
        drawingLine: undefined,
        href: buildTrackItPlantDrawingsUrl(),
        linkLabel: "Open trackIT → Drawings",
        showFocus: canFocusOpener,
        showSave: false,
      };
    }

    const dwg = link?.dwgNumber ? `DWG ${link.dwgNumber}` : "Drawing";
    const name = link?.drawingName?.trim();
    const autosaveNote = !hasDevices
      ? "Add a device to enable autosave (every 60s)."
      : "Autosave every 60s after edits.";

    return {
      title: "Linked to trackIT",
      statusLabel: "Linked",
      statusDetail: autosaveNote,
      lastUpdate: formatLastUpdate(lastPushed),
      drawingLine: name ? `${dwg} — ${name}` : dwg,
      href: link?.drawingId
        ? buildTrackItPlantDrawingUrl({
            drawingId: link.drawingId,
            dwgNumber: link.dwgNumber,
          })
        : buildTrackItPlantDrawingsUrl(),
      linkLabel: link?.drawingId ? "Open this drawing in trackIT" : "Open trackIT → Drawings",
      showFocus: canFocusOpener,
      showSave: true,
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
        aria-expanded={open}
        aria-haspopup="dialog"
        title={panel.title}
        onFocus={showPanel}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 20,
          padding: "0 8px",
          borderRadius: 999,
          background: badge.background,
          color: badge.color,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.01em",
          flexShrink: 0,
          border: 0,
          fontFamily: "var(--ti-font-sans)",
          cursor: "help",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: badge.dotColor,
            flexShrink: 0,
          }}
        />
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
            aria-label={panel.title}
            style={{
              borderRadius: "var(--ti-radius-md)",
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface)",
              padding: "10px 12px",
              textAlign: "left",
              boxShadow: "var(--ti-shadow-lg)",
              fontFamily: "var(--ti-font-sans)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ti-ink)",
              }}
            >
              {panel.title}
            </p>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <PanelRow label="Link status" value={panel.statusLabel} />
              <p style={{ margin: "-2px 0 0 0", fontSize: 10.5, color: "var(--ti-muted)", lineHeight: 1.4 }}>
                {panel.statusDetail}
              </p>
              <PanelRow label="Last update" value={panel.lastUpdate} />
              {panel.drawingLine ? <PanelRow label="Drawing" value={panel.drawingLine} /> : null}
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--ti-divider)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <PanelAction label={panel.linkLabel} onClick={() => openTrackItUrl(panel.href)} primary />
              {panel.showFocus ? (
                <PanelAction
                  label="Switch to trackIT"
                  onClick={() => {
                    if (!focusTrackItOpener()) openTrackItUrl(panel.href);
                  }}
                />
              ) : null}
              {panel.showSave && isTrackItDrawingLinked() ? (
                <button
                  type="button"
                  onClick={() => saveToTrackItParent()}
                  style={{
                    display: "block",
                    width: "100%",
                    margin: 0,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "var(--ti-font-sans)",
                    color: "var(--ti-muted)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                  className="hover:text-[var(--ti-ink)]"
                >
                  Save to trackIT now (Ctrl+S)
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
