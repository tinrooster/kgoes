/**
 * Global confirm / prompt dialogs (replaces window.confirm / window.prompt).
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDialogStore, type ConfirmDialogOptions, type PromptDialogOptions } from "../appDialogStore";
import { TiButton, TiIconButton } from "./ti/TiBase";

function ConfirmModal({
  opts,
  onResult,
}: {
  opts: ConfirmDialogOptions;
  onResult: (ok: boolean) => void;
}) {
  const danger = opts.tone === "danger";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onResult]);

  return (
    <div
      role="alertdialog"
      aria-modal
      aria-labelledby="app-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "color-mix(in oklab, var(--ti-ink) 35%, transparent)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onMouseDown={() => onResult(false)}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100%",
          background: "var(--ti-surface)",
          border: "1px solid var(--ti-border)",
          borderRadius: 14,
          boxShadow: "var(--ti-shadow-lg)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "16px 18px 12px",
            borderBottom: "1px solid var(--ti-divider)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="app-dialog-title"
              style={{ fontSize: 15, fontWeight: 600, color: "var(--ti-ink)", lineHeight: 1.35 }}
            >
              {opts.title ?? (danger ? "Confirm" : "Are you sure?")}
            </div>
          </div>
          <TiIconButton icon="x" variant="ghost" size="sm" title="Cancel" onClick={() => onResult(false)} />
        </div>
        <div style={{ padding: "14px 18px 18px", fontSize: 13.5, color: "var(--ti-ink-2)", lineHeight: 1.5 }}>
          {opts.message}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 18px 16px",
            borderTop: "1px solid var(--ti-divider)",
          }}
        >
          <TiButton variant="outline" size="md" onClick={() => onResult(false)}>
            {opts.cancelLabel ?? "Cancel"}
          </TiButton>
          <TiButton
            variant={danger ? "danger" : "accent"}
            size="md"
            onClick={() => onResult(true)}
          >
            {opts.confirmLabel ?? (danger ? "Delete" : "OK")}
          </TiButton>
        </div>
      </div>
    </div>
  );
}

function PromptModal({
  opts,
  onResult,
}: {
  opts: PromptDialogOptions;
  onResult: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(opts.defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onResult]);

  const submit = () => {
    const trimmed = value.trim();
    const err = opts.validate?.(trimmed) ?? null;
    if (err) {
      setError(err);
      return;
    }
    onResult(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="app-prompt-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "color-mix(in oklab, var(--ti-ink) 35%, transparent)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onMouseDown={() => onResult(null)}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100%",
          background: "var(--ti-surface)",
          border: "1px solid var(--ti-border)",
          borderRadius: 14,
          boxShadow: "var(--ti-shadow-lg)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "16px 18px 12px",
            borderBottom: "1px solid var(--ti-divider)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="app-prompt-title"
              style={{ fontSize: 15, fontWeight: 600, color: "var(--ti-ink)", lineHeight: 1.35 }}
            >
              {opts.title ?? "Enter value"}
            </div>
            {opts.message && (
              <div style={{ fontSize: 12.5, color: "var(--ti-muted)", marginTop: 6, lineHeight: 1.45 }}>
                {opts.message}
              </div>
            )}
          </div>
          <TiIconButton icon="x" variant="ghost" size="sm" title="Cancel" onClick={() => onResult(null)} />
        </div>
        <div style={{ padding: "14px 18px 4px" }}>
          {opts.label && (
            <label
              htmlFor="app-prompt-input"
              style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ti-muted)", marginBottom: 6 }}
            >
              {opts.label}
            </label>
          )}
          <input
            id="app-prompt-input"
            ref={inputRef}
            type="text"
            value={value}
            placeholder={opts.placeholder}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            style={{
              width: "100%",
              height: 38,
              padding: "0 12px",
              borderRadius: 9,
              border: `1px solid ${error ? "var(--ti-danger)" : "var(--ti-border)"}`,
              background: "var(--ti-bg)",
              fontSize: 13.5,
              color: "var(--ti-ink)",
              fontFamily: "var(--ti-font-sans)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <div style={{ fontSize: 11.5, color: "var(--ti-danger)", marginTop: 6 }}>{error}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "16px 18px",
          }}
        >
          <TiButton variant="outline" size="md" onClick={() => onResult(null)}>
            {opts.cancelLabel ?? "Cancel"}
          </TiButton>
          <TiButton variant="accent" size="md" onClick={submit}>
            {opts.confirmLabel ?? "Save"}
          </TiButton>
        </div>
      </div>
    </div>
  );
}

export default function AppDialogHost() {
  const active = useAppDialogStore((s) => s.active);
  const resolveConfirm = useAppDialogStore((s) => s.resolveConfirm);
  const resolvePrompt = useAppDialogStore((s) => s.resolvePrompt);

  if (!active) return null;

  const panel =
    active.kind === "confirm" ? (
      <ConfirmModal opts={active.opts} onResult={resolveConfirm} />
    ) : (
      <PromptModal opts={active.opts} onResult={resolvePrompt} />
    );

  return createPortal(panel, document.body);
}
