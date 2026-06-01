import type { ReactNode } from "react";
import type { RightPanelId } from "../sidebarStore";
import { useSidebarStore } from "../sidebarStore";
import { TiIcon } from "./ti/TiBase";
import { SidebarPanelHeader, SidebarPanelShell, SidebarRail } from "./sidebarChrome";

export type ToolPaletteAction = {
  id: string;
  label: string;
  title?: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "warning";
  disabled?: boolean;
};

export type ToolPaletteSection = {
  title: string;
  actions: ToolPaletteAction[];
};

type ToolPalettePanelProps = {
  panelId: RightPanelId;
  title: string;
  railLabel: string;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  sections: ToolPaletteSection[];
  mobile?: boolean;
  onClose?: () => void;
  headerIcon?: ReactNode;
};

export default function ToolPalettePanel({
  panelId,
  title,
  railLabel,
  expanded,
  setExpanded,
  sections,
  mobile,
  onClose,
  headerIcon,
}: ToolPalettePanelProps) {
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const iconOnly = useSidebarStore((s) => s.toolPaletteIconOnly);
  const toggleIconOnly = useSidebarStore((s) => s.toggleToolPaletteIconOnly);
  const collapsed = mobile ? false : !expanded;

  if (!mobile && collapsed) {
    return (
      <SidebarRail label={railLabel} title={title} onExpand={() => expandRightPanel(panelId)} />
    );
  }

  const panelWidth = iconOnly ? "w-10" : "w-[7.25rem]";

  const actionBtnClass = (tone: ToolPaletteAction["tone"]) => {
    const base =
      "rounded border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    if (tone === "warning") {
      return `${base} border-amber-300/60 bg-amber-50/80 hover:bg-amber-100 text-amber-950`;
    }
    return `${base} border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-heading)]`;
  };

  const iconToggle = (
    <button
      type="button"
      onClick={toggleIconOnly}
      className="shrink-0 p-1 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
      title={iconOnly ? "Show text labels" : "Icons only"}
      aria-pressed={iconOnly}
    >
      <TiIcon name={iconOnly ? "list" : "grid"} size={14} color="var(--color-text-muted)" />
    </button>
  );

  return (
    <SidebarPanelShell widthClass={mobile ? "max-w-xs w-full" : panelWidth} mobile={mobile}>
      <SidebarPanelHeader
        title={iconOnly ? "" : title}
        onCollapse={() => (mobile ? onClose?.() : setExpanded(false))}
        closeMode={mobile}
        leading={headerIcon && !iconOnly ? <span className="shrink-0 text-[var(--color-text-muted)]">{headerIcon}</span> : undefined}
        trailing={iconToggle}
      />

      <div className={`flex-1 overflow-y-auto min-h-0 ${iconOnly ? "p-1 space-y-1" : "p-1 space-y-2"}`}>
        {sections.map((section, si) => (
          <div
            key={section.title}
            className={si > 0 ? (iconOnly ? "pt-1 border-t border-[var(--color-border)]" : "pt-1.5 border-t border-[var(--color-border)]") : ""}
          >
            {!iconOnly ? (
              <div className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] px-0.5 mb-0.5">
                {section.title}
              </div>
            ) : null}
            <div className={iconOnly ? "flex flex-col gap-0.5" : "space-y-0.5"}>
              {section.actions.map((action) =>
                iconOnly ? (
                  <button
                    key={action.id}
                    type="button"
                    title={action.title ?? action.label}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={`w-7 h-7 mx-auto flex items-center justify-center ${actionBtnClass(action.tone)}`}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                ) : (
                  <button
                    key={action.id}
                    type="button"
                    title={action.title ?? action.label}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={`w-full text-left text-[11px] leading-tight px-1.5 py-1 ${actionBtnClass(action.tone)}`}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </SidebarPanelShell>
  );
}
