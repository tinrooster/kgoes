import { useCallback, useEffect, useMemo, useState } from "react";
import { getBundledTemplates, fetchTemplates } from "../templateApi";
import { useSchematicStore } from "../store";
import { confirmDialog } from "../appDialogStore";
import type { DeviceTemplate } from "../types";
import {
  cloneForUserLibrary,
  cloneTemplateDeep,
  LIBRARY_EDIT_PLACEMENT,
  submitTemplateToCommunity,
  templateHasTag,
  templateKey,
  withSearchTerm,
} from "../deviceTemplateActions";
import { mergeDeviceLibraryTemplates } from "../deviceLibraryMerge";
import {
  listLibraryBackups,
  pushLibraryBackup,
  restoreLibraryBackup,
  type LibraryBackupEntry,
} from "../libraryTemplateBackup";
import { useUiChromeStore } from "../uiChromeStore";
import LoginDialog from "./LoginDialog";
import DeviceLibraryAgentTab from "./DeviceLibraryAgentTab";

type SortKey = "label" | "manufacturer" | "deviceType" | "source";
type SourceFilter = "all" | "bundled" | "custom";

function sourceLabel(template: DeviceTemplate, customIds: Set<string>): string {
  const key = templateKey(template);
  if (customIds.has(key)) return "User";
  if (template.id?.startsWith("kgo-")) return "KGO";
  return "Catalog";
}

