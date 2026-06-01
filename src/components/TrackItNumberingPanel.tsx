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
import { isTrackItDrawingLinked, saveToTrackItParent } from "../trackitIntegration";
import { TiButton, TiIcon, TiIconButton } from "./ti/TiBase";

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

function countChip(label: string, value: number, tone: "success" | "warning" | "info") {
  const color = `var(--ti-${tone})`;
  return (
    <div
      key={label}
      style={{
        flex: 1,
        borderRadius: 8,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
        background: `var(--ti-${tone}-soft)`,
        padding: "7px 9px",
      }}
    >
      <div
        data-mono
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: `color-mix(in oklab, ${color} 72%, var(--ti-ink))`,
          fontFamily: "var(--ti-font-mono)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>{label}</div>
    </div>
  );
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
  const assignAll = useSchematicStore((s) => s.assignAllUnnumberedTrackItNumbers);
  const assignManual = useSchematicStore((s) => s.assignManualCableNumberToSelection);
  const assignSlot = useSchematicStore((s) => s.assignSlotFromActiveBlockToSelection);
  const clearIds = useSchematicStore((s) => s.clearCableIdsOnSelection);

  const selectedEdges = useMemo(
    () => edges.filter((e) => e.selected && !e.data?.directAttach && e.data?.signalType),
    [edges],
  );

  const numberedCount = useMemo(
    () => edges.filter((e) => !e.data?.directAttach && e.data?.cableId).length,
    [edges],
  );
  const unnumberedCount = useMemo(
    () => edges.filter((e) => !e.data?.directAttach && !e.data?.cableId && e.data?.signalType).length,
    [edges],
  );

  const isTrackItPopup = typeof window !== "undefined" && !!window.opener;
  const isLinked = isTrackItDrawingLinked();
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

  const panelWidth = mobile ? "100%" : 312;

  if (!showPanel) return null;

  if (!mobile && collapsed) {
    return (
      <div
        style={{
          width: 44,
          background: "var(--ti-surface)",
          borderLeft: "1px solid var(--ti-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          paddingTop: 10,
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => expandRightPanel("trackIt")}
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            border: 0,
            background: "transparent",
            borderRadius: 7,
            cursor: "pointer",
            color: "var(--ti-muted)",
          }}
          title="Show TrackIt numbering"
        >
          <TiIcon name="hash" size={15} />
        </button>
        <div
          style={{
            writingMode: "vertical-rl",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
            marginTop: 8,
            fontFamily: "var(--ti-font-sans)",
          }}
        >
          Numbers
        </div>
        {unnumberedCount > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--ti-warning)",
              fontFamily: "var(--ti-font-mono)",
            }}
          >
            {unnumberedCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: panelWidth,
        background: "var(--ti-surface)",
        borderLeft: mobile ? "none" : "1px solid var(--ti-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--ti-divider)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--ti-accent)",
              color: "var(--ti-on-accent)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--ti-font-mono)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            #
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
              Cable numbering
            </div>
            <div style={{ fontSize: 11, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>
              Reserve · auto-assign · push to TrackIt
            </div>
          </div>
          {!mobile ? (
            <TiIconButton icon="x" variant="ghost" size="sm" onClick={() => setRightExpanded(false)} title="Collapse" />
          ) : onClose ? (
            <TiIconButton icon="x" variant="ghost" size="sm" onClick={onClose} title="Close" />
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
          {countChip("Numbered", numberedCount, "success")}
          {countChip("Unnumbered", unnumberedCount, unnumberedCount ? "warning" : "success")}
          {countChip("Blocks", reserved.length, "info")}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            borderRadius: 11,
            border: `1px solid ${unnumberedCount ? "color-mix(in oklab, var(--ti-accent) 35%, transparent)" : "var(--ti-border)"}`,
            background: unnumberedCount ? "var(--ti-accent-soft)" : "var(--ti-surface-2)",
            padding: 13,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
            Auto-assign from reserved blocks
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ti-ink-2)",
              marginTop: 3,
              lineHeight: 1.45,
              fontFamily: "var(--ti-font-sans)",
            }}
          >
            {unnumberedCount
              ? `Pull the next free number for each of the ${unnumberedCount} unnumbered run${unnumberedCount !== 1 ? "s" : ""} in the active block.`
              : "Every cable on this drawing already carries a number."}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
            <TiButton
              variant="accent"
              icon="hash"
              disabled={!unnumberedCount || !activeBlock}
              onClick={() => assignAll()}
            >
              Auto-assign all ({unnumberedCount})
            </TiButton>
            <TiButton
              variant="outline"
              icon="arrowR"
              disabled={selectedEdges.length === 0 || freeSlots.length === 0}
              onClick={() => assignNext()}
            >
              Assign next ({selectedEdges.length || 0})
            </TiButton>
          </div>
        </div>

        {reserved.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--ti-ink-2)", lineHeight: 1.5, margin: 0, fontFamily: "var(--ti-font-sans)" }}>
            Reserve blocks in trackIT Plant → Numbering. With KGO-ES open from a drawing, new reservations appear here
            automatically.
          </p>
        ) : (
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ti-muted)",
                marginBottom: 8,
                fontFamily: "var(--ti-font-sans)",
              }}
            >
              Reserved blocks — click to activate
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    style={{
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 10,
                      border: `1px solid ${isActive ? "var(--ti-accent)" : "var(--ti-border)"}`,
                      background: isActive ? "var(--ti-accent-soft)" : "var(--ti-surface)",
                      boxShadow: isActive ? "0 0 0 2px var(--ti-accent-soft)" : "none",
                      padding: "10px 11px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span
                        data-mono
                        style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ti-ink)", fontFamily: "var(--ti-font-mono)" }}
                      >
                        {formatBlockRange(block)}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          color,
                          fontFamily: "var(--ti-font-sans)",
                        }}
                      >
                        {block.flag ?? "draft"}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color, fontFamily: "var(--ti-font-sans)" }}>{block.project}</div>
                    <div
                      data-mono
                      style={{ marginTop: 6, fontSize: 10.5, color: "var(--ti-muted)", fontFamily: "var(--ti-font-mono)" }}
                    >
                      {free.length}/{slots.length} free on drawing
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeBlock?.status === "reserved" ? (
          <div
            style={{
              borderRadius: 10,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface-2)",
              padding: 12,
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
                fontFamily: "var(--ti-font-sans)",
              }}
            >
              Active: {formatBlockRange(activeBlock)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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
                        ? "On drawing"
                        : usedReg
                          ? "In trackIT register"
                          : "Assign to selected connection(s)"
                    }
                    data-mono
                    style={{
                      fontSize: 10,
                      padding: "3px 6px",
                      borderRadius: 6,
                      border: `1px solid ${free ? "color-mix(in oklab, var(--ti-success) 45%, transparent)" : usedDraw ? "color-mix(in oklab, var(--ti-info) 45%, transparent)" : "var(--ti-border)"}`,
                      background: free ? "transparent" : usedDraw ? "var(--ti-info-soft)" : "var(--ti-sunken)",
                      color: free ? "var(--ti-success)" : usedDraw ? "var(--ti-info)" : "var(--ti-faint)",
                      cursor: free ? "pointer" : "default",
                      fontFamily: "var(--ti-font-mono)",
                      textDecoration: !free && !usedDraw ? "line-through" : "none",
                      opacity: !free && !usedDraw ? 0.65 : 1,
                    }}
                  >
                    {formatCableNumber(n)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 10,
            border: "1px solid var(--ti-border)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ti-muted)",
              fontFamily: "var(--ti-font-sans)",
            }}
          >
            Selection ({selectedEdges.length})
          </div>
          {selectionCableIds.length > 0 ? (
            <p data-mono style={{ fontSize: 11.5, margin: 0, color: "var(--ti-ink)", fontFamily: "var(--ti-font-mono)" }}>
              Cable ID: {selectionCableIds.map(formatCableNumber).join(", ")}
            </p>
          ) : (
            <p style={{ fontSize: 12, margin: 0, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>
              No cable ID on selection
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Manual #"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%",
              height: 34,
              padding: "0 10px",
              borderRadius: 7,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-bg)",
              fontSize: 12.5,
              fontFamily: "var(--ti-font-mono)",
              outline: "none",
            }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TiButton
              variant="outline"
              size="sm"
              disabled={!manualInput || selectedEdges.length === 0}
              onClick={() => onManualApply(false)}
            >
              Set (active block)
            </TiButton>
            <TiButton
              variant="outline"
              size="sm"
              disabled={!manualInput || selectedEdges.length === 0}
              onClick={() => onManualApply(true)}
            >
              Set any #
            </TiButton>
          </div>
          <TiButton
            variant="ghost"
            size="sm"
            disabled={selectedEdges.length === 0}
            onClick={() => clearIds()}
            style={{ color: "var(--ti-danger)" }}
          >
            Clear cable ID on selection
          </TiButton>
        </div>

        {isTrackItPopup ? (
          <TiButton variant="outline" fullWidth onClick={focusTrackIt}>
            Switch to trackIT
          </TiButton>
        ) : null}
      </div>

      {isLinked && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--ti-divider)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <TiButton variant="accent" icon="upload" fullWidth onClick={() => saveToTrackItParent()}>
            Push schedule to TrackIt
          </TiButton>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--ti-muted)",
              textAlign: "center",
              fontFamily: "var(--ti-font-sans)",
            }}
          >
            Saves schematic JSON and cable IDs to the linked plant drawing.
          </div>
        </div>
      )}
    </div>
  );
}
