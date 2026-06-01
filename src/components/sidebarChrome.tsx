import type { ReactNode } from "react";

/** Shared expand / collapse chevron for schematic sidebars. */
export function SidebarRailChevron({ direction }: { direction: "expand" | "collapse" | "close" }) {
  const d =
    direction === "close"
      ? "M4 4l8 8M12 4l-8 8"
      : direction === "collapse"
        ? "M6 3l5 5-5 5"
        : "M10 3l-5 5 5 5";
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-4 h-4 text-[var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const RAIL_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] select-none";

const RAIL_SHELL_CLASS =
  "w-8 shrink-0 h-full flex flex-col items-center border-l border-[var(--color-border)] bg-[var(--color-surface)]";

const RAIL_EXPAND_BTN_CLASS =
  "w-full py-2.5 flex justify-center items-center hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors";

export type SidebarRailProps = {
  /** Vertical label on the collapsed rail (short, e.g. "Numbers", "CAD") */
  label: string;
  /** Expand button tooltip */
  title: string;
  onExpand: () => void;
  /** Optional badge below the label (e.g. unnumbered count) */
  badge?: ReactNode;
};

/** Collapsed right/left dock rail — fixed 32px width, chevron expand, vertical title. */
export function SidebarRail({ label, title, onExpand, badge }: SidebarRailProps) {
  return (
    <div className={RAIL_SHELL_CLASS} data-print-hide>
      <button type="button" onClick={onExpand} className={RAIL_EXPAND_BTN_CLASS} title={title}>
        <SidebarRailChevron direction="expand" />
      </button>
      <div className="flex flex-col items-center gap-1 pt-1 pb-2 min-h-0">
        <span className={RAIL_LABEL_CLASS} style={{ writingMode: "vertical-rl" }}>
          {label}
        </span>
        {badge}
      </div>
    </div>
  );
}

const PANEL_HEADER_CLASS =
  "h-9 px-2 border-b border-[var(--color-border)] flex items-center gap-1 shrink-0 bg-[var(--color-surface)]";

const PANEL_TITLE_CLASS =
  "flex-1 min-w-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-heading)] truncate";

export type SidebarPanelHeaderProps = {
  title: string;
  onCollapse: () => void;
  collapseTitle?: string;
  /** Close (×) instead of collapse chevron — mobile drawers */
  closeMode?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

/** Expanded panel title bar — shared height, type, and collapse control. */
export function SidebarPanelHeader({
  title,
  onCollapse,
  collapseTitle = "Collapse",
  closeMode = false,
  leading,
  trailing,
}: SidebarPanelHeaderProps) {
  return (
    <div className={PANEL_HEADER_CLASS}>
      {leading}
      <h2 className={PANEL_TITLE_CLASS}>{title}</h2>
      {trailing}
      <button
        type="button"
        onClick={onCollapse}
        className="shrink-0 p-1 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
        title={closeMode ? "Close" : collapseTitle}
      >
        <SidebarRailChevron direction={closeMode ? "close" : "collapse"} />
      </button>
    </div>
  );
}

/** Outer shell for an expanded dock panel (surface + border). */
export function SidebarPanelShell({
  widthClass,
  mobile,
  children,
  className = "",
}: {
  widthClass: string;
  mobile?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${mobile ? "w-full" : widthClass} bg-[var(--color-surface)] ${
        mobile ? "" : "border-l"
      } border-[var(--color-border)] flex flex-col h-full overflow-hidden shrink-0 ${className}`}
      data-print-hide
    >
      {children}
    </div>
  );
}
