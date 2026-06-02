import { useSidebarStore } from "../sidebarStore";

const PANEL_LABELS: { key: keyof ReturnType<typeof useSidebarStore.getState>["panelsVisible"]; label: string }[] = [
  { key: "devices", label: "Devices (left)" },
  { key: "trackItNumbers", label: "trackIT numbers" },
  { key: "viewOptions", label: "View options" },
  { key: "showInfo", label: "Show info" },
  { key: "colors", label: "Colors" },
  { key: "cadTools", label: "CAD tools" },
];

export default function WorkspaceSettingsSection() {
  const panelsVisible = useSidebarStore((s) => s.panelsVisible);
  const setPanelVisible = useSidebarStore((s) => s.setPanelVisible);
  const toolPaletteIconOnly = useSidebarStore((s) => s.toolPaletteIconOnly);
  const setToolPaletteIconOnly = useSidebarStore((s) => s.setToolPaletteIconOnly);

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
        <label className="flex items-center justify-between py-1 mt-2 cursor-pointer">
          <span className="text-xs text-[var(--color-text)]">Icon-only tool palettes</span>
          <input
            type="checkbox"
            checked={toolPaletteIconOnly}
            onChange={(e) => setToolPaletteIconOnly(e.target.checked)}
            className="accent-blue-600 cursor-pointer"
          />
        </label>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Compact icon buttons for CAD tools and similar sidebars. Toggle also in each palette header.
        </p>
      </div>
    </>
  );
}
