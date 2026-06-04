import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSchematicStore } from "../store";

function formatTime(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(at));
  } catch {
    return "";
  }
}

type Props = {
  variant?: "desktop" | "mobile";
};

export default function UndoHistoryControls({ variant = "desktop" }: Props) {
  const undo = useSchematicStore((s) => s.undo);
  const redo = useSchematicStore((s) => s.redo);
  const undoToDepth = useSchematicStore((s) => s.undoToDepth);
  const undoSize = useSchematicStore((s) => s.undoSize);
  const redoSize = useSchematicStore((s) => s.redoSize);
  const listUndoHistory = useSchematicStore((s) => s.listUndoHistory);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const history = listUndoHistory(8);
  const showHistory = undoSize > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const handleJump = (depth: number) => {
    undoToDepth(depth);
    setOpen(false);
  };

  if (variant === "mobile") {
    return (
      <div ref={ref} className="relative flex items-center">
        <div className="flex items-center">
          <button
            disabled={undoSize === 0}
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-l hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
          >
            <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h7a3 3 0 0 1 0 6H9" />
              <path d="M6 4 3 7l3 3" />
            </svg>
          </button>
          {showHistory ? (
            <button
              disabled={undoSize === 0}
              onClick={() => setOpen((v) => !v)}
              title="Undo history"
              aria-label="Open undo history"
              className="px-0.5 py-2 rounded-r hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          ) : null}
        </div>
        <button
          disabled={redoSize === 0}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-2 rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-text)] ml-1"
        >
          <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 7H6a3 3 0 0 0 0 6h1" />
            <path d="M10 4l3 3-3 3" />
          </svg>
        </button>
        {open && showHistory ? (
          <div
            className="absolute left-0 top-full z-[120] mt-1 w-72 rounded-lg py-1 shadow-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Recent edits
            </div>
            {history.length === 0 ? (
              <div className="px-3 py-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No checkpoints yet
              </div>
            ) : (
              history.map((item) => (
                <button
                  key={`${item.depth}-${item.at}`}
                  type="button"
                  onClick={() => handleJump(item.depth)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="text-sm leading-snug" style={{ color: "var(--color-text-heading)" }}>
                    {item.label}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {formatTime(item.at)}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }

  const btnBase: CSSProperties = {
    display: "grid",
    placeItems: "center",
    border: 0,
    background: "transparent",
    color: "var(--ti-ink-2)",
    transition: "background 100ms",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          title="Undo (Ctrl+Z)"
          disabled={undoSize === 0}
          onClick={undo}
          style={{
            ...btnBase,
            width: 30,
            height: 30,
            borderRadius: showHistory ? "7px 0 0 7px" : 7,
            cursor: undoSize === 0 ? "not-allowed" : "pointer",
            opacity: undoSize === 0 ? 0.3 : 1,
          }}
          className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
        >
          <svg viewBox="0 0 16 16" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h7a3 3 0 0 1 0 6H9" />
            <path d="M6 4 3 7l3 3" />
          </svg>
        </button>
        {showHistory ? (
          <button
            title="Undo history"
            aria-label="Open undo history"
            disabled={undoSize === 0}
            onClick={() => setOpen((v) => !v)}
            style={{
              ...btnBase,
              width: 18,
              height: 30,
              borderRadius: "0 7px 7px 0",
              cursor: undoSize === 0 ? "not-allowed" : "pointer",
              opacity: undoSize === 0 ? 0.3 : 1,
            }}
            className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
          >
            <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        ) : null}
      </div>
      <button
        title="Redo (Ctrl+Shift+Z)"
        disabled={redoSize === 0}
        onClick={redo}
        style={{
          ...btnBase,
          width: 30,
          height: 30,
          borderRadius: 7,
          marginLeft: 2,
          cursor: redoSize === 0 ? "not-allowed" : "pointer",
          opacity: redoSize === 0 ? 0.3 : 1,
        }}
        className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
      >
        <svg viewBox="0 0 16 16" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 7H6a3 3 0 0 0 0 6h1" />
          <path d="M10 4l3 3-3 3" />
        </svg>
      </button>
      {open && showHistory ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: 288,
            borderRadius: 8,
            overflow: "hidden",
            zIndex: 120,
            background: "var(--color-surface, var(--ti-surface-1))",
            border: "1px solid var(--color-border, var(--ti-divider))",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-muted, var(--ti-ink-3))",
              borderBottom: "1px solid var(--color-border, var(--ti-divider))",
            }}
          >
            Recent edits
          </div>
          {history.length === 0 ? (
            <div style={{ padding: "8px 12px", fontSize: 13, color: "var(--color-text-muted, var(--ti-ink-3))" }}>
              No checkpoints yet
            </div>
          ) : (
            history.map((item) => (
              <button
                key={`${item.depth}-${item.at}`}
                type="button"
                onClick={() => handleJump(item.depth)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  border: 0,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
              >
                <div style={{ fontSize: 13, lineHeight: 1.35, color: "var(--color-text-heading, var(--ti-ink-1))" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted, var(--ti-ink-3))", marginTop: 2 }}>
                  {formatTime(item.at)}
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
