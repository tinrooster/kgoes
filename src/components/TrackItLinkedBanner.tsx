import { useSchematicStore } from "../store";
import { isTrackItLinked, saveToTrackItParent } from "../trackitIntegration";

export default function TrackItLinkedBanner() {
  const link = useSchematicStore((s) => s.trackItLink);
  const lastPushed = useSchematicStore((s) => s.trackItLastPushedAt);

  if (!isTrackItLinked()) return null;

  const label = link?.dwgNumber ? `DWG ${link.dwgNumber}` : "trackIT drawing";
  const pushedLabel = lastPushed
    ? `Last saved to trackIT ${new Date(lastPushed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not saved to trackIT yet — press Ctrl+S";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-[var(--color-text)]">
      <div className="min-w-0">
        <span className="font-semibold text-blue-700 dark:text-blue-300">trackIT linked</span>
        <span className="mx-1.5 text-[var(--color-text-muted)]">·</span>
        <span className="font-mono">{label}</span>
        <span className="mx-1.5 text-[var(--color-text-muted)]">·</span>
        <span className="text-[var(--color-text-muted)]">{pushedLabel}</span>
      </div>
      <button
        type="button"
        onClick={() => saveToTrackItParent()}
        className="shrink-0 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500 cursor-pointer"
      >
        Save to trackIT
      </button>
    </div>
  );
}
