import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  readCollapsibleOpen,
  readCollapsiblePinned,
  writeCollapsibleOpen,
  writeCollapsiblePinned,
} from "../ui/collapsibleSectionPersistence";
import {
  collapsibleSectionSurfaceStyle,
  sectionTintFromPersistKey,
  type CollapsibleSectionDepth,
  type SectionTint,
} from "../ui/collapsibleSectionSurface";

export type { CollapsibleSectionDepth, SectionTint } from "../ui/collapsibleSectionSurface";

export interface CollapsibleModuleSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** When set, open/pinned state is restored per browser. */
  persistKey?: string;
  id?: string;
  /** 0 = top-level module section; 1–2 = nested sub-sections with indent and lighter shade. */
  depth?: CollapsibleSectionDepth;
  /** Actions aligned right in the header (e.g. + Add). */
  headerActions?: ReactNode;
  /** Pastel fill family; defaults from persistKey hash or slate at depth 1+. */
  tint?: SectionTint;
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

function resolveTint(
  explicit: SectionTint | undefined,
  persistKey: string | undefined,
  depth: CollapsibleSectionDepth,
): SectionTint {
  if (explicit) return explicit;
  if (depth > 0) return "slate";
  return sectionTintFromPersistKey(persistKey);
}

/**
 * Standard rollup section for ES module panels (device editor, trackIT numbering, preferences).
 * Light pastel fill per section; pin keeps the section expanded across sessions.
 */
export default function CollapsibleModuleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  className = "",
  persistKey,
  id,
  depth = 0,
  headerActions,
  tint: tintProp,
}: CollapsibleModuleSectionProps) {
  const tint = resolveTint(tintProp, persistKey, depth);
  const surface = useMemo(
    () => collapsibleSectionSurfaceStyle(tint, depth),
    [tint, depth],
  );

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

  const showPin = persistKey && depth === 0;

  return (
    <div
      id={id}
      className={`${surface.wrapperClass} ${className}`}
      style={surface.wrapper}
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
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer hover:brightness-[0.98]"
        style={surface.header}
        aria-expanded={open}
      >
        <span
          className={`text-[10px] text-[var(--color-text-muted)] shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <span className={`${surface.titleClass} shrink-0`}>{title}</span>
        {!open && hint ? (
          <span className="text-[11px] text-[var(--color-text-muted)] truncate min-w-0 flex-1 text-right font-normal normal-case tracking-normal">
            {hint}
          </span>
        ) : (
          <span className="flex-1 min-w-0" />
        )}
        {headerActions ? (
          <span
            className="shrink-0 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerActions}
          </span>
        ) : null}
        {showPin ? (
          <button
            type="button"
            onClick={handlePinClick}
            className={`shrink-0 rounded p-1 transition-colors cursor-pointer ${
              pinned
                ? "text-[var(--color-accent,#2563eb)] bg-[color-mix(in_oklab,var(--color-bg)_85%,transparent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] hover:bg-[color-mix(in_oklab,var(--color-bg)_70%,transparent)]"
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
        <div className={surface.bodyClass} style={surface.body}>
          {children}
        </div>
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
