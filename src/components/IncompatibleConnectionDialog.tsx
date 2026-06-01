import { useState, useMemo } from "react";
import { useSchematicStore } from "../store";
import { findAdaptersForSignalBridge, findAdaptersForConnectorBridge } from "../connectorTypes";
import { SIGNAL_LABELS, CONNECTOR_LABELS } from "../types";
import type { DeviceTemplate } from "../types";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { TiButton, TiIcon, TiIconButton } from "./ti/TiBase";

export default function IncompatibleConnectionDialog() {
  const pending = useSchematicStore((s) => s.pendingIncompatibleConnection);
  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const dismiss = useSchematicStore((s) => s.dismissIncompatibleDialog);
  const forceConnect = useSchematicStore((s) => s.forceIncompatibleConnection);
  const insertAdapter = useSchematicStore((s) => s.insertAdapterBetween);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const adapters = useMemo(() => {
    if (!pending) return [];
    const allTemplates = [...DEVICE_TEMPLATES, ...customTemplates];
    if (pending.reason === "connector-mismatch") {
      return findAdaptersForConnectorBridge(
        pending.sourcePort.connectorType!,
        pending.targetPort.connectorType!,
        pending.sourcePort.signalType,
        allTemplates,
      );
    }
    return findAdaptersForSignalBridge(
      pending.sourcePort.signalType,
      pending.targetPort.signalType,
      allTemplates,
    );
  }, [pending, customTemplates]);

  if (!pending) return null;

  const isConnectorMismatch = pending.reason === "connector-mismatch";
  const srcSignal = SIGNAL_LABELS[pending.sourcePort.signalType];
  const tgtSignal = SIGNAL_LABELS[pending.targetPort.signalType];
  const srcConn = pending.sourcePort.connectorType ? CONNECTOR_LABELS[pending.sourcePort.connectorType] : "";
  const tgtConn = pending.targetPort.connectorType ? CONNECTOR_LABELS[pending.targetPort.connectorType] : "";

  const highlighted = selectedIdx != null ? adapters[selectedIdx] : adapters[0] ?? null;

  const handleInsert = () => {
    const idx = selectedIdx ?? (adapters.length === 1 ? 0 : null);
    if (idx === null) return;
    insertAdapter(adapters[idx]);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "color-mix(in oklab, var(--ti-ink) 30%, transparent)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "100%",
          background: "var(--ti-surface)",
          border: "1px solid var(--ti-border)",
          borderRadius: 14,
          boxShadow: "var(--ti-shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 18px 14px",
            borderBottom: "1px solid var(--ti-divider)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--ti-danger-soft)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <TiIcon name="alert" size={17} color="var(--ti-danger)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}>
              {isConnectorMismatch ? "Connector mismatch" : "Signal mismatch"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 3,
                fontSize: 12.5,
                color: "var(--ti-ink-2)",
                fontFamily: "var(--ti-font-sans)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>{srcSignal}</span>
              {srcConn ? <span style={{ color: "var(--ti-muted)" }}>({srcConn})</span> : null}
              <TiIcon name="arrowR" size={13} color="var(--ti-muted)" />
              <span style={{ fontWeight: 600 }}>{tgtSignal}</span>
              {tgtConn ? <span style={{ color: "var(--ti-muted)" }}>({tgtConn})</span> : null}
            </div>
          </div>
          <TiIconButton icon="x" variant="ghost" size="sm" onClick={dismiss} />
        </div>

        <div style={{ padding: 18 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "var(--ti-ink-2)",
              lineHeight: 1.5,
              fontFamily: "var(--ti-font-sans)",
            }}
          >
            {isConnectorMismatch
              ? "These ports use different connector types. Insert an adapter between them, or connect anyway and flag the mismatch."
              : "These ports carry different signal types. Select a converter from the library, or connect anyway."}
          </p>

          {highlighted ? (
            <div
              style={{
                marginTop: 14,
                borderRadius: 10,
                border: "1px solid color-mix(in oklab, var(--ti-success) 35%, transparent)",
                background: "var(--ti-success-soft)",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    background: "var(--ti-surface)",
                    border: "1px solid var(--ti-border)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <TiIcon name="arrowSwap" size={15} color="var(--ti-success)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "color-mix(in oklab, var(--ti-success) 70%, var(--ti-ink))",
                      fontFamily: "var(--ti-font-sans)",
                    }}
                  >
                    {adapters.length > 1 ? "Selected adapter" : "Adapter found in library"}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      marginTop: 1,
                      color: "var(--ti-ink)",
                      fontFamily: "var(--ti-font-sans)",
                    }}
                  >
                    {highlighted.label}
                  </div>
                  {(highlighted.manufacturer || highlighted.modelNumber) && (
                    <div
                      data-mono
                      style={{ fontSize: 11, color: "var(--ti-muted)", marginTop: 2, fontFamily: "var(--ti-font-mono)" }}
                    >
                      {[highlighted.manufacturer, highlighted.modelNumber].filter(Boolean).join(" — ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                borderRadius: 10,
                border: "1px solid var(--ti-border)",
                background: "var(--ti-surface-2)",
                padding: 12,
                fontSize: 12.5,
                color: "var(--ti-muted)",
                fontStyle: "italic",
                fontFamily: "var(--ti-font-sans)",
              }}
            >
              No matching adapter found in the device library.
            </div>
          )}

          {adapters.length > 1 ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid var(--ti-border)",
                borderRadius: 10,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {adapters.map((t: DeviceTemplate, i: number) => (
                <button
                  key={t.id ?? `${t.label}-${i}`}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  onDoubleClick={() => {
                    setSelectedIdx(i);
                    insertAdapter(t);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 12px",
                    cursor: "pointer",
                    background: (selectedIdx ?? 0) === i ? "var(--ti-accent-soft)" : "transparent",
                    border: "none",
                    borderBottom: i < adapters.length - 1 ? "1px solid var(--ti-divider)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: (selectedIdx ?? 0) === i ? "var(--ti-accent-ink)" : "var(--ti-ink)",
                      fontFamily: "var(--ti-font-sans)",
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--ti-divider)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <TiButton variant="ghost" onClick={dismiss}>
            Cancel
          </TiButton>
          <TiButton variant="outline" onClick={forceConnect}>
            Connect anyway
          </TiButton>
          <TiButton
            variant="accent"
            icon="arrowSwap"
            disabled={!highlighted}
            onClick={handleInsert}
          >
            Insert adapter
          </TiButton>
        </div>
      </div>
    </div>
  );
}
