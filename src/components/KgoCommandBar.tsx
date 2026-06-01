/**
 * KgoCommandBar — Contextual 48px bar below the canvas (design v2).
 */

import { memo, useMemo } from "react";
import { useSchematicStore } from "../store";
import { EMPTY_SIGNAL_COLOR_OVERRIDES } from "../signalColors";
import { SIGNAL_COLORS } from "../types";
import type { SignalType } from "../types";
import { TiButton, TiDivider } from "./ti/TiBase";
import { resolveCableState, countUnnumberedEdges } from "../kgoCableState";
import { openNumberingForEdge, openNumberingPanel } from "../kgoInspectorUtils";

function KgoCommandBar() {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const selEdge = useSchematicStore((s) => s.edges.find((e) => e.selected && !e.data?.directAttach));
  const selNodeId = useSchematicStore((s) => {
    const sel = s.nodes.find((n) => n.selected && n.type === "device");
    return sel?.id ?? null;
  });
  const nodeCount = useSchematicStore((s) => s.nodes.filter((n) => n.type === "device").length);
  const edgeCount = useSchematicStore((s) => s.edges.filter((e) => !e.data?.directAttach).length);
  const unnumberedCount = useMemo(() => countUnnumberedEdges(edges), [edges]);
  const autoRoute = useSchematicStore((s) => s.autoRoute);
  const toggleAutoRoute = useSchematicStore((s) => s.toggleAutoRoute);
  const signalColors = useSchematicStore((s) => s.signalColors ?? EMPTY_SIGNAL_COLOR_OVERRIDES);

  const fromNode = useMemo(
    () => (selEdge ? nodes.find((n) => n.id === selEdge.source) : undefined),
    [nodes, selEdge],
  );
  const toNode = useMemo(
    () => (selEdge ? nodes.find((n) => n.id === selEdge.target) : undefined),
    [nodes, selEdge],
  );

  const cs = resolveCableState(selEdge);
  const sig = selEdge?.data?.signalType as SignalType | undefined;
  const sigColor = sig ? ((signalColors as Record<string, string>)[sig] ?? SIGNAL_COLORS[sig] ?? "var(--ti-muted)") : undefined;
  const cableId = selEdge?.data?.cableId as string | undefined;

  const fromLabel = (fromNode?.data as { label?: string } | undefined)?.label ?? fromNode?.id;
  const toLabel = (toNode?.data as { label?: string } | undefined)?.label ?? toNode?.id;

  const onCableAction = () => {
    if (!selEdge || !cs) return;
    if (cs.key === "unnumbered" || cs.key === "retired_reclaimable") {
      openNumberingForEdge(selEdge.id);
      return;
    }
    openNumberingPanel();
  };

  const emptyHint = selNodeId
    ? "Device selected — see inspector on the right"
    : "Select a cable run to number it · select a device to inspect it";

  return (
    <div
      data-print-hide
      style={{
        height: 48, flexShrink: 0,
        borderTop: "1px solid var(--ti-border)",
        background: "var(--ti-surface)",
        display: "flex", alignItems: "center",
        gap: 12, padding: "0 14px",
      }}
    >
      {selEdge && cs ? (
        <>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            height: 26, padding: "0 11px", borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: `var(--ti-${cs.tone}-soft)`,
            color: `color-mix(in oklab, var(--ti-${cs.tone}) 70%, var(--ti-ink))`,
            flexShrink: 0,
            fontFamily: "var(--ti-font-sans)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: `var(--ti-${cs.tone})` }} />
            {cableId && <span style={{ fontWeight: 700, fontFamily: "var(--ti-font-mono)" }}>#{cableId}</span>}
            {cs.label}
          </span>

          <span style={{
            fontSize: 12, color: "var(--ti-muted)",
            display: "flex", alignItems: "center", gap: 6,
            minWidth: 0, overflow: "hidden",
            fontFamily: "var(--ti-font-sans)",
          }}>
            {sigColor && <span style={{ width: 7, height: 7, borderRadius: 999, background: sigColor, flexShrink: 0 }} />}
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fromLabel ?? "?"} → {toLabel ?? "?"}
            </span>
          </span>

          <TiButton variant={cs.btnVariant} size="sm" icon={cs.icon} style={{ marginLeft: 4, flexShrink: 0 }} onClick={onCableAction}>
            {cs.action}
          </TiButton>
        </>
      ) : (
        <span style={{ fontSize: 12.5, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>
          {emptyHint}
        </span>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)", whiteSpace: "nowrap" }}>
          {nodeCount} device{nodeCount !== 1 ? "s" : ""} · {edgeCount} run{edgeCount !== 1 ? "s" : ""}
          {unnumberedCount > 0 && ` · ${unnumberedCount} unnumbered`}
        </span>
        <TiDivider vertical />
        <TiButton variant="default" size="sm" icon="signal" onClick={toggleAutoRoute}>
          {autoRoute ? "Auto-routing" : "Auto-route"}
        </TiButton>
      </div>
    </div>
  );
}

export default memo(KgoCommandBar);
