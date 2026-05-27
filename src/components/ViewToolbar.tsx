import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";

/**
 * Quick-access view toggles (replaces always-visible ViewOptionsPanel for common actions).
 */
export default function ViewToolbar() {
  const showCableIdLabels = useSchematicStore((s) => s.showCableIdLabels);
  const setShowCableIdLabels = useSchematicStore((s) => s.setShowCableIdLabels);
  const showCustomLabels = useSchematicStore((s) => s.showCustomLabels);
  const setShowCustomLabels = useSchematicStore((s) => s.setShowCustomLabels);
  const hideUnconnectedPorts = useSchematicStore((s) => s.hideUnconnectedPorts);
  const setHideUnconnectedPorts = useSchematicStore((s) => s.setHideUnconnectedPorts);
  const hideAdapters = useSchematicStore((s) => s.hideAdapters);
  const setHideAdapters = useSchematicStore((s) => s.setHideAdapters);
  const showLineJumps = useSchematicStore((s) => s.showLineJumps);
  const setShowLineJumps = useSchematicStore((s) => s.setShowLineJumps);
  const hiddenSignalTypesStr = useSchematicStore((s) => s.hiddenSignalTypes);
  const showAllSignalTypes = useSchematicStore((s) => s.showAllSignalTypes);
  const showInstallationInfo = useSchematicStore((s) => s.showInstallationInfo);
  const setShowInstallationInfo = useSchematicStore((s) => s.setShowInstallationInfo);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);

  const anyHidden = !!(hiddenSignalTypesStr && hiddenSignalTypesStr.length > 0);

  const btn =
    "px-2 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer whitespace-nowrap";
  const btnOn =
    "px-2 py-1 text-[11px] rounded border border-blue-500/50 bg-blue-500/10 text-[var(--color-text)] cursor-pointer whitespace-nowrap";

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
      data-print-hide
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mr-1">View</span>
      <button
        type="button"
        className={showCableIdLabels ? btnOn : btn}
        title="Show cable ID labels on connections"
        onClick={() => setShowCableIdLabels(!showCableIdLabels)}
      >
        Cable IDs
      </button>
      <button
        type="button"
        className={showCustomLabels ? btnOn : btn}
        title="Show custom connection labels"
        onClick={() => setShowCustomLabels(!showCustomLabels)}
      >
        Cable labels
      </button>
      <button
        type="button"
        className={hideUnconnectedPorts ? btnOn : btn}
        onClick={() => setHideUnconnectedPorts(!hideUnconnectedPorts)}
      >
        Hide unconnected
      </button>
      <button
        type="button"
        className={hideAdapters ? btnOn : btn}
        onClick={() => setHideAdapters(!hideAdapters)}
      >
        Hide adapters
      </button>
      <button
        type="button"
        className={showLineJumps ? btnOn : btn}
        onClick={() => setShowLineJumps(!showLineJumps)}
      >
        Line jumps
      </button>
      <button
        type="button"
        className={showInstallationInfo ? btnOn : btn}
        onClick={() => setShowInstallationInfo(!showInstallationInfo)}
      >
        Install info
      </button>
      <button
        type="button"
        className={anyHidden ? btn : btnOn}
        title={anyHidden ? "Show all signal types" : "Hide all signal types"}
        onClick={() => showAllSignalTypes()}
      >
        {anyHidden ? "Show all signals" : "Hide all signals"}
      </button>
      <button
        type="button"
        className={btn}
        title="Full view options panel"
        onClick={() => expandRightPanel("viewOptions")}
      >
        More…
      </button>
    </div>
  );
}
