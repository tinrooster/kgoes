import { useCallback, useEffect, useRef, useState } from "react";
import { migrateSchematic } from "../migrations";
import {
  BUNDLED_DRAWING_TEMPLATES,
  setDrawingSetupSkip,
  type DrawingTemplateId,
  type InitialViewportMode,
} from "../drawingSetupDefaults";
import { useDrawingSetupStore } from "../drawingSetupStore";
import { CANVAS_SIZE_HELP, MAX_CUSTOM_PAPER_IN } from "../canvasLimits";
import { PAPER_SIZES } from "../printConfig";
import {
  deleteUserDrawingTemplate,
  listUserDrawingTemplates,
  saveUserDrawingTemplate,
  userTemplateId,
  type UserDrawingTemplate,
} from "../userDrawingTemplates";
import { confirmDialog, promptDialog } from "../appDialogStore";
import FloatingPanel from "./FloatingPanel";
import type { SchematicFile } from "../types";

const fieldClass =
  "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500";

const labelClass = "text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5";

export default function NewDrawingSetupDialog() {
  const request = useDrawingSetupStore((s) => s.request);
  const draft = useDrawingSetupStore((s) => s.draft);
  const setDraft = useDrawingSetupStore((s) => s.setDraft);
  const close = useDrawingSetupStore((s) => s.close);
  const confirm = useDrawingSetupStore((s) => s.confirm);
  const importInputRef = useRef<HTMLInputElement>(null);
  const saveTemplateInputRef = useRef<HTMLInputElement>(null);
  const [skipNext, setSkipNext] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<UserDrawingTemplate[]>([]);

  const refreshUserTemplates = useCallback(() => {
    setUserTemplates(listUserDrawingTemplates());
  }, []);

  useEffect(() => {
    if (request && draft) refreshUserTemplates();
  }, [request, draft, refreshUserTemplates]);

  const open = !!request && !!draft;
  const link = request?.trackItLink ?? null;
  const isNewSheet = request?.mode === "new-sheet";

  const onImportFile = useCallback(
    async (file: File, asUserTemplate = false) => {
      setImportError(null);
      try {
        const text = await file.text();
        const parsed = migrateSchematic(JSON.parse(text)) as SchematicFile;
        if (asUserTemplate) {
          const name = await promptDialog({
            title: "Save drawing template",
            message: "Name this template for future new drawings.",
            label: "Template name",
            defaultValue: file.name.replace(/\.json$/i, "") || "My template",
            confirmLabel: "Save",
            validate: (v) => (v.trim() ? null : "Enter a name"),
          });
          if (!name) return;
          const saved = saveUserDrawingTemplate(name, parsed);
          refreshUserTemplates();
          setDraft({
            templateId: userTemplateId(saved.id) as DrawingTemplateId,
            importFile: undefined,
          });
          return;
        }
        setDraft({ templateId: "import-file", importFile: parsed });
      } catch {
        setImportError("Could not read that file — use a valid KGO-ES JSON schematic.");
      }
    },
    [refreshUserTemplates, setDraft],
  );

  const onDeleteUserTemplate = useCallback(
    async (tpl: UserDrawingTemplate) => {
      const ok = await confirmDialog({
        title: "Delete template?",
        message: `Remove saved template “${tpl.label}”?`,
        tone: "danger",
        confirmLabel: "Delete",
      });
      if (!ok) return;
      deleteUserDrawingTemplate(userTemplateId(tpl.id));
      refreshUserTemplates();
      if (draft?.templateId === userTemplateId(tpl.id)) {
        setDraft({ templateId: "blank", importFile: undefined });
      }
    },
    [draft?.templateId, refreshUserTemplates, setDraft],
  );

  if (!open || !draft) return null;

  const title =
    request.mode === "trackit-blank"
      ? "Set up drawing"
      : isNewSheet
        ? "New drawing sheet"
        : "New project";

  const subtitle =
    link?.dwgNumber
      ? `DWG ${link.dwgNumber}${link.drawingName ? ` — ${link.drawingName}` : ""}`
      : "Choose a starting template and sheet origin.";

  const paperCategories = [...new Set(PAPER_SIZES.map((p) => p.category))];

  return (
    <FloatingPanel
      title={title}
      subtitle={subtitle}
      defaultWidth={520}
      minWidth={400}
      maxHeight="calc(100vh - 4rem)"
      onClose={close}
      footer={
        <div className="flex items-center justify-between gap-3 w-full px-5 py-3">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={skipNext}
              onChange={(e) => setSkipNext(e.target.checked)}
              className="accent-blue-600"
            />
            Skip next time — use these defaults
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={draft.templateId === "import-file" && !draft.importFile}
              onClick={() => {
                setDrawingSetupSkip(skipNext);
                confirm();
              }}
            >
              Create
            </button>
          </div>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-5 text-[var(--color-text)]">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{CANVAS_SIZE_HELP}</p>

        {link && (
          <section>
            <div className={labelClass}>trackIT drawing</div>
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-xs space-y-1">
              <div>
                <span className="text-[var(--color-text-muted)]">DWG </span>
                <span className="font-medium">{link.dwgNumber}</span>
              </div>
              {link.drawingName && (
                <div>
                  <span className="text-[var(--color-text-muted)]">Title </span>
                  {link.drawingName}
                </div>
              )}
              {link.drawingType && (
                <div>
                  <span className="text-[var(--color-text-muted)]">Type </span>
                  {link.drawingType.replace(/_/g, " ")}
                </div>
              )}
              {link.classification && (
                <div>
                  <span className="text-[var(--color-text-muted)]">Classification </span>
                  <span className="capitalize">{link.classification}</span>
                </div>
              )}
              {link.measurementSystem && (
                <div>
                  <span className="text-[var(--color-text-muted)]">Units </span>
                  {link.measurementSystem}
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className={labelClass}>Sheet name</div>
          <input
            className={fieldClass}
            value={draft.sheetName}
            onChange={(e) => setDraft({ sheetName: e.target.value })}
            placeholder="Drawing"
          />
        </section>

        <section>
          <div className={labelClass}>Starting template</div>
          <div className="space-y-1.5 pl-0.5">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs py-1">
              <input
                type="radio"
                name="template"
                checked={draft.templateId === "blank"}
                onChange={() => setDraft({ templateId: "blank", importFile: undefined })}
                className="mt-0.5 accent-blue-600 shrink-0"
              />
              <span>
                <span className="font-medium">Blank</span>
                <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5">Empty canvas</span>
              </span>
            </label>
            {BUNDLED_DRAWING_TEMPLATES.map((t) => (
              <label key={t.id} className="flex items-start gap-2.5 cursor-pointer text-xs py-1">
                <input
                  type="radio"
                  name="template"
                  checked={draft.templateId === t.id}
                  onChange={() => setDraft({ templateId: t.id, importFile: undefined })}
                  className="mt-0.5 accent-blue-600 shrink-0"
                />
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5">{t.description}</span>
                </span>
              </label>
            ))}

            {userTemplates.length > 0 && (
              <div className="pt-2 mt-1 border-t border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-text-muted)] mb-1.5">Your saved templates</div>
                {userTemplates.map((t) => {
                  const tid = userTemplateId(t.id) as DrawingTemplateId;
                  return (
                    <div key={t.id} className="flex items-start gap-1 py-0.5">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs py-1 flex-1 min-w-0">
                        <input
                          type="radio"
                          name="template"
                          checked={draft.templateId === tid}
                          onChange={() => setDraft({ templateId: tid, importFile: undefined })}
                          className="mt-0.5 accent-blue-600 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{t.label}</span>
                          {t.description && (
                            <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                              {t.description}
                            </span>
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        title={`Delete “${t.label}”`}
                        className="shrink-0 text-[var(--color-text-muted)] hover:text-red-600 text-sm px-1.5 py-1"
                        onClick={() => void onDeleteUserTemplate(t)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer text-xs py-1">
              <input
                type="radio"
                name="template"
                checked={draft.templateId === "import-file"}
                onChange={() => setDraft({ templateId: "import-file" })}
                className="mt-0.5 accent-blue-600 shrink-0"
              />
              <span className="flex-1 min-w-0">
                <span className="font-medium">Import from file (one-time)…</span>
                <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  Use a JSON schematic without saving it as a template
                </span>
                {draft.templateId === "import-file" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onImportFile(file, false);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="px-2.5 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                      onClick={() => importInputRef.current?.click()}
                    >
                      Choose JSON…
                    </button>
                    {draft.importFile && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        Loaded: {draft.importFile.name ?? "Imported"}
                      </span>
                    )}
                  </div>
                )}
                {importError && (
                  <p className="text-[10px] text-red-600 mt-1">{importError}</p>
                )}
              </span>
            </label>

            <div className="pt-2 flex flex-wrap gap-2">
              <input
                ref={saveTemplateInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportFile(file, true);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] rounded border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                onClick={() => saveTemplateInputRef.current?.click()}
              >
                + Save template from file…
              </button>
            </div>
          </div>
        </section>

        <section>
          <label className="flex items-center gap-2 cursor-pointer text-xs mb-2">
            <input
              type="checkbox"
              checked={draft.customizePrintPage}
              onChange={(e) => setDraft({ customizePrintPage: e.target.checked })}
              className="accent-blue-600"
            />
            <span className="font-medium">Set print page size and scale</span>
          </label>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-2 pl-6 leading-relaxed">
            Optional. Tiles the print grid — the editing canvas stays unlimited. Change anytime in Print View.
          </p>
          {draft.customizePrintPage && (
            <div className="space-y-3 pl-6 border-l-2 border-[var(--color-border)] ml-1">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs col-span-2 sm:col-span-1">
                  <span className="text-[var(--color-text-muted)]">Paper</span>
                  <select
                    className={`${fieldClass} mt-0.5`}
                    value={draft.printPaperId}
                    onChange={(e) => setDraft({ printPaperId: e.target.value })}
                  >
                    {paperCategories.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {PAPER_SIZES.filter((p) => p.category === cat).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">Custom size…</option>
                  </select>
                </label>
                <label className="text-xs col-span-2 sm:col-span-1">
                  <span className="text-[var(--color-text-muted)]">Orientation</span>
                  <select
                    className={`${fieldClass} mt-0.5`}
                    value={draft.printOrientation}
                    onChange={(e) =>
                      setDraft({ printOrientation: e.target.value as "landscape" | "portrait" })
                    }
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </label>
              </div>
              {draft.printPaperId === "custom" && (
                <div className="flex gap-3 items-end">
                  <label className="flex-1 text-xs">
                    <span className="text-[var(--color-text-muted)]">Width (in)</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CUSTOM_PAPER_IN}
                      step={0.01}
                      className={`${fieldClass} mt-0.5`}
                      value={draft.printCustomWidthIn}
                      onChange={(e) =>
                        setDraft({
                          printCustomWidthIn: Math.min(
                            MAX_CUSTOM_PAPER_IN,
                            Math.max(1, Number(e.target.value) || 24),
                          ),
                        })
                      }
                    />
                  </label>
                  <span className="text-[var(--color-text-muted)] pb-2">×</span>
                  <label className="flex-1 text-xs">
                    <span className="text-[var(--color-text-muted)]">Height (in)</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CUSTOM_PAPER_IN}
                      step={0.01}
                      className={`${fieldClass} mt-0.5`}
                      value={draft.printCustomHeightIn}
                      onChange={(e) =>
                        setDraft({
                          printCustomHeightIn: Math.min(
                            MAX_CUSTOM_PAPER_IN,
                            Math.max(1, Number(e.target.value) || 36),
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              )}
              <label className="block text-xs">
                <span className="text-[var(--color-text-muted)]">
                  Print scale ({draft.printScale.toFixed(2)}×)
                </span>
                <input
                  type="range"
                  min={0.25}
                  max={2}
                  step={0.05}
                  value={draft.printScale}
                  onChange={(e) => setDraft({ printScale: Number(e.target.value) })}
                  className="w-full mt-1 accent-blue-600"
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">0.25× — 2×</span>
              </label>
            </div>
          )}
        </section>

        <section>
          <div className={labelClass}>Print sheet origin (flow coordinates)</div>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-2 leading-relaxed">
            Anchors page 1 of the print grid. Adjust later in Print View.
          </p>
          <div className="flex gap-3">
            <label className="flex-1 text-xs">
              <span className="text-[var(--color-text-muted)]">X</span>
              <input
                type="number"
                className={`${fieldClass} mt-0.5`}
                value={draft.printOriginOffsetX}
                step={20}
                onChange={(e) => setDraft({ printOriginOffsetX: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="flex-1 text-xs">
              <span className="text-[var(--color-text-muted)]">Y</span>
              <input
                type="number"
                className={`${fieldClass} mt-0.5`}
                value={draft.printOriginOffsetY}
                step={20}
                onChange={(e) => setDraft({ printOriginOffsetY: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </section>

        <section>
          <div className={labelClass}>Initial view</div>
          <select
            className={fieldClass}
            value={draft.initialViewport}
            onChange={(e) => setDraft({ initialViewport: e.target.value as InitialViewportMode })}
          >
            <option value="overview">Fit all content (overview)</option>
            <option value="origin">Center on origin (0, 0)</option>
          </select>
        </section>
      </div>
    </FloatingPanel>
  );
}
