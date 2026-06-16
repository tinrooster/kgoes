import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSchematicStore } from "../store";
import { useTowerViewportActions } from "../hooks/useTowerViewportActions";
import { getTowerViewportHandle } from "../towerViewportController";
import { visibleContentYRange } from "../towerDraftTallViewport";
import { contentYToMinimapY, towerBandInSvg } from "../towerDraftMinimapCoords";
import { resolveCatalogTowerHeightFtAgl } from "../towerDraftDisplayHeight";
import { TOWER_DRAFT_PX_PER_FT } from "../towerDraftUtils";
import { isPersistedTowerViewport } from "../towerViewportUtils";
import { TiIcon } from "./ti/TiBase";

interface TowerViewportEditorDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function TowerViewportEditorDialog({ open, onClose }: TowerViewportEditorDialogProps) {
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const { towerPage, viewportOptions, viewportId, setViewportId, applyViewportPreset } =
    useTowerViewportActions();
  const [liveBand, setLiveBand] = useState<{ top: number; bottom: number } | null>(null);

  const layout = useMemo(() => {
    if (!towerPage) return null;
    const heightFt = resolveCatalogTowerHeightFtAgl(towerPage, trackItTowerContext);
    const pxPerFt = TOWER_DRAFT_PX_PER_FT;
    const contentOffsetY = 52;
    const band = towerBandInSvg(heightFt, pxPerFt, contentOffsetY);
    return { heightFt, pxPerFt, contentOffsetY, band };
  }, [towerPage, trackItTowerContext]);

  useEffect(() => {
    if (!open || !towerPage) return;
    const tick = () => {
      const handle = getTowerViewportHandle(towerPage.id);
      if (!handle || !layout) return;
      const vp = handle.getViewport();
      const { top, bottom } = visibleContentYRange({
        containerHeight: 480,
        viewOffsetY: vp.pan.y,
        zoom: vp.zoom,
      });
      setLiveBand({ top, bottom });
    };
    tick();
    const id = window.setInterval(tick, 150);
    return () => clearInterval(id);
  }, [open, towerPage, layout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !towerPage || !layout) return null;

  const miniPad = 8;
  const miniH = 420;
  const miniW = 120;
  const innerH = miniH - miniPad * 2;

  const toMiniY = (contentY: number) =>
    contentYToMinimapY(contentY, layout.band, miniPad, innerH);

  const panel = (
    <div
      role="dialog"
      aria-modal
      aria-label="Tower viewport map"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "color-mix(in oklab, var(--ti-ink) 45%, transparent)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(92vw, 520px)",
          height: "min(80vh, 520px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--ti-surface)",
          border: "1px solid var(--ti-border)",
          borderRadius: 12,
          boxShadow: "var(--ti-shadow-lg)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--ti-divider)",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ti-ink)" }}>Tower viewport map</div>
            <div style={{ fontSize: 12, color: "var(--ti-muted)", marginTop: 2 }}>
              {towerPage.label} — double-click a saved view to apply. Dashed band is the live view.
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close" style={{ border: 0, background: "transparent", cursor: "pointer" }}>
            <TiIcon name="x" size={18} color="var(--ti-muted)" />
          </button>
        </header>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <aside style={{ width: 180, borderRight: "1px solid var(--ti-divider)", overflow: "auto", padding: "8px 0" }}>
            {viewportOptions.map((vp) => (
              <button
                key={vp.id}
                type="button"
                onClick={() => setViewportId(vp.id)}
                onDoubleClick={() => applyViewportPreset(vp)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  border: 0,
                  background: viewportId === vp.id ? "var(--ti-accent-soft)" : "transparent",
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: "var(--ti-ink)",
                }}
              >
                {vp.label}
                {!isPersistedTowerViewport(vp) ? (
                  <span style={{ marginLeft: 6, fontSize: 9, color: "var(--ti-faint)", textTransform: "uppercase" }}>
                    auto
                  </span>
                ) : null}
              </button>
            ))}
          </aside>
          <div style={{ flex: 1, display: "grid", placeItems: "center", background: "var(--ti-bg)" }}>
            <svg width={miniW} height={miniH} aria-hidden>
              <rect x={0} y={0} width={miniW} height={miniH} fill="var(--ti-surface-2)" rx={8} />
              <line
                x1={miniW / 2}
                y1={miniPad}
                x2={miniW / 2}
                y2={miniH - miniPad}
                stroke="var(--ti-border)"
                strokeWidth={2}
              />
              {liveBand && (
                <rect
                  x={miniPad}
                  y={Math.min(toMiniY(liveBand.top), toMiniY(liveBand.bottom))}
                  width={miniW - miniPad * 2}
                  height={Math.max(8, Math.abs(toMiniY(liveBand.bottom) - toMiniY(liveBand.top)))}
                  fill="color-mix(in oklab, var(--ti-ink-2) 10%, transparent)"
                  stroke="var(--ti-ink-2)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  rx={3}
                />
              )}
              <text x={miniW / 2} y={miniH - 4} textAnchor="middle" fontSize={9} fill="var(--ti-muted)">
                {layout.heightFt}′ AGL
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
