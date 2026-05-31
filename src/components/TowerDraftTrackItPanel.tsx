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
    <div className="border-b border-[var(--color-border)] shrink-0" data-print-hide>
      <button
        type="button"
        className="w-full px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-[var(--color-surface-hover)]"
        onClick={() => setOpen((v) => !v)}
      >
        trackIT site {open ? "▾" : "▸"}
      </button>
      {open && context ? (
        <div className="px-2 pb-2 space-y-1.5 text-[11px]">
          <div className="font-medium text-[var(--color-text)] truncate" title={context.siteName}>
            {context.siteName} ({context.siteCode})
          </div>
          <div className="text-[var(--color-text-muted)]">
            {context.towerHeightFt}′ tower
            {context.towerCompany ? ` · ${context.towerCompany}` : ""}
            {context.callSign ? ` · ${context.callSign}` : ""}
          </div>
          {context.latitude != null && context.longitude != null ? (
            <div className="text-[var(--color-text-muted)] font-mono tabular-nums">
              {context.latitude.toFixed(5)}, {context.longitude.toFixed(5)}
            </div>
          ) : null}
          {context.antennaLevels.length === 0 ? (
            <p className="text-[var(--color-text-muted)]">No antenna levels in trackIT yet.</p>
          ) : (
            <ul className="space-y-0.5 max-h-28 overflow-y-auto">
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
                      className="w-full text-left truncate hover:text-blue-600 dark:hover:text-blue-400"
                      title={`${level.code} · ${level.mountHeightM?.toFixed(1) ?? "?"} m`}
                      onClick={() => onSelectLevel(level.id)}
                    >
                      <span className="text-[10px] mr-1">{badge}</span>
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
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
            onClick={openInTrackIt}
          >
            Open tower stack in trackIT
          </button>
        </div>
      ) : null}
    </div>
  );
}