export default function DeviceLibraryAdminPanel() {
  const open = useUiChromeStore((s) => s.deviceAdminOpen);
  const tab = useUiChromeStore((s) => s.deviceAdminTab);
  const focusTemplateId = useUiChromeStore((s) => s.deviceAdminFocusId);
  const closeDeviceAdmin = useUiChromeStore((s) => s.closeDeviceAdmin);
  const setDeviceAdminTab = useUiChromeStore((s) => s.setDeviceAdminTab);

  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const hiddenLibraryTemplateIds = useSchematicStore((s) => s.hiddenLibraryTemplateIds);
  const upsertLibraryTemplate = useSchematicStore((s) => s.upsertLibraryTemplate);
  const removeLibraryTemplateWithBackup = useSchematicStore((s) => s.removeLibraryTemplateWithBackup);
  const restoreHiddenLibraryTemplate = useSchematicStore((s) => s.restoreHiddenLibraryTemplate);
  const replaceCustomTemplates = useSchematicStore((s) => s.replaceCustomTemplates);
  const exportCustomTemplates = useSchematicStore((s) => s.exportCustomTemplates);
  const createAndEditDevice = useSchematicStore((s) => s.createAndEditDevice);
  const addToast = useSchematicStore((s) => s.addToast);

  const [bundledTemplates, setBundledTemplates] = useState<DeviceTemplate[]>(getBundledTemplates);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("kgo-es-deviceadd");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("label");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState("kgo-es-deviceadd");
  const [showLogin, setShowLogin] = useState(false);
  const [editingTagsKey, setEditingTagsKey] = useState<string | null>(null);
  const [editingTagsValue, setEditingTagsValue] = useState("");
  const [backups, setBackups] = useState<LibraryBackupEntry[]>([]);

  useEffect(() => {
    if (open) fetchTemplates().then(setBundledTemplates).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) setBackups(listLibraryBackups());
  }, [open, customTemplates]);

  const hiddenIds = useMemo(
    () => new Set(hiddenLibraryTemplateIds),
    [hiddenLibraryTemplateIds],
  );

  const customIds = useMemo(
    () => new Set(customTemplates.map((t) => templateKey(t))),
    [customTemplates],
  );

  const allTemplates = useMemo(() => {
    const merged = mergeDeviceLibraryTemplates(
      bundledTemplates.filter((t) => t.category !== "Expansion Cards"),
      customTemplates,
      hiddenIds,
    );
    return merged;
  }, [bundledTemplates, customTemplates, hiddenIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allTemplates.filter((t) => {
      const key = templateKey(t);
      const isCustom = customIds.has(key);
      if (sourceFilter === "bundled" && isCustom && !t.id?.startsWith("kgo-")) return false;
      if (sourceFilter === "custom" && !isCustom) return false;
      if (tagFilter.trim() && !templateHasTag(t, tagFilter.trim())) return false;
      if (!q) return true;
      const hay = [t.label, t.manufacturer, t.modelNumber, t.deviceType, ...(t.searchTerms ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortKey) {
        case "manufacturer":
          av = a.manufacturer ?? "";
          bv = b.manufacturer ?? "";
          break;
        case "deviceType":
          av = a.deviceType ?? "";
          bv = b.deviceType ?? "";
          break;
        case "source":
          av = sourceLabel(a, customIds);
          bv = sourceLabel(b, customIds);
          break;
        default:
          av = a.label ?? "";
          bv = b.label ?? "";
      }
      const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [allTemplates, customIds, search, tagFilter, sourceFilter, sortKey, sortAsc]);

  const focusRow = useMemo(() => {
    if (!focusTemplateId) return null;
    return filtered.find((t) => t.id === focusTemplateId || templateKey(t) === focusTemplateId) ?? null;
  }, [filtered, focusTemplateId]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((t) => templateKey(t)));
    });
  }, [filtered]);

  const selectedTemplates = useMemo(
    () => filtered.filter((t) => selected.has(templateKey(t))),
    [filtered, selected],
  );

  const persistTags = useCallback(
    (template: DeviceTemplate, tagsRaw: string) => {
      const terms = tagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      upsertLibraryTemplate({
        ...template,
        searchTerms: terms.length > 0 ? terms : undefined,
      });
      addToast(`Updated tags for ${template.label}`, "success");
    },
    [upsertLibraryTemplate, addToast],
  );

  const bulkAddTag = useCallback(() => {
    const tag = bulkTag.trim();
    if (!tag) return;
    for (const t of selectedTemplates) {
      upsertLibraryTemplate(withSearchTerm(t, tag, true));
    }
    addToast(`Tagged ${selectedTemplates.length} template(s)`, "success");
  }, [bulkTag, selectedTemplates, upsertLibraryTemplate, addToast]);

  const bulkSubmit = useCallback(async () => {
    for (const t of selectedTemplates) {
      try {
        const result = await submitTemplateToCommunity(t);
        if (result === "login_required") {
          setShowLogin(true);
          return;
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Submission failed", "error");
        return;
      }
    }
    addToast("Opened community submissions", "success");
  }, [selectedTemplates, addToast]);

  const handleDelete = useCallback(
    (template: DeviceTemplate) => {
      void (async () => {
        const key = templateKey(template);
        const ok = await confirmDialog({
          title: "Remove from library",
          message: `Remove “${template.label}” from your library? A backup is saved automatically.`,
          tone: "danger",
          confirmLabel: "Remove",
        });
        if (!ok) return;
        removeLibraryTemplateWithBackup(key, `Deleted: ${template.label}`);
        addToast(`Removed ${template.label} (backup saved)`, "success");
        setBackups(listLibraryBackups());
      })();
    },
    [removeLibraryTemplateWithBackup, addToast],
  );

  const close = () => {
    setSelected(new Set());
    setEditingTagsKey(null);
    closeDeviceAdmin();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        onClick={close}
      >
        <div
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-[var(--color-text)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">Device library</h2>
            <button
              type="button"
              onClick={close}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none cursor-pointer px-1"
            >
              &times;
            </button>
          </div>

          <div className="flex border-b border-[var(--color-border)] px-2">
            {(["manage", "agent"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDeviceAdminTab(t)}
                className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px cursor-pointer transition-colors ${
                  tab === t
                    ? "border-blue-500 text-blue-600 dark:text-blue-300"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {t === "manage" ? "Manage" : "Add devices (agent)"}
              </button>
            ))}
          </div>

          {tab === "agent" ? (
            <DeviceLibraryAgentTab />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search label, manufacturer, model..."
                    className="flex-1 min-w-[160px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="Tag filter"
                    className="w-40 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                  />
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                  >
                    <option value="all">All sources</option>
                    <option value="bundled">Catalog / KGO</option>
                    <option value="custom">User overrides</option>
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                  >
                    <option value="label">Sort: label</option>
                    <option value="manufacturer">Sort: manufacturer</option>
                    <option value="deviceType">Sort: type</option>
                    <option value="source">Sort: source</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortAsc((v) => !v)}
                    className="rounded border border-[var(--color-border)] px-2 py-1.5 text-xs hover:bg-[var(--color-surface-hover)] cursor-pointer"
                  >
                    {sortAsc ? "↑" : "↓"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="text-[var(--color-text-muted)]">
                    {filtered.length} template{filtered.length === 1 ? "" : "s"}
                    {selected.size > 0 ? ` · ${selected.size} selected` : ""}
                  </span>
                  {focusRow && (
                    <span className="rounded bg-blue-500/20 text-blue-700 dark:text-blue-200 px-1.5 py-0.5">
                      Focus: {focusRow.label}
                    </span>
                  )}
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        pushLibraryBackup(exportCustomTemplates(), "Manual backup");
                        setBackups(listLibraryBackups());
                        addToast("Library backup saved", "success");
                      }}
                      className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-hover)] cursor-pointer text-[var(--color-text)]"
                    >
                      Backup now
                    </button>
                    <input
                      type="text"
                      value={bulkTag}
                      onChange={(e) => setBulkTag(e.target.value)}
                      placeholder="Bulk tag"
                      className="w-28 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-1 text-[10px] text-[var(--color-text)]"
                    />
                    <button
                      type="button"
                      disabled={selected.size === 0}
                      onClick={bulkAddTag}
                      className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-hover)] disabled:opacity-40 cursor-pointer"
                    >
                      Add tag
                    </button>
                    <button
                      type="button"
                      disabled={selected.size === 0}
                      onClick={() => void bulkSubmit()}
                      className="rounded border border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200 px-2 py-1 hover:bg-blue-500/25 disabled:opacity-40 cursor-pointer"
                    >
                      Submit selected
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-[1]">
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onChange={toggleSelectAll}
                          className="w-3 h-3 accent-blue-500"
                        />
                      </th>
                      <th className="px-2 py-2">Label</th>
                      <th className="px-2 py-2">Manufacturer</th>
                      <th className="px-2 py-2">Tags</th>
                      <th className="px-2 py-2">Source</th>
                      <th className="px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((template) => {
                      const key = templateKey(template);
                      const isFocused =
                        !!focusTemplateId &&
                        (template.id === focusTemplateId || key === focusTemplateId);
                      const tags = (template.searchTerms ?? []).join(", ");
                      const isEditingTags = editingTagsKey === key;
                      const isHidden = hiddenIds.has(key);

                      return (
                        <tr
                          key={key}
                          className={`border-b border-[var(--color-border)]/60 transition-colors ${
                            isFocused
                              ? "bg-blue-500/20 text-[var(--color-text-heading)]"
                              : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                          }`}
                        >
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={() => toggleSelect(key)}
                              className="w-3 h-3 accent-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className={`font-medium ${isFocused ? "text-[var(--color-text-heading)]" : ""}`}>
                              {template.label}
                              {isHidden && (
                                <span className="ml-1 text-[9px] text-amber-600 dark:text-amber-300">(hidden)</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[180px]">
                              {template.id ?? template.deviceType}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top text-[var(--color-text-muted)]">
                            {template.manufacturer ?? "—"}
                          </td>
                          <td className="px-2 py-2 align-top min-w-[140px]">
                            {isEditingTags ? (
                              <input
                                autoFocus
                                value={editingTagsValue}
                                onChange={(e) => setEditingTagsValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    persistTags(template, editingTagsValue);
                                    setEditingTagsKey(null);
                                  }
                                  if (e.key === "Escape") setEditingTagsKey(null);
                                }}
                                onBlur={() => {
                                  persistTags(template, editingTagsValue);
                                  setEditingTagsKey(null);
                                }}
                                className="w-full rounded border border-blue-500/50 bg-[var(--color-bg)] px-1 py-0.5 text-[10px] text-[var(--color-text)] outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                className="text-left text-[10px] text-[var(--color-text-muted)] hover:text-blue-500 cursor-pointer"
                                onClick={() => {
                                  setEditingTagsKey(key);
                                  setEditingTagsValue(tags);
                                }}
                              >
                                {tags || "—"}
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <span className="rounded bg-[var(--color-bg)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
                              {sourceLabel(template, customIds)}
                            </span>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex justify-end flex-wrap gap-1">
                              <ActionBtn
                                label="Edit"
                                onClick={() => {
                                  createAndEditDevice(cloneTemplateDeep(template), LIBRARY_EDIT_PLACEMENT);
                                  addToast(`Editing ${template.label}`, "info");
                                }}
                              />
                              <ActionBtn
                                label="Clone"
                                onClick={() => {
                                  upsertLibraryTemplate(cloneForUserLibrary(template));
                                  addToast(`Cloned ${template.label}`, "success");
                                }}
                              />
                              <ActionBtn
                                label="Submit"
                                onClick={() =>
                                  void submitTemplateToCommunity(template).then((r) => {
                                    if (r === "login_required") setShowLogin(true);
                                    else addToast("Opened submission", "success");
                                  }).catch((e) =>
                                    addToast(e instanceof Error ? e.message : "Failed", "error"),
                                  )
                                }
                              />
                              {isHidden ? (
                                <ActionBtn
                                  label="Restore"
                                  onClick={() => {
                                    restoreHiddenLibraryTemplate(key);
                                    addToast(`Restored ${template.label}`, "success");
                                  }}
                                />
                              ) : (
                                <ActionBtn label="Del" danger onClick={() => handleDelete(template)} />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                          No templates match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {backups.length > 0 && (
                <div className="border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text)]">Recent backups: </span>
                  {backups.slice(0, 3).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="mr-2 underline hover:text-blue-500 cursor-pointer"
                      onClick={() => {
                        const restored = restoreLibraryBackup(b.id);
                        if (!restored) return;
                        replaceCustomTemplates(restored);
                        addToast(`Restored backup from ${new Date(b.savedAt).toLocaleString()}`, "success");
                        setBackups(listLibraryBackups());
                      }}
                    >
                      {b.label} ({b.templates.length})
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}

function ActionBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-[10px] border cursor-pointer transition-colors ${
        danger
          ? "border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-500/15"
          : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      {label}
    </button>
  );
}
