import { useSchematicStore } from "../store";
import type { DeviceData, TowerDraftPage } from "../types";
import {
  mountLateralFromOffsetX,
  mountLateralLabel,
  offsetXForMountLateral,
  TOWER_MOUNT_LATERAL_OPTIONS,
  type TowerMountLateral,
} from "../towerDraftMountLateral";
import { formatHeightFtAgl, ftToM, mToFt, type MeasurementSystem } from "../measurementUnits";
import { resolveDeviceLabel } from "../displayName";
import { isAimableTowerDeviceType } from "../towerDraftFaces";

interface TowerDraftPlacementInspectorProps {
  page: TowerDraftPage;
  placementId: string;
  measurementSystem: MeasurementSystem;
  onClose: () => void;
  onEditDevice: () => void;
  onOpenTrackIt?: () => void;
  onRemove: () => void;
}

/** Floating placement editor — overlays the canvas without shifting layout. */
export default function TowerDraftPlacementInspector({
  page,
  placementId,
  measurementSystem,
  onClose,
  onEditDevice,
  onOpenTrackIt,
  onRemove,
}: TowerDraftPlacementInspectorProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const updateTowerDraftPlacement = useSchematicStore((s) => s.updateTowerDraftPlacement);

  const placement = page.placements.find((p) => p.id === placementId);
  if (!placement) return null;

  const data = nodes.find((n) => n.id === placement.deviceNodeId)?.data as DeviceData | undefined;
  const label = data ? resolveDeviceLabel(data, { useShortNames }).text : placement.deviceNodeId;
  const lateral = mountLateralFromOffsetX(placement.offsetX);
  const isAimable = isAimableTowerDeviceType(data?.deviceType);

  const heightDisplayValue =
    measurementSystem === "metric"
      ? Math.round(ftToM(placement.mountHeightFtAgl) * 10) / 10
      : placement.mountHeightFtAgl;

  const applyHeightInput = (raw: number) => {
    const ft =
      measurementSystem === "metric" ? Math.round(mToFt(raw)) : Math.round(raw);
    updateTowerDraftPlacement(page.id, placement.id, {
      mountHeightFtAgl: Math.max(0, Math.min(page.towerHeightFtAgl, ft)),
    });
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3"
      data-print-hide
    >
      <div
        className="pointer-events-auto w-full max-w-3xl rounded-lg border border-blue-300/60 bg-[var(--color-surface)]/95 shadow-xl backdrop-blur-sm dark:border-blue-700/50"
        role="region"
        aria-label="Edit placement"
      >
        <div className="flex items-start gap-3 px-3 py-2 border-b border-[var(--color-border)]">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Selected on tower
            </div>
            <div className="text-sm font-medium text-[var(--color-text)] truncate" title={label}>
              {label}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              {formatHeightFtAgl(placement.mountHeightFtAgl, measurementSystem)}
              {data?.deviceType ? ` · ${data.deviceType}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="px-2 py-1 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)]"
              onClick={onEditDevice}
            >
              Edit device…
            </button>
            {onOpenTrackIt && (
              <button
                type="button"
                className="px-2 py-1 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)]"
                onClick={onOpenTrackIt}
              >
                trackIT
              </button>
            )}
            <button
              type="button"
              className="px-2 py-1 text-[11px] rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={onRemove}
            >
              Remove
            </button>
            <button
              type="button"
              className="ml-1 px-1.5 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-[var(--color-text)]">
            <span>Height ({measurementSystem === "metric" ? "m" : "ft"} AGL)</span>
            <input
              type="number"
              min={0}
              max={
                measurementSystem === "metric"
                  ? Math.round(ftToM(page.towerHeightFtAgl) * 10) / 10
                  : page.towerHeightFtAgl
              }
              step={measurementSystem === "metric" ? 0.1 : 1}
              value={heightDisplayValue}
              onChange={(e) => applyHeightInput(Number(e.target.value) || 0)}
              className="w-full px-1.5 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)]"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] text-[var(--color-text)]">
            <span>Mount position</span>
            <select
              value={lateral === "custom" ? "custom" : lateral}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") return;
                updateTowerDraftPlacement(page.id, placement.id, {
                  offsetX: offsetXForMountLateral(v as TowerMountLateral),
                });
              }}
              className="w-full px-1.5 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              {TOWER_MOUNT_LATERAL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
              {lateral === "custom" && (
                <option value="custom">{mountLateralLabel(placement.offsetX)}</option>
              )}
            </select>
          </label>
          {isAimable && (
            <label className="flex items-end gap-2 text-[11px] text-[var(--color-text)] pb-0.5">
              <input
                type="checkbox"
                checked={placement.mountFlip ?? false}
                onChange={(e) =>
                  updateTowerDraftPlacement(page.id, placement.id, {
                    mountFlip: e.target.checked,
                  })
                }
                className="rounded border-[var(--color-border)]"
              />
              <span>Flip mount (180°)</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
