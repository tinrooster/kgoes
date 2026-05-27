import { MOUNTING_LABELS, type RackMetadataPatch } from "../rackMount";
import type { MountingClass } from "../rackMount";

export interface ApplyRackMetadataPrompt {
  modelName: string;
  otherCount: number;
  rackPatch: RackMetadataPatch;
  mountingClass: MountingClass;
  hasDefinitionKey: boolean;
}

interface Props {
  prompt: ApplyRackMetadataPrompt;
  onApplyAll: () => void;
  onThisDeviceOnly: () => void;
  onCancel: () => void;
}

export default function ApplyRackMetadataDialog({ prompt, onApplyAll, onThisDeviceOnly, onCancel }: Props) {
  const uLabel = prompt.rackPatch.rackHeightU != null ? `${prompt.rackPatch.rackHeightU}U` : "rack U";
  const mountLabel = MOUNTING_LABELS[prompt.mountingClass].toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl w-[min(460px,92vw)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="apply-rack-metadata-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <span id="apply-rack-metadata-title" className="text-sm font-semibold text-[var(--color-text-heading)]">
            Apply rack settings
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
            Apply <strong>{uLabel}</strong> · <strong>{mountLabel}</strong> to all{" "}
            <strong>{prompt.otherCount}</strong> other &ldquo;{prompt.modelName}&rdquo; instance
            {prompt.otherCount === 1 ? "" : "s"} in this drawing?
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {prompt.hasDefinitionKey
              ? "Also saves as the device definition default (rack U, mounting class) for new placements in this project."
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
