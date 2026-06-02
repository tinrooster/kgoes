import { useState } from "react";
import { useSchematicStore } from "../store";
import type { TowerDraftPage } from "../types";
import { mountHeightMToFtAgl, placementSyncStatus } from "../towerDraftUtils";

interface TowerDraftTrackItPanelProps {
  page: TowerDraftPage;
  onSelectLevel: (plantLocationId: string) => void;
}

export default function TowerDraftTrackItPanel({ page, onSelectLevel }: TowerDraftTrackItPanelProps) {
  const context = useSchematicStore((s) => s.trackItTowerContext);
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const [open, setOpen] = useState(true);

  if (!context && !trackItLink) return null;

  const openInTrackIt = () => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "KGO_ES_FOCUS_TOWER_LEVEL",
            payload: { siteCode: context?.siteCode },
          },
          "*",
        );
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="shrink-0"
      style={{ borderBottom: "1px solid var(--ti-border)", fontFamily: "var(--ti-font-sans)" }}
      data-print-hide
    >
      <button
        type="button"
        className="ti-row-hover w-full text-left"
        style={{
          padding: "6px 8px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--ti-accent)",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        trackIT site {open ? "▾" : "▸"}
      </button>
      {open && context ? (
        <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
          <div
            style={{ fontWeight: 500, color: "var(--ti-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={context.siteName}
          >
            {context.siteName} ({context.siteCode})
          </div>
          <div style={{ color: "var(--ti-muted)" }}>
            {context.towerHeightFt}′ tower
            {context.towerCompany ? ` · ${context.towerCompany}` : ""}
            {context.callSign ? ` · ${context.callSign}` : ""}
          </div>
          {context.latitude != null && context.longitude != null ? (
            <div style={{ color: "var(--ti-muted)", fontFamily: "var(--ti-font-mono)", fontSize: 10 }}>
              {context.latitude.toFixed(5)}, {context.longitude.toFixed(5)}
            </div>
          ) : null}
          {context.antennaLevels.length === 0 ? (
            <p style={{ color: "var(--ti-muted)" }}>No antenna levels in trackIT yet.</p>
          ) : (
            <ul style={{ maxHeight: 112, overflowY: "auto" }}>
              {context.antennaLevels.map((level) => {
                const pl = page.placements.find((p) => p.plantLocationId === level.id);
                const status = pl
                  ? placementSyncStatus(pl, context.antennaLevels)
                  : "unassigned";
                const badge =
                  status === "mismatch" ? "⚠" : status === "linked" ? "✓" : "○";
                return (
                  <li key={level.id}>
                    <button
                      type="button"
                      className="ti-row-hover w-full text-left"
                      style={{ padding: "2px 4px", fontSize: 11, color: "var(--ti-ink-2)", borderRadius: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={`${level.code} · ${level.mountHeightM?.toFixed(1) ?? "?"} m`}
                      onClick={() => onSelectLevel(level.id)}
                    >
                      <span style={{ fontSize: 10, marginRight: 3 }}>{badge}</span>
                      {level.mountHeightM != null
                        ? `${mountHeightMToFtAgl(level.mountHeightM)}′`
                        : "—"}{" "}
                      · {level.sectorLabel || level.code}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            style={{ fontSize: 10, color: "var(--ti-accent)", textAlign: "left", textDecoration: "underline", cursor: "pointer" }}
            onClick={openInTrackIt}
          >
            Open tower stack in trackIT
          </button>
        </div>
      ) : null}
    </div>
  );
}
