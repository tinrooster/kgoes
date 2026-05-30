import type { TowerDraftLineStyle, TowerDraftPage } from "../types";
import { TOWER_DRAFT_SNAP_LEVEL } from "../towerDraftUtils";
import type { TowerElevationView } from "../towerDraftFaces";
import { TOWER_FACE_LABELS } from "../towerDraftFaces";
import { formatDistanceFromFt, type MeasurementSystem } from "../measurementUnits";

export interface TowerDraftDrawStyle {
  strokeWidth: number;
  lineStyle: TowerDraftLineStyle;
  strokeColor: string;
}

interface TowerDraftToolbarProps {
  drawMode: boolean;
  drawLatched: boolean;
  onDrawModeChange: (on: boolean) => void;
  onDrawLatchedChange: (latched: boolean) => void;
  snapFt: number;
  onSnapFtChange: (ft: number) => void;
  drawStyle: TowerDraftDrawStyle;
  onDrawStyleChange: (patch: Partial<TowerDraftDrawStyle>) => void;
  onSyncFromSchematic?: () => void;
  onSuggestFeedlines?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  labelLayers: NonNullable<TowerDraftPage["labelLayers"]>;
  onLabelLayersChange: (patch: Partial<NonNullable<TowerDraftPage["labelLayers"]>>) => void;
  elevationView: TowerElevationView;
  onElevationViewChange: (view: TowerElevationView) => void;
  measurementSystem: MeasurementSystem;
}

export default function TowerDraftToolbar({
  drawMode,
  drawLatched,
  onDrawModeChange,
  onDrawLatchedChange,
  snapFt,
  onSnapFtChange,
  drawStyle,
  onDrawStyleChange,
  onSyncFromSchematic,
  onSuggestFeedlines,
  onExportCsv,
  onPrint,
  labelLayers,
  onLabelLayersChange,
  elevationView,
  onElevationViewChange,
  measurementSystem,
}: TowerDraftToolbarProps) {
  const toggleOff =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer whitespace-nowrap";
  const toggleOn =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-blue-600 bg-blue-600 text-white shadow-sm cursor-pointer whitespace-nowrap";
  const latchedOn =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-amber-500 bg-amber-500 text-white shadow-sm cursor-pointer whitespace-nowrap";
  const drawBtnClass = drawMode ? (drawLatched ? latchedOn : toggleOn) : toggleOff;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
      data-print-hide
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
        Tower draft
      </span>

      <div className="flex items-center gap-0.5 rounded-md border border-[var(--color-border)] p-0.5">
        {(["profile", "all-faces", "N", "S", "E", "W"] as TowerElevationView[]).map((view) => {
          const active = elevationView === view;
          const label =
            view === "profile" ? "Profile" : view === "all-faces" ? "All" : view;
          const title =
            view === "profile"
              ? "Centerline elevation"
              : view === "all-faces"
                ? "North, East, South, West faces side by side"
                : `${TOWER_FACE_LABELS[view]} face equipment`;
          return (
            <button
              key={view}
              type="button"
              title={title}
              className={active ? toggleOn : toggleOff}
              onClick={() => onElevationViewChange(view)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button type="button" className={drawBtnClass} aria-pressed={drawMode} onClick={() => {
        if (drawMode) { onDrawModeChange(false); onDrawLatchedChange(false); }
        else { onDrawModeChange(true); onDrawLatchedChange(false); }
      }} onDoubleClick={(e) => { e.preventDefault(); onDrawModeChange(true); onDrawLatchedChange(true); }}>
        Draw lines{drawLatched && drawMode ? " ⧉" : ""}
      </button>

      {drawMode && (
        <>
          <label className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            Weight
            <select value={drawStyle.strokeWidth} onChange={(e) => onDrawStyleChange({ strokeWidth: Number(e.target.value) })} className="text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5">
              <option value={0.75}>Hairline</option>
              <option value={1}>Thin</option>
              <option value={1.5}>Medium</option>
              <option value={2.5}>Heavy</option>
              <option value={4}>Bold</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            Type
            <select value={drawStyle.lineStyle} onChange={(e) => onDrawStyleChange({ lineStyle: e.target.value as TowerDraftLineStyle })} className="text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            Color
            <input type="color" value={drawStyle.strokeColor} onChange={(e) => onDrawStyleChange({ strokeColor: e.target.value })} className="w-7 h-6 rounded border border-[var(--color-border)] cursor-pointer p-0" />
          </label>
        </>
      )}

      <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        Snap
        <select value={snapFt} onChange={(e) => onSnapFtChange(Number(e.target.value))} className="text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5">
          <option value={0}>Off</option>
          <option value={TOWER_DRAFT_SNAP_LEVEL}>Level</option>
          <option value={1}>{formatDistanceFromFt(1, measurementSystem)}</option>
          <option value={5}>{formatDistanceFromFt(5, measurementSystem)}</option>
          <option value={10}>{formatDistanceFromFt(10, measurementSystem)}</option>
        </select>
      </label>

      {onSyncFromSchematic && (
        <button type="button" className={toggleOff} onClick={onSyncFromSchematic}>Sync from schematic</button>
      )}
      {onSuggestFeedlines && (
        <button type="button" className={toggleOff} onClick={onSuggestFeedlines}>Suggest feedlines</button>
      )}
      {onExportCsv && (
        <button type="button" className={toggleOff} onClick={onExportCsv}>Export CSV</button>
      )}
      {onPrint && (
        <button type="button" className={toggleOff} onClick={onPrint}>Print tab</button>
      )}

      <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
        <input type="checkbox" checked={!!labelLayers.designation} onChange={(e) => onLabelLayersChange({ designation: e.target.checked })} />
        Designation
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
        <input type="checkbox" checked={!!labelLayers.azimuth} onChange={(e) => onLabelLayersChange({ azimuth: e.target.checked })} />
        Azimuth
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
        <input type="checkbox" checked={!!labelLayers.band} onChange={(e) => onLabelLayersChange({ band: e.target.checked })} />
        Band
      </label>
    </div>
  );
}
