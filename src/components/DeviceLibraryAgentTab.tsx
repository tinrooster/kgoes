import { useState } from "react";
import { useSchematicStore } from "../store";
import {
  buildKgoDeviceLibraryPrompt,
  KGO_DEVICE_VENDOR_CODES,
} from "../kgoDeviceLibraryPrompt";
import {
  extractKgoTemplateBlocks,
  importKgoTemplateSource,
  injectKgoDeviceAddTag,
} from "../kgoTemplateImport";
import {
  canCommitDeviceLibraryToTrackIt,
  commitDeviceLibraryViaTrackIt,
} from "../trackitDeviceLibraryBridge";

export default function DeviceLibraryAgentTab() {
  const importCustomTemplates = useSchematicStore((s) => s.importCustomTemplates);
  const addToast = useSchematicStore((s) => s.addToast);

  const [spec, setSpec] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const [raw, setRaw] = useState("");
  const [processed, setProcessed] = useState("");
  const [importing, setImporting] = useState(false);
  const [committing, setCommitting] = useState(false);

  const trackItCommitAvailable = canCommitDeviceLibraryToTrackIt();

  const handleGenerate = () => {
    setPrompt(buildKgoDeviceLibraryPrompt({ spec, manufacturer, model, vendorCode }));
    setCopied(false);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast("Could not copy prompt", "error");
    }
  };

  const handleProcess = () => {
    const injected = injectKgoDeviceAddTag(raw);
    setProcessed(injected);
  };

  const handleImportToLibrary = () => {
    const source = processed || injectKgoDeviceAddTag(raw);
    if (!source.trim()) return;
    setImporting(true);
    try {
      const templates = importKgoTemplateSource(source);
      importCustomTemplates(templates);
      addToast(`Added ${templates.length} template${templates.length === 1 ? "" : "s"} to library`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleCommitToRepo = async () => {
    const source = processed || injectKgoDeviceAddTag(raw);
    if (!source.trim()) return;
    setCommitting(true);
    try {
      const result = await commitDeviceLibraryViaTrackIt(source);
      addToast(
        `Committed ${result.addedIds?.length ?? 0} template(s) to ${result.file ?? "kgoes/"}`,
        "success",
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Commit failed", "error");
    } finally {
      setCommitting(false);
    }
  };

  const blockCount = processed
    ? extractKgoTemplateBlocks(processed).length
    : raw.trim()
      ? extractKgoTemplateBlocks(injectKgoDeviceAddTag(raw)).length
      : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          1 · Spec → agent prompt
        </h3>
        <textarea
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          rows={5}
          placeholder="Paste manufacturer spec sheet text here…"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-blue-500 font-mono"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Manufacturer"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-blue-500"
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-blue-500"
          />
          <select
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-blue-500"
          >
            <option value="">Vendor code</option>
            {KGO_DEVICE_VENDOR_CODES.map((v) => (
              <option key={v.code} value={v.code}>
                {v.label} ({v.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!spec.trim()}
            onClick={handleGenerate}
            className="rounded border border-blue-500/50 bg-blue-500/15 text-blue-600 dark:text-blue-300 px-3 py-1.5 hover:bg-blue-500/25 disabled:opacity-40 cursor-pointer"
          >
            Build prompt
          </button>
          {prompt && (
            <button
              type="button"
              onClick={() => void handleCopyPrompt()}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-surface-hover)] cursor-pointer text-[var(--color-text)]"
            >
              {copied ? "Copied" : "Copy prompt"}
            </button>
          )}
        </div>
        {prompt && (
          <pre className="max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2 font-mono text-[10px] text-[var(--color-text-muted)] whitespace-pre-wrap">
            {prompt}
          </pre>
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--color-border)] pt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          2 · Paste TypeScript → add to library
        </h3>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder="Paste Claude TypeScript output (kgo-* templates) here…"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-blue-500 font-mono"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!raw.trim()}
            onClick={handleProcess}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-surface-hover)] disabled:opacity-40 cursor-pointer text-[var(--color-text)]"
          >
            Preview & tag
          </button>
          <button
            type="button"
            disabled={!raw.trim() || importing}
            onClick={handleImportToLibrary}
            className="rounded border border-blue-500/50 bg-blue-500/15 text-blue-600 dark:text-blue-300 px-3 py-1.5 hover:bg-blue-500/25 disabled:opacity-40 cursor-pointer"
          >
            {importing ? "Importing…" : "Add to library"}
          </button>
          {trackItCommitAvailable && (
            <button
              type="button"
              disabled={!raw.trim() || committing}
              onClick={() => void handleCommitToRepo()}
              className="rounded border border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 hover:bg-emerald-500/25 disabled:opacity-40 cursor-pointer"
            >
              {committing ? "Committing…" : "Commit to repo (trackIT dev)"}
            </button>
          )}
          {blockCount > 0 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {blockCount} template{blockCount === 1 ? "" : "s"} detected
            </span>
          )}
        </div>
        {!trackItCommitAvailable && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Open KGO-ES from trackIT dev to commit templates into kgoes/src/devices/. Library import works in any session.
          </p>
        )}
      </section>
    </div>
  );
}
