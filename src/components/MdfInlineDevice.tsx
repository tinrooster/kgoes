import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { DeviceData } from "../types";
import { SIGNAL_COLORS } from "../types";
import { resolveLiveDeviceHousename } from "../housename";
import { isMdfDevice, resolveMdfPairLabel } from "../mdfDisplay";
import type { HousenameState } from "../housename";

interface MdfInlineDeviceProps {
  id: string;
  data: DeviceData;
  selected: boolean;
  isOverlapping: boolean;
  housenameState: HousenameState;
  connectedHandles: Set<string>;
  onEdit: () => void;
}

function inlineLabel(device: DeviceData, deviceNodeId: string, state: HousenameState): string {
  const live = resolveLiveDeviceHousename(deviceNodeId, device, state);
  const base = live.text.trim();
  const pair = resolveMdfPairLabel(device);
  if (!pair) return base;
  if (base.toUpperCase().endsWith(pair.toUpperCase())) return base;
  return base ? `${base} ${pair}` : pair;
}

function MdfInlineDeviceComponent({
  id,
  data,
  selected,
  isOverlapping,
  housenameState,
  connectedHandles,
  onEdit,
}: MdfInlineDeviceProps) {
  const port = (data.ports ?? []).find((p) => p.direction === "passthrough");
  const rearId = port ? `${port.id}-rear` : "rear";
  const frontId = port ? `${port.id}-front` : "front";
  const signalColor = port
    ? SIGNAL_COLORS[port.signalType as keyof typeof SIGNAL_COLORS] ?? SIGNAL_COLORS.custom
    : SIGNAL_COLORS.custom;
  const label = inlineLabel(data, id, housenameState);

  return (
    <div
      onDoubleClick={onEdit}
      className={`
        relative flex items-stretch rounded border bg-white es-housename
        ${isOverlapping ? "border-2 border-red-500 ring-1 ring-white/90" : selected ? "border-2 border-blue-500 ring-1 ring-white/90" : "border border-[var(--color-border)]"}
      `}
      style={{ minWidth: Math.max(96, label.length * 7 + 44), height: 22 }}
      title={label}
    >
      {/* Cable break / zigzag (CAD inline MDF symbol) */}
      <div
        className="flex items-center justify-center shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ width: 14 }}
        aria-hidden
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
          <path
            d="M1 2 L4 5 L1 8 L4 11 L1 14"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-[var(--color-text-muted)]"
          />
        </svg>
      </div>

      <div className="flex flex-1 items-center justify-center px-1.5 min-w-0">
        <span className="text-[10px] font-semibold truncate leading-none text-[var(--color-text-heading)]">
          {label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Left}
        id={rearId}
        data-connected={connectedHandles.has(rearId) || undefined}
        className="!w-2 !h-2 !border !border-[var(--color-border)] !-left-[5px]"
        style={{ background: signalColor, top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={frontId}
        data-connected={connectedHandles.has(frontId) || undefined}
        className="!w-2 !h-2 !border !border-[var(--color-border)] !-right-[5px]"
        style={{ background: signalColor, top: "50%" }}
      />
    </div>
  );
}

export const MdfInlineDevice = memo(MdfInlineDeviceComponent);

export function shouldRenderMdfInline(data: DeviceData, mdfDisplayInline: boolean): boolean {
  return mdfDisplayInline && isMdfDevice(data);
}
