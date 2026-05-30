import { useEffect, useState } from "react";
import { useSchematicStore } from "../store";
import type { FlyDirection, FlyEndpointData, SignalType } from "../types";
import { SIGNAL_LABELS } from "../types";
import { validateFlyEndpoint } from "../flyFormat";

export default function FlyEndpointEditor() {
  const editingId = useSchematicStore((s) => s.editingFlyEndpointId);
  const setEditingId = useSchematicStore((s) => s.setEditingFlyEndpointId);
  const patchFlyEndpointData = useSchematicStore((s) => s.patchFlyEndpointData);
  const node = useSchematicStore((s) =>
    editingId ? s.nodes.find((n) => n.id === editingId && n.type === "fly-endpoint") : undefined,
  );

  const [draft, setDraft] = useState<FlyEndpointData | null>(null);

  useEffect(() => {
    if (node && node.type === "fly-endpoint") {
      setDraft({ ...(node.data as FlyEndpointData) });
    } else {
      setDraft(null);
    }
  }, [node]);

  if (!editingId || !draft) return null;

  const issues = validateFlyEndpoint(draft);

  const patch = (updates: Partial<FlyEndpointData>) =>
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));

  const close = () => setEditingId(null);

  const save = () => {
    patchFlyEndpointData(editingId, draft);
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">
            Fly {draft.direction === "in" ? "in" : "off"} endpoint
          </h2>
        </div>
        <div className="p-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Direction</span>
            <select
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.direction}
              onChange={(e) => patch({ direction: e.target.value as FlyDirection })}
            >
              <option value="in">Fly-in (from remote drawing)</option>
              <option value="out">Fly-off (to remote drawing)</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Signal type</span>
            <select
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.signalType}
              onChange={(e) => patch({ signalType: e.target.value as SignalType })}
            >
              {Object.entries(SIGNAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Local designation (housename)</span>
            <input
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.designation}
              onChange={(e) => patch({ designation: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Notation (IN/OUT + port)</span>
            <input
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.notation}
              onChange={(e) => patch({ notation: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Remote DWG #</span>
            <input
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-mono"
              value={draft.remoteDwgNumber}
              onChange={(e) => patch({ remoteDwgNumber: e.target.value, remoteDrawingId: undefined })}
              placeholder="e.g. 3523-A VID"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Remote designation (optional)</span>
            <input
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.remoteDesignation ?? ""}
              onChange={(e) => patch({ remoteDesignation: e.target.value || undefined })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Remote notation (optional)</span>
            <input
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs"
              value={draft.remoteNotation ?? ""}
              onChange={(e) => patch({ remoteNotation: e.target.value || undefined })}
            />
          </label>
          {issues.length > 0 && (
            <ul className="text-[10px] text-amber-700 list-disc pl-4">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
