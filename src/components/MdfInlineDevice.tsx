import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { DeviceData, Port } from "../types";
import { SIGNAL_COLORS } from "../types";
import { resolveLiveDeviceHousename, type HousenameState } from "../housename";
import { connectedMdfPassthroughPorts } from "../mdfDisplay";
import { displayMdfPortLabel } from "../mdfPortLabels";

const ROW_H = 22;

interface MdfInlineDeviceProps {
  id: string;
  data: DeviceData;
  selected: boolean;
  isOverlapping: boolean;
  housenameState: HousenameState;
  connectedHandles: Set<string>;
  onEdit: () => void;
  onToggleDisplay?: () => void;
}

function rowLabel(
  device: DeviceData,
  deviceNodeId: string,
  port: Port | undefined,
  state: HousenameState,
  pairIndex: number,
): string {
  const panel = resolveLiveDeviceHousename(deviceNodeId, device, state).text.trim();
  const pair = port ? displayMdfPortLabel(device, port, pairIndex) : "";
  if (!pair) return panel;
  if (panel.toUpperCase().endsWith(pair.toUpperCase())) return panel;
  return panel ? `${panel} ${pair}` : pair;
}

function MdfZigzag() {
  return (
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
  );
}

function MdfInlineRow({
  port,
  label,
  connectedHandles,
}: {
  port: Port;
  label: string;
  connectedHandles: Set<string>;
}) {
  const rearId = `${port.id}-rear`;
  const frontId = `${port.id}-front`;
  const signalColor =
    SIGNAL_COLORS[port.signalType as keyof typeof SIGNAL_COLORS] ?? SIGNAL_COLORS.custom;

  return (
    <div
      className="relative flex items-stretch"
      style={{ height: ROW_H, minWidth: Math.max(96, label.length * 7 + 44) }}
      title={label}
    >
      <MdfZigzag />
      <div className="flex flex-1 items-center justify-center px-1.5 min-w-0 border-r border-[var(--color-border)]">
        <span className="text-[10px] font-semibold truncate leading-none text-[var(--color-text-heading)] es-housename">
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

function MdfInlineDeviceComponent({
  id,
  data,
  selected,
  isOverlapping,
  housenameState,
  connectedHandles,
  onEdit,
  onToggleDisplay,
}: MdfInlineDeviceProps) {
  const activePorts = useMemo(
    () => connectedMdfPassthroughPorts(data, connectedHandles),
    [data, connectedHandles],
  );

  const rows = activePorts.length > 0 ? activePorts : (data.ports ?? []).filter((p) => p.direction === "passthrough").slice(0, 1);

  let pairIndex = 0;

  const borderClass = isOverlapping
    ? "border-2 border-red-500 ring-1 ring-white/90"
    : selected
      ? "border-2 border-blue-500 ring-1 ring-white/90"
      : "border border-[var(--color-border)]";

  return (
    <div
      onDoubleClick={onEdit}
      className={`relative rounded bg-white overflow-hidden ${borderClass}`}
    >
      {onToggleDisplay ? (
        <button
          type="button"
          className="absolute top-0 right-0 z-10 h-4 w-4 flex items-center justify-center text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          title="Expand this MDF to panel view"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDisplay();
          }}
        >
          ⊞
        </button>
      ) : null}
      {rows.map((port) => {
        pairIndex += 1;
        return (
        <MdfInlineRow
          key={port.id}
          port={port}
          label={rowLabel(data, id, port, housenameState, pairIndex)}
          connectedHandles={connectedHandles}
        />
        );
      })}
      {rows.length === 0 ? (
        <div
          className="flex items-center justify-center px-2 es-housename text-[10px] font-semibold text-[var(--color-text-muted)]"
          style={{ height: ROW_H }}
        >
          {resolveLiveDeviceHousename(id, data, housenameState).text || "MDF"}
        </div>
      ) : null}
    </div>
  );
}

export const MdfInlineDevice = memo(MdfInlineDeviceComponent);
