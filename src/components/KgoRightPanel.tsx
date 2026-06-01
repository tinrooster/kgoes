/**
 * KgoRightPanel — Collapsible right inspector panel (design v2).
 * 312px when open, 44px rail when collapsed.
 *
 * Shows: selected device details · selected edge details · empty state.
 * The existing detailed DeviceEditor remains accessible via double-click on canvas nodes.
 */

import { memo, useMemo } from "react";
import { useSchematicStore } from "../store";
import { EMPTY_SIGNAL_COLOR_OVERRIDES } from "../signalColors";
import { useSidebarStore } from "../sidebarStore";
import { SIGNAL_COLORS, SIGNAL_LABELS } from "../types";
import type { DeviceData, ConnectionData, SignalType, Port } from "../types";
import { TiIcon, TiIconButton, TiBadge, TiButton } from "./ti/TiBase";
import { SidebarPanelHeader, SidebarPanelShell, SidebarRail } from "./sidebarChrome";
import { isTrackItDrawingLinked } from "../trackitIntegration";
import { buildTrackItPlantDrawingUrl, openTrackItUrl } from "../trackitAppLinks";
import { resolveCableState } from "../kgoCableState";
import {
  clearCanvasSelection,
  openNumberingForEdge,
  openNumberingPanel,
  resolveDeviceLocationCrumb,
  resolveDeviceSyncSummary,
} from "../kgoInspectorUtils";

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 12,
      padding: "7px 0",
      borderBottom: "1px solid var(--ti-divider)",
    }}>
      <span style={{ fontSize: 12, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>{label}</span>
      <span style={{
        fontSize: 12.5, fontWeight: 500, textAlign: "right",
        color: "var(--ti-ink)",
        fontFamily: mono ? "var(--ti-font-mono)" : "var(--ti-font-sans)",
      }}>{value}</span>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--ti-muted)",
      fontFamily: "var(--ti-font-sans)",
      marginBottom: 4, paddingTop: 4,
    }}>{label}</div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--ti-muted)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--ti-surface-2)", display: "grid", placeItems: "center", margin: "8px auto 12px" }}>
        <TiIcon name="box" size={20} color="var(--ti-faint)" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>Nothing selected</div>
      <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5, fontFamily: "var(--ti-font-sans)" }}>
        Click a device to see its TrackIt record, or a cable run to manage its number.
      </div>
    </div>
  );
}

function TrackItLocationCrumb({
  nodeId,
  onOpenTrackIt,
}: {
  nodeId: string;
  onOpenTrackIt?: () => void;
}) {
  const nodes = useSchematicStore((s) => s.nodes);
  const crumb = resolveDeviceLocationCrumb(nodeId, nodes);
  if (!crumb) return null;

  const parts: React.ReactNode[] = [
    <span key="plant" style={{ fontSize: 11.5, color: "var(--ti-muted)", fontWeight: 500 }}>{crumb.plantLabel}</span>,
  ];
  if (crumb.roomLabel) {
    parts.push(<span key="c1" style={{ color: "var(--ti-faint)", fontSize: 10 }}>›</span>);
    parts.push(<span key="room" style={{ fontSize: 11.5, color: "var(--ti-muted)", fontWeight: 500 }}>{crumb.roomLabel}</span>);
  }
  if (crumb.rackLabel) {
    parts.push(<span key="c2" style={{ color: "var(--ti-faint)", fontSize: 10 }}>›</span>);
    parts.push(<span key="rack" style={{ fontSize: 11.5, color: "var(--ti-muted)", fontWeight: 500 }}>{crumb.rackLabel}</span>);
  }
  parts.push(<span key="c3" style={{ color: "var(--ti-faint)", fontSize: 10 }}>›</span>);
  parts.push(<span key="dev" style={{ fontSize: 11.5, color: "var(--ti-ink)", fontWeight: 600 }}>{crumb.deviceLabel}</span>);

  return (
    <button
      type="button"
      onClick={onOpenTrackIt}
      title="Open in TrackIt"
      style={{
        display: "flex", alignItems: "center", gap: 6, width: "100%",
        padding: "8px 10px", borderRadius: 9,
        border: "1px solid var(--ti-border)", background: "var(--ti-surface-2)",
        cursor: onOpenTrackIt ? "pointer" : "default", overflow: "hidden",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 5, background: "var(--ti-ink)", color: "var(--ti-bg)",
        display: "grid", placeItems: "center", fontFamily: "var(--ti-font-mono)", fontSize: 8.5, fontWeight: 700, flexShrink: 0,
      }}>tI</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>{parts}</span>
      {onOpenTrackIt && <TiIcon name="arrowR" size={13} color="var(--ti-accent)" />}
    </button>
  );
}

