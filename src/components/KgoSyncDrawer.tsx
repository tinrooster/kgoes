/**
 * KgoSyncDrawer — TrackIt sync slide-out drawer (design v2).
 */

import { memo, useMemo } from "react";
import { useSchematicStore } from "../store";
import { TiIcon, TiIconButton, TiButton } from "./ti/TiBase";
import {
  isTrackItDrawingLinked,
  isTrackItPopupOpener,
  saveToTrackItParent,
} from "../trackitIntegration";
import { buildTrackItPlantDrawingUrl, openTrackItUrl } from "../trackitAppLinks";
import { countUnnumberedEdges } from "../kgoCableState";
import { openNumberingForEdge, openNumberingPanel } from "../kgoInspectorUtils";
import { computeTrackItSyncStatus } from "../trackitSyncStatus";
import { useKgoSaveFeedbackStore, clearKgoSaveFeedback } from "../kgoSaveFeedbackStore";
import { KgoDialogFormFeedback } from "./KgoDialogFormFeedback";

interface KgoSyncDrawerProps {
  open: boolean;
  onClose: () => void;
}

type SyncFeedKind = "cables" | "local" | "info";

interface SyncFeedItem {
  id: string;
  kind: SyncFeedKind;
  icon: string;
  title: string;
  detail: string;
  verb: string;
  verbVariant: "default" | "accent" | "danger";
  edgeId?: string;
  nodeId?: string;
}

