import type { TowerDraftLineStyle, TowerDraftPage } from "../types";
import { TOWER_DRAFT_SNAP_LEVEL } from "../towerDraftUtils";
import type { TowerFaceFilter, TowerMainView } from "../towerDraftFaces";
import type { TowerElevationReferenceVariant } from "../towerElevationReference";
import { formatDistanceFromFt, type MeasurementSystem } from "../measurementUnits";
import { TiDivider, TiIcon, TiSeg } from "./ti/TiBase";

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
  mainView: TowerMainView;
  faceFilter: TowerFaceFilter;
  onMainViewChange: (view: TowerMainView) => void;
  onFaceFilterChange: (face: TowerFaceFilter) => void;
  measurementSystem: MeasurementSystem;
  /** When set, show silhouette / blueprint toggle on profile view. */
  referenceVariant?: TowerElevationReferenceVariant;
  onReferenceVariantChange?: (variant: TowerElevationReferenceVariant) => void;
  hasBlueprintReference?: boolean;
  /** Any mountaintop reference underlay (silhouette or blueprint) on profile view. */
  hasProfileReference?: boolean;
  onSiteSetup?: () => void;
}

function TwToolBtn({
  icon,
  label,
  active,
  onClick,
  onDoubleClick,
  title,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 10px",
        borderRadius: 7,
        border: `1px solid ${active ? "var(--ti-accent)" : "var(--ti-border)"}`,
        background: active ? "var(--ti-accent-soft)" : "var(--ti-surface)",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
        whiteSpace: "nowrap",
        cursor: "pointer",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <TiIcon name={icon} size={13} color="var(--ti-muted)" />
      {label}
    </button>
  );
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
  mainView,
  faceFilter,
  onMainViewChange,
  onFaceFilterChange,
  measurementSystem,
  referenceVariant = "primary",
  onReferenceVariantChange,
  hasBlueprintReference = false,
  hasProfileReference = false,
  onSiteSetup,
}: TowerDraftToolbarProps) {
  const toggleDraw = () => {
    if (drawMode) {
      onDrawModeChange(false);
      onDrawLatchedChange(false);
    } else {
      onDrawModeChange(true);
      onDrawLatchedChange(false);
    }
  };

  return (
    <div
      data-print-hide
      style={{
        minHeight: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 16px",
        borderBottom: "1px solid var(--ti-border)",
        background: "var(--ti-surface-2)",
        flexWrap: "wrap",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <TiSeg
        size="sm"
        value={mainView}
        onChange={(v) => onMainViewChange(v as TowerMainView)}
        options={[
          { value: "profile", label: "Profile" },
          { value: "faces", label: "All faces" },
          { value: "site", label: "Site plan" },
        ]}
      />

      {mainView === "profile" && hasBlueprintReference && onReferenceVariantChange ? (
        <TiSeg
          size="sm"
          value={referenceVariant}
          onChange={(v) => onReferenceVariantChange(v as TowerElevationReferenceVariant)}
          options={[
            { value: "primary", label: "Silhouette" },
            { value: "blueprint", label: "Blueprint" },
          ]}
        />
      ) : null}

      {mainView === "faces" && (
        <div style={{ display: "flex", gap: 2 }}>
          {(["All", "N", "S", "E", "W"] as TowerFaceFilter[]).map((f) => {
            const active = faceFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFaceFilterChange(f)}
                style={{
                  width: 30,
                  height: 28,
                  borderRadius: 7,
                  border: `1px solid ${active ? "var(--ti-accent)" : "var(--ti-border)"}`,
                  background: active ? "var(--ti-accent-soft)" : "var(--ti-surface)",
                  color: active ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--ti-font-sans)",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      )}

      <TiDivider vertical />

      <TwToolBtn
        icon="edit"
        label={drawLatched && drawMode ? "Draw lines ⧉" : "Draw lines"}
        active={drawMode}
        onClick={toggleDraw}
        onDoubleClick={(e) => {
          e.preventDefault();
          onDrawModeChange(true);
          onDrawLatchedChange(true);
        }}
      />

      {drawMode && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ti-muted)" }}>
            Weight
            <select
              value={drawStyle.strokeWidth}
              onChange={(e) => onDrawStyleChange({ strokeWidth: Number(e.target.value) })}
              style={{
                height: 28,
                fontSize: 12,
                borderRadius: 7,
                border: "1px solid var(--ti-border)",
                background: "var(--ti-surface)",
                padding: "0 6px",
              }}
            >
              <option value={0.75}>Hairline</option>
              <option value={1}>Thin</option>
              <option value={1.5}>Medium</option>
              <option value={2.5}>Heavy</option>
              <option value={4}>Bold</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ti-muted)" }}>
            Type
            <select
              value={drawStyle.lineStyle}
              onChange={(e) =>
                onDrawStyleChange({ lineStyle: e.target.value as TowerDraftLineStyle })
              }
              style={{
                height: 28,
                fontSize: 12,
                borderRadius: 7,
                border: "1px solid var(--ti-border)",
                background: "var(--ti-surface)",
                padding: "0 6px",
              }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
          <input
            type="color"
            value={drawStyle.strokeColor}
            onChange={(e) => onDrawStyleChange({ strokeColor: e.target.value })}
            title="Line color"
            style={{ width: 28, height: 28, padding: 0, border: "1px solid var(--ti-border)", borderRadius: 7 }}
          />
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ti-muted)" }}>
        Snap
        <select
          value={snapFt}
          onChange={(e) => onSnapFtChange(Number(e.target.value))}
          style={{
            height: 28,
            fontSize: 12,
            borderRadius: 7,
            border: "1px solid var(--ti-border)",
            background: "var(--ti-surface)",
            padding: "0 6px",
          }}
        >
          <option value={0}>Off</option>
          <option value={TOWER_DRAFT_SNAP_LEVEL}>Level</option>
          <option value={1}>{formatDistanceFromFt(1, measurementSystem)}</option>
          <option value={5}>{formatDistanceFromFt(5, measurementSystem)}</option>
          <option value={10}>{formatDistanceFromFt(10, measurementSystem)}</option>
        </select>
      </label>

      {onSyncFromSchematic && (
        <TwToolBtn icon="refresh" label="Sync from schematic" onClick={onSyncFromSchematic} />
      )}
      {onSuggestFeedlines && (
        <TwToolBtn icon="signal" label="Suggest feedlines" onClick={onSuggestFeedlines} />
      )}
      {onExportCsv && <TwToolBtn icon="download" label="Export CSV" onClick={onExportCsv} />}
      {onPrint && <TwToolBtn icon="print" label="Print tab" onClick={onPrint} />}
      {onSiteSetup && (
        <TwToolBtn icon="settings" label="Site setup…" onClick={onSiteSetup} title="Edit tower height and site details" />
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {mainView === "profile" ? (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--ti-ink-2)",
              cursor: "pointer",
            }}
            title="Show color markers behind equipment on the elevation"
          >
            <input
              type="checkbox"
              checked={labelLayers.deviceHighlight ?? hasProfileReference}
              onChange={(e) => onLabelLayersChange({ deviceHighlight: e.target.checked })}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--ti-accent)",
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px var(--ti-accent)",
                }}
              />
              Markers
            </span>
          </label>
        ) : null}
        {(
          [
            ["designation", "Designation"],
            ["azimuth", "Azimuth"],
            ["band", "Band"],
          ] as const
        ).map(([k, l]) => (
          <label
            key={k}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--ti-ink-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!labelLayers[k]}
              onChange={(e) => onLabelLayersChange({ [k]: e.target.checked })}
            />
            {l}
          </label>
        ))}
      </div>
    </div>
  );
}
