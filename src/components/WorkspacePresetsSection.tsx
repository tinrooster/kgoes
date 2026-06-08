import { useCallback, useState } from "react";
import { promptDialog, confirmDialog } from "../appDialogStore";
import { useSidebarStore } from "../sidebarStore";
import { useSchematicStore } from "../store";

export default function WorkspacePresetsSection({ compact = false }: { compact?: boolean }) {
  const saveNamedWorkspace = useSidebarStore((s) => s.saveNamedWorkspace);
  const loadNamedWorkspace = useSidebarStore((s) => s.loadNamedWorkspace);
  const deleteNamedWorkspace = useSidebarStore((s) => s.deleteNamedWorkspace);
  const listNamedWorkspaces = useSidebarStore((s) => s.listNamedWorkspaces);
  const addToast = useSchematicStore((s) => s.addToast);
  const [presets, setPresets] = useState(() => listNamedWorkspaces());

  const refresh = useCallback(() => {
    setPresets(listNamedWorkspaces());
  }, [listNamedWorkspaces]);

  const onSave = async () => {
    const name = await promptDialog({
      title: "Save workspace layout",
      message: "Name this panel layout (positions, visibility, and dock order).",
      label: "Layout name",
      placeholder: "e.g. Numbering focus",
      confirmLabel: "Save",
      validate: (value) => (value.trim() ? null : "Enter a name"),
    });
    if (!name) return;
    try {
      saveNamedWorkspace(name.trim());
      refresh();
      addToast(`Saved workspace “${name.trim()}”`, "success", 2600);
    } catch {
      addToast("Could not save workspace layout", "error", 3000);
    }
  };

  const onLoad = async (name: string) => {
    const ok = loadNamedWorkspace(name);
    if (!ok) {
      addToast(`Workspace “${name}” not found`, "error", 2800);
      refresh();
      return;
    }
    addToast(`Loaded workspace “${name}”`, "success", 2600);
  };

  const onDelete = async (name: string) => {
    const ok = await confirmDialog({
      title: "Delete workspace layout?",
      message: `Remove saved layout “${name}”.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    deleteNamedWorkspace(name);
    refresh();
    addToast(`Deleted workspace “${name}”`, "info", 2400);
  };

  return (
    <div className={compact ? "" : "space-y-2"}>
      {!compact && (
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Workspace layouts
        </div>
      )}
      <p className={`text-[10px] text-[var(--color-text-muted)] ${compact ? "px-2 pb-1 leading-snug" : "mb-2"}`}>
        Layout auto-saves in this browser. Named presets store panel positions, visibility, and dock order.
      </p>
      <button
        type="button"
        onClick={() => void onSave()}
        className={`flex items-center w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-left ${
          compact ? "text-[var(--color-text)]" : "text-[var(--color-text)] border border-[var(--color-border)]"
        }`}
      >
        Save workspace layout…
      </button>
      {presets.length > 0 && (
        <div className={compact ? "pt-1" : "pt-2 space-y-1"}>
          {!compact && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Saved layouts
            </div>
          )}
          {compact && (
            <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Load layout
            </div>
          )}
          {presets.map((preset) => (
            <div key={preset.name} className="flex items-center gap-1 rounded">
              <button
                type="button"
                onClick={() => void onLoad(preset.name)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-left text-[var(--color-text)] truncate"
                title={`Load ${preset.name}`}
              >
                {preset.name}
              </button>
              <button
                type="button"
                onClick={() => void onDelete(preset.name)}
                className="shrink-0 px-2 py-1.5 text-xs rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-pointer"
                title={`Delete ${preset.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
