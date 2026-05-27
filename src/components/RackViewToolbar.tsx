import { useMemo } from "react";
import { useSchematicStore } from "../store";
import type { DeviceData } from "../types";

/**
 * Rack-elevation view controls (face-plate linking, port highlight hints).
 */
export default function RackViewToolbar() {
  const showFacePlateDetail = useSchematicStore((s) => s.showFacePlateDetail);
  const setShowFacePlateDetail = useSchematicStore((s) => s.setShowFacePlateDetail);
  const selectedRackPort = useSchematicStore((s) => s.selectedRackPort);
  const setSelectedRackPort = useSchematicStore((s) => s.setSelectedRackPort);
  const requestSchematicFocus = useSchematicStore((s) => s.requestSchematicFocus);
  const setFacePlateEditNodeId = useSchematicStore((s) => s.setFacePlateEditNodeId);
  const nodes = useSchematicStore((s) => s.nodes);

  const toggleOff =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer whitespace-nowrap";
  const toggleOn =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-blue-600 bg-blue-600 text-white shadow-sm cursor-pointer whitespace-nowrap";
  const actionBtn =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer whitespace-nowrap";
  const primaryBtn =
    "px-2.5 py-1 text-[11px] font-medium rounded-md border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap";

  const selectionInfo = useMemo(() => {
    if (!selectedRackPort) return null;
    const node = nodes.find((n) => n.id === selectedRackPort.deviceNodeId);
    if (!node || node.type !== "device") return null;
    const data = node.data as DeviceData;
    const port = data.ports?.find((p) => p.id === selectedRackPort.portId);
    return {
      deviceLabel: data.label,
      portLabel: port?.label ?? "Port",
      nodeId: node.id,
    };
  }, [selectedRackPort, nodes]);

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
      data-print-hide
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
        Rack view
      </span>

      <button
        type="button"
        className={showFacePlateDetail ? toggleOn : toggleOff}
        aria-pressed={showFacePlateDetail}
        title="Show connectors on rack faces; click a port to highlight cables on the drawing"
        onClick={() => setShowFacePlateDetail(!showFacePlateDetail)}
      >
        Face-plate ports
      </button>

      {showFacePlateDetail && !selectionInfo && (
        <span className="text-[10px] text-[var(--color-text-muted)] max-w-md leading-snug">
          Click a port on a device · green = cabled · right-click a device for more actions
        </span>
      )}

      {selectionInfo && (
        <>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-950 max-w-xs truncate"
            title={`${selectionInfo.deviceLabel} — ${selectionInfo.portLabel}`}
          >
            <span className="font-medium truncate">{selectionInfo.deviceLabel}</span>
            <span className="text-amber-700 shrink-0">·</span>
            <span className="truncate">{selectionInfo.portLabel}</span>
          </span>

          <button
            type="button"
            className={primaryBtn}
            title="Switch to the drawing and zoom to this device"
            onClick={() =>
              requestSchematicFocus(
                selectionInfo.nodeId,
                selectedRackPort?.portId,
              )
            }
          >
            Show in Drawing
          </button>

          {showFacePlateDetail && (
            <button
              type="button"
              className={actionBtn}
              title="Edit port positions on the rack face-plate"
              onClick={() => setFacePlateEditNodeId(selectionInfo.nodeId)}
            >
              Edit face-plate layout
            </button>
          )}

          <button
            type="button"
            className={actionBtn}
            onClick={() => setSelectedRackPort(null)}
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  );
}