// ─── Device inspector ─────────────────────────────────────────────────────────

function DeviceInspector({ nodeId }: { nodeId: string }) {
  const node = useSchematicStore((s) => s.nodes.find((n) => n.id === nodeId));
  const edges = useSchematicStore((s) => s.edges);
  const connectedEdges = useMemo(
    () => edges.filter((e) => e.source === nodeId || e.target === nodeId),
    [edges, nodeId],
  );
  const signalColors = useSchematicStore((s) => s.signalColors ?? EMPTY_SIGNAL_COLOR_OVERRIDES);
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);

  if (!node) return <EmptyState />;

  const data = node.data as DeviceData;
  const label = data.label ?? "Device";
  const brand = data.manufacturer ?? "";
  const deviceType = data.deviceType ?? "";
  const model = data.model ?? data.modelNumber ?? "";
  const ports: Port[] = data.ports ?? [];
  const inPorts = ports.filter((p) => p.direction === "input" || p.direction === "bidirectional" || p.direction === "passthrough");
  const outPorts = ports.filter((p) => p.direction === "output");

  const isLinked = isTrackItDrawingLinked() && !!trackItLink?.drawingId;
  const sync = resolveDeviceSyncSummary(nodeId, edges, isLinked);

  const openTrackIt = isLinked && trackItLink?.drawingId
    ? () => openTrackItUrl(buildTrackItPlantDrawingUrl({ drawingId: trackItLink.drawingId!, dwgNumber: trackItLink.dwgNumber }))
    : undefined;

  const hasAssetFields = !!(data.designation || data.rackLocation || data.frameSlot || data.hostname || data.rackHeightU);

  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      {isLinked && (
        <TrackItLocationCrumb nodeId={nodeId} onOpenTrackIt={openTrackIt} />
      )}

      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--ti-muted)", marginTop: 2, fontFamily: "var(--ti-font-mono)" }}>
          {[brand, model || deviceType].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div style={{
        borderRadius: 10,
        border: `1px solid color-mix(in oklab, var(--ti-${sync.tone}) 35%, transparent)`,
        background: `var(--ti-${sync.tone}-soft)`,
        padding: 11,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: `var(--ti-${sync.tone})`, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: `color-mix(in oklab, var(--ti-${sync.tone}) 70%, var(--ti-ink))`, fontFamily: "var(--ti-font-sans)" }}>
            {sync.label}
          </span>
          <TiIcon name="link" size={11} color="var(--ti-muted)" />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ti-ink-2)", marginTop: 5, lineHeight: 1.45, fontFamily: "var(--ti-font-sans)" }}>{sync.hint}</div>
        <div style={{ marginTop: 9, display: "flex", gap: 7, flexWrap: "wrap" }}>
          {sync.tone === "warning" && (
            <TiButton size="sm" variant="accent" icon="hash" onClick={() => openNumberingPanel()}>
              Open numbering
            </TiButton>
          )}
          {sync.showOpenTrackIt && openTrackIt && (
            <TiButton size="sm" variant="ghost" iconRight="arrowR" onClick={openTrackIt}>
              Open in TrackIt
            </TiButton>
          )}
        </div>
      </div>

      <div>
        <SectionHead label="TrackIt asset" />
        {hasAssetFields ? (
          <div>
            {data.designation && <Field label="Designation" value={data.designation} mono />}
            {data.rackLocation && <Field label="Location" value={data.rackLocation} />}
            {data.frameSlot && <Field label="Frame / slot" value={data.frameSlot} mono />}
            {data.rackHeightU != null && <Field label="Rack U" value={`${data.rackHeightU}U`} mono />}
            {data.hostname && <Field label="Hostname" value={data.hostname} mono />}
          </div>
        ) : (
          <div style={{
            borderRadius: 8, border: "1px dashed var(--ti-border)", background: "var(--ti-surface-2)",
            padding: 10, fontSize: 11.5, color: "var(--ti-ink-2)", lineHeight: 1.45, fontFamily: "var(--ti-font-sans)",
          }}>
            No installation metadata yet. Double-click the device to edit designation, rack, and location fields.
          </div>
        )}
        <TiButton size="sm" variant="default" icon="edit" style={{ marginTop: 8 }} onClick={() => setEditingNodeId(nodeId)}>
          Edit device…
        </TiButton>
      </div>

      {/* Ports */}
      {ports.length > 0 && (
        <div>
          <SectionHead label={`Ports · ${ports.length}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {inPorts.map((p) => {
              const color = (signalColors as Record<string, string>)[p.signalType] ?? SIGNAL_COLORS[p.signalType as SignalType] ?? "var(--ti-muted)";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", borderRadius: 5, fontSize: 11.5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: color, flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ flex: 1, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>{p.direction === "bidirectional" ? "↔" : p.direction === "passthrough" ? "⇌" : "in"}</span>
                </div>
              );
            })}
            {outPorts.map((p) => {
              const color = (signalColors as Record<string, string>)[p.signalType] ?? SIGNAL_COLORS[p.signalType as SignalType] ?? "var(--ti-muted)";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", borderRadius: 5, fontSize: 11.5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>out</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected cables */}
      {connectedEdges.length > 0 && (
        <div>
          <SectionHead label={`Cable runs · ${connectedEdges.length}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {connectedEdges.map((e) => {
              const sig = e.data?.signalType as SignalType | undefined;
              const color = sig ? ((signalColors as Record<string, string>)[sig] ?? SIGNAL_COLORS[sig] ?? "var(--ti-muted)") : "var(--ti-muted)";
              const cableId = e.data?.cableId as string | undefined;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => openNumberingForEdge(e.id)}
                  className="ti-row-hover"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 7,
                    border: "1px solid var(--ti-divider)",
                    background: "var(--ti-surface-2)",
                    width: "100%", cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--ti-font-sans)",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: "var(--ti-ink-2)", flex: 1, fontFamily: "var(--ti-font-sans)" }}>
                    {sig ? SIGNAL_LABELS[sig] ?? sig : "Cable"}
                  </span>
                  {cableId
                    ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-mono)" }}>#{cableId}</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ti-warning)", fontFamily: "var(--ti-font-sans)" }}>＋ ASSIGN</span>
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edge inspector ───────────────────────────────────────────────────────────

function EdgeInspector({ edgeId }: { edgeId: string }) {
  const edge = useSchematicStore((s) => s.edges.find((e) => e.id === edgeId));
  const fromNode = useSchematicStore((s) => edge ? s.nodes.find((n) => n.id === edge.source) : undefined);
  const toNode = useSchematicStore((s) => edge ? s.nodes.find((n) => n.id === edge.target) : undefined);
  const signalColors = useSchematicStore((s) => s.signalColors ?? EMPTY_SIGNAL_COLOR_OVERRIDES);

  if (!edge) return <EmptyState />;

  const data = edge.data as ConnectionData;
  const sig = data?.signalType as SignalType | undefined;
  const cableId = data?.cableId as string | undefined;
  const color = sig ? ((signalColors as Record<string, string>)[sig] ?? SIGNAL_COLORS[sig] ?? "var(--ti-muted)") : "var(--ti-muted)";
  const sigLabel = sig ? SIGNAL_LABELS[sig] ?? sig : "Cable";
  const cs = resolveCableState(edge);

  const onCableAction = () => {
    if (!cs) return;
    if (cs.key === "unnumbered" || cs.key === "retired_reclaimable") {
      openNumberingForEdge(edgeId);
    } else {
      openNumberingPanel();
    }
  };

  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>{sigLabel} run</span>
        {cableId && (
          <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-mono)" }}>#{cableId}</span>
        )}
      </div>

      {/* From → To */}
      <div style={{ borderRadius: 10, border: "1px solid var(--ti-border)", background: "var(--ti-surface-2)", padding: 11, fontSize: 12.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <TiIcon name="arrowR" size={13} color="var(--ti-muted)" />
          <span style={{ fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
            {(fromNode?.data as DeviceData | undefined)?.label ?? fromNode?.id ?? edge.source}
          </span>
        </div>
        <div style={{ height: 14, marginLeft: 6, borderLeft: "2px dotted var(--ti-faint)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 13, textAlign: "center", color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>→</span>
          <span style={{ fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
            {(toNode?.data as DeviceData | undefined)?.label ?? toNode?.id ?? edge.target}
          </span>
        </div>
      </div>

      {cs && (
        <div style={{
          borderRadius: 10,
          border: `1px solid color-mix(in oklab, var(--ti-${cs.tone}) 35%, transparent)`,
          background: `var(--ti-${cs.tone}-soft)`,
          padding: 11,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: `var(--ti-${cs.tone})` }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: `color-mix(in oklab, var(--ti-${cs.tone}) 70%, var(--ti-ink))`, fontFamily: "var(--ti-font-sans)" }}>
              {cs.label}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ti-ink-2)", marginTop: 5, lineHeight: 1.45, fontFamily: "var(--ti-font-sans)" }}>{cs.hint}</div>
          <div style={{ marginTop: 9 }}>
            <TiButton size="sm" variant={cs.btnVariant} icon={cs.icon} onClick={onCableAction}>
              {cs.action}
            </TiButton>
          </div>
        </div>
      )}

      {/* Cable details */}
      <div>
        <SectionHead label="Cable details" />
        {sig && <Field label="Signal type" value={<TiBadge tone="neutral">{sigLabel}</TiBadge>} />}
        {cableId
          ? <Field label="Cable ID" value={cableId} mono />
          : (
            <div style={{
              borderRadius: 8, border: "1px dashed var(--ti-warning)",
              background: "var(--ti-warning-soft)", padding: 10,
              fontSize: 11.5, color: "color-mix(in oklab, var(--ti-warning) 65%, var(--ti-ink))",
              lineHeight: 1.45, fontFamily: "var(--ti-font-sans)",
            }}>
              No cable number assigned. Use the Numbering panel to assign one from a reserved range.
            </div>
          )
        }
        {data?.lineStyle && <Field label="Line style" value={data.lineStyle} />}
        {data?.label && <Field label="Label" value={data.label as string} />}
      </div>
    </div>
  );
}

// ─── KgoRightPanel ────────────────────────────────────────────────────────────

function KgoRightPanel() {
  const rightOpen = useSidebarStore((s) => s.rightInspectorOpen ?? true);
  const setRightOpen = useSidebarStore((s) => s.setRightInspectorOpen);

  // Derive first selected non-room device node and first selected edge
  const selNodeId = useSchematicStore((s) => {
    const sel = s.nodes.find((n) => n.selected && n.type === "device");
    return sel?.id ?? null;
  });
  const selEdgeId = useSchematicStore((s) => {
    const sel = s.edges.find((e) => e.selected && !e.data?.directAttach);
    return sel?.id ?? null;
  });

  const label = selNodeId ? "Device" : selEdgeId ? "Cable run" : "Inspector";

  if (!rightOpen) {
    return (
      <SidebarRail label="Inspector" title="Open inspector" onExpand={() => setRightOpen(true)} />
    );
  }

  return (
    <SidebarPanelShell
      widthClass="w-[19.5rem]"
      className="!bg-[var(--ti-surface)] !border-[var(--ti-border)]"
    >
      <SidebarPanelHeader
        title={label}
        onCollapse={() => setRightOpen(false)}
        collapseTitle="Collapse inspector"
        trailing={
          selNodeId || selEdgeId ? (
            <TiIconButton icon="x" variant="ghost" size="sm" onClick={clearCanvasSelection} title="Clear selection" />
          ) : undefined
        }
      />

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {selNodeId
          ? <DeviceInspector nodeId={selNodeId} />
          : selEdgeId
            ? <EdgeInspector edgeId={selEdgeId} />
            : <EmptyState />
        }
      </div>
    </SidebarPanelShell>
  );
}

export default memo(KgoRightPanel);
