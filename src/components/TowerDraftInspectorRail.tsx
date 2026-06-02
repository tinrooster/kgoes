import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import { formatHeightFtAgl, type MeasurementSystem } from "../measurementUnits";
import { resolveDeviceLabel } from "../displayName";
import { TiIconButton } from "./ti/TiBase";
import TowerDraftPlacementInspector from "./TowerDraftPlacementInspector";

interface TowerDraftInspectorRailProps {
  page: TowerDraftPage;
  measurementSystem: MeasurementSystem;
  selectedPlacementId: string | null;
  inspOpen: boolean;
  onInspOpenChange: (open: boolean) => void;
  onSelectPlacement: (id: string) => void;
  onClearSelection: () => void;
  onEditDevice: () => void;
  onOpenTrackIt?: () => void;
  onRemovePlacement: () => void;
}

function TowerDraftSummary({
  page,
  measurementSystem,
  onSelectPlacement,
}: {
  page: TowerDraftPage;
  measurementSystem: MeasurementSystem;
  onSelectPlacement: (id: string) => void;
}) {
  const nodes = useSchematicStore((s) => s.nodes);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const siteLabel = trackItTowerContext?.siteName?.trim() || "Tower site";

  const sorted = [...page.placements].sort((a, b) => b.mountHeightFtAgl - a.mountHeightFtAgl);

  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ti-ink)" }}>
          {siteLabel}
        </div>
        <div style={{ fontSize: 11, color: "var(--ti-muted)", marginTop: 4, lineHeight: 1.45 }}>
          {formatHeightFtAgl(page.towerHeightFtAgl, measurementSystem)} AGL ·{" "}
          {(page.towerType ?? "guyed").replace("_", " ")} · {page.placements.length} device
          {page.placements.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--ti-border)",
          background: "var(--ti-surface-2)",
          padding: 11,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
            marginBottom: 8,
          }}
        >
          On this tower
        </div>
        {sorted.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ti-muted)", lineHeight: 1.45 }}>
            Drag equipment from the left rail onto the elevation or site plan.
          </div>
        ) : (
          sorted.map((pl) => {
            const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data as DeviceData | undefined;
            const plLabel = data
              ? resolveDeviceLabel(data, { useShortNames }).text
              : pl.deviceNodeId;
            return (
            <button
              key={pl.id}
              type="button"
              className="ti-row-hover"
              onClick={() => onSelectPlacement(pl.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                marginBottom: 4,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--ti-font-sans)",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: "var(--ti-font-mono)",
                  color: "var(--ti-muted)",
                  width: 42,
                  flexShrink: 0,
                }}
              >
                {formatHeightFtAgl(pl.mountHeightFtAgl, measurementSystem, { suffix: false })}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ti-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {plLabel}
              </span>
            </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TowerDraftInspectorRail({
  page,
  measurementSystem,
  selectedPlacementId,
  inspOpen,
  onInspOpenChange,
  onSelectPlacement,
  onClearSelection,
  onEditDevice,
  onOpenTrackIt,
  onRemovePlacement,
}: TowerDraftInspectorRailProps) {
  const hasSelection = !!selectedPlacementId;

  if (!inspOpen) {
    return (
      <div
        style={{
          width: 44,
          flexShrink: 0,
          borderLeft: "1px solid var(--ti-border)",
          background: "var(--ti-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 8,
        }}
        data-print-hide
      >
        <TiIconButton icon="chevL" variant="ghost" size="sm" onClick={() => onInspOpenChange(true)} title="Show inspector" />
        <div
          style={{
            writingMode: "vertical-rl",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
            marginTop: 8,
          }}
        >
          {hasSelection ? "Detail" : "Tower"}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: "1px solid var(--ti-border)",
        background: "var(--ti-surface)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
      data-print-hide
    >
      <div
        style={{
          height: 44,
          padding: "0 8px 0 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--ti-divider)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
          }}
        >
          {hasSelection ? "Tower equipment" : "Tower"}
        </span>
        {hasSelection && (
          <TiIconButton icon="x" variant="ghost" size="sm" onClick={onClearSelection} title="Clear selection" />
        )}
        <TiIconButton
          icon="chevR"
          variant="ghost"
          size="sm"
          onClick={() => onInspOpenChange(false)}
          title="Dock inspector"
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {hasSelection && selectedPlacementId ? (
          <TowerDraftPlacementInspector
            embedded
            page={page}
            placementId={selectedPlacementId}
            measurementSystem={measurementSystem}
            onClose={onClearSelection}
            onEditDevice={onEditDevice}
            onOpenTrackIt={onOpenTrackIt}
            onRemove={onRemovePlacement}
          />
        ) : (
          <TowerDraftSummary
            page={page}
            measurementSystem={measurementSystem}
            onSelectPlacement={onSelectPlacement}
          />
        )}
      </div>
    </div>
  );
}
