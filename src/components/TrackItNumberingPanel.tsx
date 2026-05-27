import { useCallback, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import type { TrackItNumberBlock } from "../types";
import { sortBlocksForDisplay } from "../trackitNumberingMerge";
import {
  blockSlotNumbers,
  formatBlockRange,
  formatCableNumber,
  freeSlotsForBlock,
  numbersUsedOnDrawing,
  numbersUsedInTrackIt,
  parseCableNumberFromId,
  activeReservedBlocks,
} from "../trackitNumberingUtils";

const PROJECT_CLS_COLOR: Record<string, string> = {
  studio: "#3b82f6",
  news: "#ef4444",
  cny: "#f59e0b",
  pride: "#a855f7",
  sutro: "#14b8a6",
  other: "#64748b",
};

function blockKey(block: TrackItNumberBlock): string {
  return block.reservationId ?? `${block.start}-${block.end}-${block.updatedAt}`;
}

export default function TrackItNumberingPanel({
  mobile,
  onClose,
}: {
  mobile?: boolean;
  onClose?: () => void;
} = {}) {
  const rightExpanded = useSidebarStore((s) => s.rightTrackItExpanded);
  const setRightExpanded = useSidebarStore((s) => s.setRightTrackItExpanded);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const collapsed = mobile ? false : !rightExpanded;
  const [manualInput, setManualInput] = useState("");
  const trackItNumbering = useSchematicStore((s) => s.trackItNumbering);
  const edges = useSchematicStore((s) => s.edges);
  const activeId = useSchematicStore((s) => s.activeTrackItReservationId);
  const setActiveId = useSchematicStore((s) => s.setActiveTrackItReservationId);
  const assignNext = useSchematicStore((s) => s.assignNextTrackItNumbersToSelection);
  const assignManual = useSchematicStore((s) => s.assignManualCableNumberToSelection);
  const assignSlot = useSchematicStore((s) => s.assignSlotFromActiveBlockToSelection);
  const clearIds = useSchematicStore((s) => s.clearCableIdsOnSelection);

  const selectedEdges = useMemo(
    () => edges.filter((e) => e.selected && !e.data?.directAttach && e.data?.signalType),
    [edges],
  );

  const isTrackItPopup = typeof window !== "undefined" && !!window.opener;
  const blocks = trackItNumbering?.blocks ?? [];
  const reserved = useMemo(() => sortBlocksForDisplay(activeReservedBlocks(blocks)), [blocks]);
  const showPanel =
    isTrackItPopup || reserved.length > 0 || blocks.some((b) => b.status === "allocated");

  const activeBlock = useMemo(() => {
    if (activeId) {
      const found = blocks.find((b) => b.reservationId === activeId);
      if (found) return found;
    }
    return reserved[0] ?? null;
  }, [activeId, blocks, reserved]);

  const freeSlots = useMemo(
    () => (activeBlock?.status === "reserved" ? freeSlotsForBlock(activeBlock, edges) : []),
    [activeBlock, edges],
  );

  const selectionCableIds = useMemo(() => {
    const nums = selectedEdges
      .map((e) => parseCableNumberFromId(e.data?.cableId as string | undefined))
      .filter((n): n is number => n != null);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [selectedEdges]);

  const onManualApply = useCallback(
    (allowOutside: boolean) => {
      const n = Number.parseInt(manualInput.trim(), 10);
      if (!Number.isFinite(n)) return;
      assignManual(n, { allowOutsideBlock: allowOutside });
    },
    [manualInput, assignManual],
  );

  const focusTrackIt = useCallback(() => {
    try {
      window.opener?.focus();
    } catch {
      // cross-origin
    }
  }, []);

  if (!showPanel) return null;

  if (!mobile && collapsed) {
    return (
      <div className="w-8 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col items-center h-full">
        <button
          type="button"
          onClick={() => expandRightPanel("trackIt")}
          className="py-3 cursor-pointer hover:bg-[var(--color-surface-hover)] w-full flex justify-center transition-colors"
          title="Show trackIT numbering"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 3l-5 5 5 5" />
          </svg>
        </button>
        <div
          className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mt-2 select-none"
          style={{ writingMode: "vertical-rl" }}
        >
          trackIT
        </div>
        {reserved.length > 0 ? (
          <span className="mt-1 text-[9px] font-mono text-blue-600">{reserved.length}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`${mobile ? "w-full" : "w-64"} bg-[var(--color-surface)] ${mobile ? "" : "border-l"} border-[var(--color-border)] flex flex-col h-full overflow-hidden`}
    >
      <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-[var(--color-text-heading)] uppercase tracking-wider">
            trackIT Numbers
          </h2>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            {reserved.length} reserved · {blocks.length} total
          </p>
        </div>
        {!mobile ? (
          <button
            type="button"
            onClick={() => setRightExpanded(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer p-0.5"
            title="Collapse panel"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        ) : onClose ? (
          <button type="button" onClick={onClose} className="text-xs text-[var(--color-text-muted)] cursor-pointer">
            Close
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs">
        {reserved.length === 0 ? (
          <p className="text-[var(--color-text-muted)] leading-relaxed">
            Reserve blocks in trackIT Numbering. With EasySchematic open, new reservations appear here automatically.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Reserved blocks — click to activate
            </span>
            {reserved.map((block) => {
              const key = blockKey(block);
              const isActive = activeBlock && blockKey(activeBlock) === key;
              const color = PROJECT_CLS_COLOR[block.projectCls] ?? PROJECT_CLS_COLOR.other;
              const free = freeSlotsForBlock(block, edges);
              const slots = blockSlotNumbers(block.start, block.blockSize, block.offset);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveId(block.reservationId)}
                  className={`w-full text-left rounded-md border px-2 py-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-semibold text-[var(--color-text)]">
                      {formatBlockRange(block)}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded"
                      style={{ background: `${color}22`, color }}
                    >
                      {block.flag ?? "draft"}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate" style={{ color }}>
                    {block.project}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                    {free.length}/{slots.length} free on drawing
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeBlock?.status === "reserved" ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)]/40 p-2 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Active: {formatBlockRange(activeBlock)}
            </div>
            <div className="flex flex-wrap gap-1">
              {blockSlotNumbers(activeBlock.start, activeBlock.blockSize, activeBlock.offset).map((n) => {
                const usedDraw = numbersUsedOnDrawing(edges, activeBlock).has(n);
                const usedReg = numbersUsedInTrackIt(activeBlock).has(n);
                const free = !usedDraw && !usedReg;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!free && !usedDraw}
                    onClick={() => free && assignSlot(n)}
                    title={
                      usedDraw
                        ? "On drawing — click selection then reassign"
                        : usedReg
                          ? "In trackIT register"
                          : "Assign to selected connection(s)"
                    }
                    className={`font-mono text-[10px] px-1 py-0.5 rounded border cursor-pointer disabled:cursor-default ${
                      free
                        ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                        : usedDraw
                          ? "border-blue-500/50 bg-blue-500/15 text-blue-800 dark:text-blue-300"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] line-through opacity-60"
                    }`}
                  >
                    {formatCableNumber(n)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={freeSlots.length === 0 || selectedEdges.length === 0}
              onClick={() => assignNext()}
              className="w-full py-1.5 rounded bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
            >
              Assign next ({selectedEdges.length || 0} selected)
            </button>
          </div>
        ) : null}

        <div className="rounded-md border border-[var(--color-border)] p-2 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            Selection ({selectedEdges.length})
          </div>
          {selectionCableIds.length > 0 ? (
            <p className="font-mono text-[11px]">
              Cable ID: {selectionCableIds.map(formatCableNumber).join(", ")}
            </p>
          ) : (
            <p className="text-[var(--color-text-muted)]">No cable ID on selection</p>
          )}
          <div className="flex gap-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="#"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ""))}
              className="flex-1 min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 font-mono text-[11px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              disabled={!manualInput || selectedEdges.length === 0}
              onClick={() => onManualApply(false)}
              className="py-1 rounded border border-[var(--color-border)] text-[10px] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 cursor-pointer"
            >
              Set (active block)
            </button>
            <button
              type="button"
              disabled={!manualInput || selectedEdges.length === 0}
              onClick={() => onManualApply(true)}
              className="py-1 rounded border border-[var(--color-border)] text-[10px] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 cursor-pointer"
            >
              Set any #
            </button>
          </div>
          <button
            type="button"
            disabled={selectedEdges.length === 0}
            onClick={() => clearIds()}
            className="w-full py-1 rounded border border-red-500/40 text-[10px] text-red-700 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-40 cursor-pointer"
          >
            Clear cable ID on selection
          </button>
        </div>

        {isTrackItPopup ? (
          <button
            type="button"
            onClick={focusTrackIt}
            className="w-full text-[11px] py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
          >
            Switch to trackIT
          </button>
        ) : null}
      </div>
    </div>
  );
}
