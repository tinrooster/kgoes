import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import {
  readCollapsibleOpen,
  readCollapsiblePinned,
  writeCollapsibleOpen,
  writeCollapsiblePinned,
} from "../ui/collapsibleSectionPersistence";

export interface CollapsibleModuleSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** When set, open/pinned state is restored per browser. */
  persistKey?: string;
  id?: string;
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      aria-hidden
    >
      <path d="M12 17v5M9 3h6l1 7h4l-7 7-7-7h4z" />
    </svg>
  );
}

function resolveInitialOpen(persistKey: string | undefined, defaultOpen: boolean): boolean {
  if (persistKey) {
    const pinned = readCollapsiblePinned(persistKey);
    if (pinned) return true;
    const saved = readCollapsibleOpen(persistKey);
    if (saved !== null) return saved;
  }
  return defaultOpen;
}

/**
 * Standard rollup section for ES module panels (device editor, trackIT numbering, preferences).
 * Title + optional hint when collapsed; pin keeps the section expanded across sessions.
 */
export default function CollapsibleModuleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  className = "",
  persistKey,
  id,
}: CollapsibleModuleSectionProps) {
  const [open, setOpen] = useState(() => resolveInitialOpen(persistKey, defaultOpen));
  const [pinned, setPinned] = useState(() =>
    persistKey ? readCollapsiblePinned(persistKey) : false,
  );

  const setOpenPersisted = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (persistKey) writeCollapsibleOpen(persistKey, next);
    },
    [persistKey],
  );

  const handleHeaderClick = () => {
    if (pinned && open) return;
    setOpenPersisted(!open);
  };

  const handlePinClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!persistKey) return;
    const next = !pinned;
    setPinned(next);
    writeCollapsiblePinned(persistKey, next);
    if (next) setOpenPersisted(true);
  };

  return (
    <div
      id={id}
      className={`rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden ${className}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleHeaderClick();
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <span
          className={`text-[10px] text-[var(--color-text-muted)] shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-heading)] shrink-0">
          {title}
        </span>
        {!open && hint ? (
          <span className="text-[11px] text-[var(--color-text-muted)] truncate min-w-0 flex-1 text-right font-normal normal-case tracking-normal">
            {hint}
          </span>
        ) : (
          <span className="flex-1 min-w-0" />
        )}
        {persistKey ? (
          <button
            type="button"
            onClick={handlePinClick}
            className={`shrink-0 rounded p-1 transition-colors cursor-pointer ${
              pinned
                ? "text-[var(--color-accent,#2563eb)] bg-[var(--color-surface)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] hover:bg-[var(--color-surface)]"
            }`}
            title={pinned ? "Unpin section (allow collapse)" : "Pin section open"}
            aria-label={pinned ? "Unpin section" : "Pin section open"}
            aria-pressed={pinned}
          >
            <PinIcon filled={pinned} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="border-t border-[var(--color-border)] px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

/** One-line port counts for collapsed section headers. */
export function summarizePortsHint(ports: { direction: string; signalType?: string }[]): string {
  const inputs = ports.filter((p) => p.direction === "input").length;
  const outputs = ports.filter((p) => p.direction === "output").length;
  const gpio = ports.filter((p) => p.signalType === "gpio").length;
  const bidir = ports.filter((p) => p.direction === "bidirectional").length;
  const passthrough = ports.filter((p) => p.direction === "passthrough").length;

  const parts: string[] = [];
  if (inputs > 0) parts.push(`${inputs} input${inputs === 1 ? "" : "s"}`);
  if (outputs > 0) parts.push(`${outputs} output${outputs === 1 ? "" : "s"}`);
  if (gpio > 0) parts.push(`${gpio} gpio`);
  else if (bidir > 0) parts.push(`${bidir} bidir`);
  if (passthrough > 0) parts.push(`${passthrough} passthrough`);

  return parts.length > 0 ? parts.join(" · ") : "No ports";
}