function KgoSyncDrawer({ open, onClose }: KgoSyncDrawerProps) {
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const lastPushed = useSchematicStore((s) => s.trackItLastPushedAt);
  const hasUnsavedChanges = useSchematicStore((s) => s.trackItUnsavedChanges);
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const assignAll = useSchematicStore((s) => s.assignAllUnnumberedTrackItNumbers);
  const saveFeedback = useKgoSaveFeedbackStore((s) => s.feedback);

  const nodeCount = nodes.filter((n) => n.type === "device").length;
  const edgeCount = edges.filter((e) => !e.data?.directAttach).length;
  const unnumberedCount = useMemo(() => countUnnumberedEdges(edges), [edges]);
  const roomCount = nodes.filter((n) => n.type === "room").length;

  const isLinked = isTrackItDrawingLinked() && !!trackItLink?.drawingId;
  const isPopupOpener = isTrackItPopupOpener();
  const syncStatus = computeTrackItSyncStatus({
    isLinked,
    lastPushedAt: lastPushed,
    hasUnsavedChanges,
    unnumberedCount,
  });
  const drawingLabel = trackItLink?.dwgNumber
    ? `DWG ${trackItLink.dwgNumber}${trackItLink.drawingName ? ` — ${trackItLink.drawingName}` : ""}`
    : "Linked drawing";

  const lastPushedLabel = lastPushed
    ? `Last saved ${new Date(lastPushed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  const feed = useMemo(() => {
    const items: SyncFeedItem[] = [];

    if (!isLinked && !isPopupOpener) {
      items.push({
        id: "standalone",
        kind: "info",
        icon: "link",
        title: "Not linked to TrackIt",
        detail: "Open this schematic from a plant drawing in TrackIt to enable two-way sync.",
        verb: "Learn more",
        verbVariant: "default",
      });
    } else if (isPopupOpener && !isLinked) {
      items.push({
        id: "awaiting-link",
        kind: "info",
        icon: "folder",
        title: "Waiting for TrackIt link",
        detail: "Go to TrackIt Plant → Drawings and open a drawing in KGO-ES.",
        verb: "Open numbering",
        verbVariant: "default",
      });
    }

    if (unnumberedCount > 0) {
      const firstUnnumbered = edges.find(
        (e) => !e.data?.directAttach && !e.data?.cableId && e.data?.signalType,
      );
      items.push({
        id: "unnumbered-cables",
        kind: "cables",
        icon: "hash",
        title: `${unnumberedCount} unnumbered cable run${unnumberedCount !== 1 ? "s" : ""}`,
        detail: "Assign cable numbers from reserved blocks to complete the plant record.",
        verb: "Assign numbers",
        verbVariant: "accent",
        edgeId: firstUnnumbered?.id,
      });
    }

    if (isLinked && syncStatus.needsSchematicSave) {
      items.push({
        id: "unsaved",
        kind: "local",
        icon: "upload",
        title: lastPushed ? "Unsaved changes" : "Drawing not saved to TrackIt yet",
        detail: lastPushed
          ? "Your edits are only in KGO-ES until you save — trackIT will update the plant drawing register."
          : "Save now to write schematic JSON and cable schedule to the plant drawing.",
        verb: "Save now",
        verbVariant: "accent",
      });
    }

    return items;
  }, [edges, isLinked, isPopupOpener, lastPushed, syncStatus.needsSchematicSave, unnumberedCount]);

  const kindMeta = (kind: SyncFeedKind) => {
    if (kind === "cables") return { tone: "accent" as const, icon: "hash" };
    if (kind === "local") return { tone: "info" as const, icon: "upload" };
    return { tone: "info" as const, icon: "link" };
  };

  const resolveItem = (item: SyncFeedItem) => {
    if (item.id === "unsaved") {
      saveNow();
      return;
    }
    if (item.kind === "cables" && item.edgeId) {
      openNumberingForEdge(item.edgeId);
      onClose();
      return;
    }
    if (item.id === "awaiting-link") {
      openNumberingPanel();
      return;
    }
  };

  const onPushSchedule = () => {
    const assigned = assignAll();
    if (assigned > 0 && isLinked) {
      saveToTrackItParent();
    }
    onClose();
  };

  const pendingCount = syncStatus.pendingCount;

  const saveNow = () => {
    const ok = saveToTrackItParent();
    if (!ok) return;
    clearKgoSaveFeedback();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      data-print-hide
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "color-mix(in oklab, var(--ti-ink) 22%, transparent)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        id="kgo-sync-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="TrackIt sync"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380, height: "100%",
          background: "var(--ti-surface)",
          borderLeft: "1px solid var(--ti-border)",
          boxShadow: "var(--ti-shadow-lg)",
          display: "flex", flexDirection: "column",
          animation: "kgoSlide 180ms ease",
        }}
      >
        <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--ti-divider)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "var(--ti-ink)", color: "var(--ti-bg)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--ti-font-mono)", fontSize: 11, fontWeight: 600,
            }}>tI</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>TrackIt sync</div>
              <div style={{ fontSize: 11, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>Drawing ⇄ plant register</div>
            </div>
            <TiIconButton icon="x" variant="ghost" size="sm" onClick={onClose} />
          </div>

          {isLinked && syncStatus.needsSchematicSave ? (
            <div style={{ marginTop: 10 }}>
              <TiButton variant="accent" icon="upload" fullWidth onClick={saveNow}>
                Save to TrackIt now
              </TiButton>
              <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "var(--ti-muted)", fontFamily: "var(--ti-font-sans)" }}>
                Ctrl+S · autosave every 25s after edits
              </p>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
            {[
              { label: "Devices", value: nodeCount, tone: "accent" as const },
              { label: "Runs", value: edgeCount, tone: "accent" as const },
              {
                label: "Pending",
                value: pendingCount,
                tone: pendingCount > 0 ? "warning" as const : "success" as const,
              },
            ].map((item) => (
              <div key={item.label} style={{
                flex: 1, borderRadius: 8,
                border: `1px solid color-mix(in oklab, var(--ti-${item.tone}) 30%, transparent)`,
                background: `var(--ti-${item.tone}-soft)`,
                padding: "7px 9px",
              }}>
                <div style={{
                  fontSize: 17, fontWeight: 700,
                  color: `color-mix(in oklab, var(--ti-${item.tone}) 70%, var(--ti-ink))`,
                  fontFamily: "var(--ti-font-mono)",
                }}>{item.value}</div>
                <div style={{ fontSize: 10.5, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {saveFeedback?.variant === "error" ? (
            <KgoDialogFormFeedback
              variant="error"
              title={saveFeedback.title}
              message={saveFeedback.message}
            />
          ) : null}
          <div style={{
            borderRadius: 10, border: "1px solid var(--ti-border)",
            background: "var(--ti-surface)", overflow: "hidden",
          }}>
            <div style={{ display: "flex", gap: 9, padding: 11 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: isLinked ? "var(--ti-success-soft)" : "var(--ti-surface-2)",
                display: "grid", placeItems: "center",
              }}>
                <TiIcon name={isLinked ? "link" : "folder"} size={15} color={isLinked ? "var(--ti-success)" : "var(--ti-muted)"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
                  {isLinked ? drawingLabel : isPopupOpener ? "Waiting for link from TrackIt…" : "Standalone schematic"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ti-ink-2)", marginTop: 2, lineHeight: 1.4, fontFamily: "var(--ti-font-sans)" }}>
                  {isLinked
                    ? (lastPushedLabel ?? "Autosave every 25s after edits · Ctrl+S to save now")
                    : isPopupOpener
                      ? "Go to TrackIt Plant → Drawings and open a drawing in KGO-ES."
                      : "Open from TrackIt Plant → Drawings to enable sync."}
                </div>
                {isLinked && trackItLink?.drawingId && (
                  <button
                    type="button"
                    onClick={() => openTrackItUrl(buildTrackItPlantDrawingUrl({ drawingId: trackItLink!.drawingId!, dwgNumber: trackItLink!.dwgNumber }))}
                    style={{
                      marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 500, color: "var(--ti-accent-ink)",
                      border: 0, background: "transparent", cursor: "pointer",
                      fontFamily: "var(--ti-font-sans)",
                    }}
                  >
                    View drawing in TrackIt
                    <TiIcon name="arrowR" size={12} color="var(--ti-accent-ink)" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {feed.map((item) => {
            const meta = kindMeta(item.kind);
            return (
              <div key={item.id} style={{
                borderRadius: 10, border: "1px solid var(--ti-border)",
                background: "var(--ti-surface)", overflow: "hidden",
              }}>
                <div style={{ display: "flex", gap: 9, padding: 11 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: `var(--ti-${meta.tone}-soft)`,
                    display: "grid", placeItems: "center",
                  }}>
                    <TiIcon name={item.icon} size={15} color={`var(--ti-${meta.tone})`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ti-ink-2)", marginTop: 2, lineHeight: 1.4, fontFamily: "var(--ti-font-sans)" }}>{item.detail}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <TiButton size="sm" variant={item.verbVariant} icon={meta.icon} onClick={() => resolveItem(item)}>
                        {item.verb}
                      </TiButton>
                      {item.edgeId && (
                        <TiButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (item.edgeId) openNumberingForEdge(item.edgeId);
                            onClose();
                          }}
                        >
                          Show on canvas
                        </TiButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {feed.length === 0 && isLinked && unnumberedCount === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--ti-muted)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--ti-success-soft)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <TiIcon name="check" size={20} color="var(--ti-success)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>Fully in sync</div>
              <div style={{ fontSize: 12, marginTop: 3, fontFamily: "var(--ti-font-sans)" }}>Drawing matches the TrackIt plant register.</div>
            </div>
          )}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--ti-divider)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {isLinked && unnumberedCount > 0 && (
            <TiButton variant="accent" icon="upload" fullWidth onClick={onPushSchedule}>
              Push cable schedule to TrackIt
            </TiButton>
          )}
          {isLinked && !syncStatus.needsSchematicSave ? (
            <TiButton variant="default" icon="upload" fullWidth onClick={saveNow}>
              Save to TrackIt now
            </TiButton>
          ) : null}
          <div style={{ fontSize: 10.5, color: "var(--ti-muted)", textAlign: "center", fontFamily: "var(--ti-font-sans)" }}>
            {isLinked
              ? `${nodeCount} device${nodeCount !== 1 ? "s" : ""} · ${edgeCount} run${edgeCount !== 1 ? "s" : ""} · ${roomCount} room${roomCount !== 1 ? "s" : ""}`
              : "Open from TrackIt to enable save and cable number sync."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(KgoSyncDrawer);
