import { useState, type ReactNode } from "react";

interface CollapsibleDetailSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** Accordion row for device / tower detail panels — title + muted hint when collapsed. */
export default function CollapsibleDetailSection({
  title,
  hint,
  defaultOpen = false,
  children,
  className = "",
}: CollapsibleDetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        ) : null}
      </button>
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
