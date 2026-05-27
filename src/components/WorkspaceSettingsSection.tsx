import { useSidebarStore } from "../sidebarStore";
import {
  DEFAULT_QUICK_TOOLBAR_ENABLED,
  DEFAULT_QUICK_TOOLBAR_ORDER,
  QUICK_TOOLBAR_ACTIONS,
  useQuickToolbarStore,
  type QuickToolbarActionId,
} from "../quickToolbarPrefs";

const PANEL_LABELS: { key: keyof ReturnType<typeof useSidebarStore.getState>["panelsVisible"]; label: string }[] = [
  { key: "devices", label: "Devices (left)" },
  { key: "viewOptions", label: "View options" },
  { key: "trackItNumbers", label: "trackIT numbers" },
  { key: "showInfo", label: "Show info" },
  { key: "colors", label: "Colors" },
];

export default function WorkspaceSettingsSection() {
  const panelsVisible = useSidebarStore((s) => s.panelsVisible);
  const setPanelVisible = useSidebarStore((s) => s.setPanelVisible);
  const quickToolbarVisible = useSidebarStore((s) => s.quickToolbarVisible);
  const setQuickToolbarVisible = useSidebarStore((s) => s.setQuickToolbarVisible);
  const enabled = useQuickToolbarStore((s) => s.enabled);
  const order = useQuickToolbarStore((s) => s.order);
  const setEnabled = useQuickToolbarStore((s) => s.setEnabled);
  const setOrder = useQuickToolbarStore((s) => s.setOrder);

  const toggleQuickAction = (id: QuickToolbarActionId) => {
    const next = enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
    setEnabled(next);
  };

  const moveQuickAction = (id: QuickToolbarActionId, direction: -1 | 1) => {
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    const next = [...order];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setOrder(next);
  };

  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Sidebars
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
          Choose which dock panels appear on the schematic workspace. Collapsed rails are hidden when a panel is off.
        </p>
        <div className="space-y-1">
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-xs text-[var(--color-text)]">Quick settings toolbar (top)</span>
            <input
              type="checkbox"
              checked={quickToolbarVisible}
              onChange={(e) => setQuickToolbarVisible(e.target.checked)}
              className="accent-blue-600 cursor-pointer"
            />
          </label>
          {PANEL_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-xs text-[var(--color-text)]">{label}</span>
              <input
                type="checkbox"
                checked={panelsVisible[key]}
                onChange={(e) => setPanelVisible(key, e.target.checked)}
                className="accent-blue-600 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Quick settings toolbar
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
          Buttons shown above the canvas. Cable IDs and custom labels are separate toggles.
        </p>
        <div className="space-y-1">
          {order.map((id) => {
            const meta = QUICK_TOOLBAR_ACTIONS.find((a) => a.id === id);
            if (!meta) return null;
            return (
              <div key={id} className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  checked={enabled.includes(id)}
                  onChange={() => toggleQuickAction(id)}
                  className="accent-blue-600 cursor-pointer"
                />
                <span className="flex-1 text-xs text-[var(--color-text)]">{meta.label}</span>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                  onClick={() => moveQuickAction(id, -1)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                  onClick={() => moveQuickAction(id, 1)}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-2 text-[10px] text-blue-600 hover:underline cursor-pointer"
          onClick={() => {
            setEnabled([...DEFAULT_QUICK_TOOLBAR_ENABLED]);
            setOrder([...DEFAULT_QUICK_TOOLBAR_ORDER]);
          }}
        >
          Reset quick toolbar defaults
        </button>
      </div>
    </>
  );
}
