interface Props {
  modelName: string;
  otherCount: number;
  hasDefinitionKey: boolean;
  onApplyAll: () => void;
  onThisDeviceOnly: () => void;
  onCancel: () => void;
}

export default function ApplyFacePlateLayoutDialog({
  modelName,
  otherCount,
  hasDefinitionKey,
  onApplyAll,
  onThisDeviceOnly,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl w-[min(460px,92vw)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="apply-faceplate-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <span id="apply-faceplate-title" className="text-sm font-semibold text-[var(--color-text-heading)]">
            Apply face-plate layout
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-2">
          <p className="text-sm text-[var(--color-text)]">
            Apply this front/rear port layout to all{" "}
            <strong>{otherCount}</strong> other &ldquo;{modelName}&rdquo; instance
            {otherCount === 1 ? "" : "s"} in this drawing?
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {hasDefinitionKey
              ? "Also updates the device definition default so new placements in this project inherit the same layout."
              : "Custom templates are updated when this device is linked to one."}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            className="px-4 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
            onClick={onThisDeviceOnly}
          >
            This device only
          </button>
          <button
            type="button"
            className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-medium"
            onClick={onApplyAll}
            autoFocus
          >
            All instances + definition default
          </button>
        </div>
      </div>
    </div>
  );
}
