import type { ReactNode } from "react";
import type { WorkspacePanelId } from "../workspacePanelLayout";
import WorkspacePanelDragHandle from "./WorkspacePanelDragHandle";
import { useWorkspacePanelDragHandle, useWorkspacePanelFloating } from "../workspacePanelContext";

export type SidebarDockSide = "left" | "right";

const CHEVRON_LEFT = "M10 3l-5 5 5 5";
const CHEVRON_RIGHT = "M6 3l5 5-5 5";

/** Shared expand / collapse chevron for schematic sidebars. */
export function SidebarRailChevron({
  direction,
  dockSide = "right",
}: {
  direction: "expand" | "collapse" | "close";
  dockSide?: SidebarDockSide;
}) {
  const d =
    direction === "close"
      ? "M4 4l8 8M12 4l-8 8"
      : direction === "expand"
        ? dockSide === "right"
          ? CHEVRON_LEFT
          : CHEVRON_RIGHT
        : dockSide === "right"
          ? CHEVRON_RIGHT
          : CHEVRON_LEFT;
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

const RAIL_SHELL_BASE =
  "w-8 shrink-0 h-full flex flex-col items-center bg-[var(--color-surface)]";

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
  /** Which screen edge this rail is docked to (controls chevron direction). */
  dockSide?: SidebarDockSide;
};

/** Collapsed right/left dock rail — fixed 32px width, chevron expand, vertical title. */
export function SidebarRail({ label, title, onExpand, badge, dockSide = "right" }: SidebarRailProps) {
  return (
    <div
      className={`${RAIL_SHELL_BASE} ${
        dockSide === "left" ? "border-r" : "border-l"
      } border-[var(--color-border)]`}
      data-print-hide
    >
      <button type="button" onClick={onExpand} className={RAIL_EXPAND_BTN_CLASS} title={title}>
        <SidebarRailChevron direction="expand" dockSide={dockSide} />
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
  /** Enables workspace drag-to-dock / float repositioning */
  workspacePanelId?: WorkspacePanelId;
  dockSide?: SidebarDockSide;
};

/** Expanded panel title bar — shared height, type, and collapse control. */
export function SidebarPanelHeader({
  title,
  onCollapse,
  collapseTitle = "Collapse",
  closeMode = false,
  leading,
  trailing,
  workspacePanelId,
  dockSide = "right",
}: SidebarPanelHeaderProps) {
  const drag = useWorkspacePanelDragHandle();
  return (
    <div className={PANEL_HEADER_CLASS}>
      {workspacePanelId && drag ? (
        <WorkspacePanelDragHandle panelId={workspacePanelId} onStartDrag={drag.startDrag} />
      ) : null}
      {leading}
      <h2 className={PANEL_TITLE_CLASS}>{title}</h2>
      {trailing}
      <button
        type="button"
        onClick={onCollapse}
        className="shrink-0 p-1 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
        title={closeMode ? "Close" : collapseTitle}
      >
        <SidebarRailChevron
          direction={closeMode ? "close" : "collapse"}
          dockSide={closeMode ? "right" : dockSide}
        />
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
  dockSide = "right",
}: {
  widthClass: string;
  mobile?: boolean;
  children: ReactNode;
  className?: string;
  dockSide?: SidebarDockSide;
}) {
  const floating = useWorkspacePanelFloating();
  const dockBorder =
    mobile || floating ? "" : dockSide === "left" ? "border-r" : "border-l";
  return (
    <div
      className={`${mobile ? "w-full" : widthClass} bg-[var(--color-surface)] ${dockBorder} border-[var(--color-border)] flex flex-col ${
        floating ? "max-h-[min(72vh,560px)] h-auto" : "h-full"
      } overflow-hidden shrink-0 ${floating ? "shadow-none" : ""} ${className}`}
      data-print-hide
    >
      {children}
    </div>
  );
}
