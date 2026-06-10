import { useState, useCallback, useEffect } from "react";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import { SidebarPanelHeader, SidebarPanelShell, SidebarRail } from "./sidebarChrome";
import TitleBlockDialog from "./TitleBlockDialog";
import CollapsibleModuleSection from "./CollapsibleModuleSection";

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "showName", label: "Show / Project", placeholder: "e.g. Morning News Live" },
  { key: "venue", label: "Venue / Location", placeholder: "e.g. Studio A, Building 2" },
  { key: "designer", label: "Designer", placeholder: "Name" },
  { key: "engineer", label: "Engineer", placeholder: "Name" },
  { key: "date", label: "Date", placeholder: "e.g. 2026-03-15" },
  { key: "drawingTitle", label: "Drawing Title", placeholder: "e.g. Main Studio Signal Flow" },
];

export default function ShowInfoPanel({ mobile, onClose }: { mobile?: boolean; onClose?: () => void } = {}) {
  const rightExpanded = useSidebarStore((s) => s.rightShowInfoExpanded);
  const setRightExpanded = useSidebarStore((s) => s.setRightShowInfoExpanded);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const collapsed = mobile ? false : !rightExpanded;
  const [showEditor, setShowEditor] = useState(false);
  const titleBlock = useSchematicStore((s) => s.titleBlock);
  const setTitleBlock = useSchematicStore((s) => s.setTitleBlock);

  const handleBlur = useCallback(
    (key: string, value: string) => {
      if (value !== (titleBlock as unknown as Record<string, string>)[key]) {
        setTitleBlock({ ...titleBlock, [key]: value });
      }
    },
    [titleBlock, setTitleBlock],
  );

  const handleCustomFieldBlur = useCallback(
    (id: string, value: string) => {
      const cf = titleBlock.customFields.find((f) => f.id === id);
      if (cf && cf.value !== value) {
        setTitleBlock({
          ...titleBlock,
          customFields: titleBlock.customFields.map((f) =>
            f.id === id ? { ...f, value } : f,
          ),
        });
      }
    },
    [titleBlock, setTitleBlock],
  );

  const addCustomField = useCallback(() => {
    setTitleBlock({
      ...titleBlock,
      customFields: [
        ...titleBlock.customFields,
        { id: `custom-${Date.now()}`, label: "New Field", value: "" },
      ],
    });
  }, [titleBlock, setTitleBlock]);

  const removeCustomField = useCallback(
    (id: string) => {
      setTitleBlock({
        ...titleBlock,
        customFields: titleBlock.customFields.filter((f) => f.id !== id),
      });
    },
    [titleBlock, setTitleBlock],
  );

  const renameCustomField = useCallback(
    (id: string, label: string) => {
      setTitleBlock({
        ...titleBlock,
        customFields: titleBlock.customFields.map((f) =>
          f.id === id ? { ...f, label } : f,
        ),
      });
    },
    [titleBlock, setTitleBlock],
  );

  if (!mobile && collapsed) {
    return (
      <SidebarRail label="Show" title="Show info" onExpand={() => expandRightPanel("showInfo")} />
    );
  }

  return (
    <SidebarPanelShell widthClass="w-48" mobile={mobile}>
      <SidebarPanelHeader
        title="Show info"
        workspacePanelId="showInfo"
        onCollapse={() => (mobile ? onClose?.() : setRightExpanded(false))}
        closeMode={!!mobile}
      />

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <CollapsibleModuleSection
          title="Project fields"
          hint={titleBlock.showName?.trim() || titleBlock.drawingTitle?.trim() || "Show / drawing metadata"}
          persistKey="show-info:project-fields"
        >
        <div className="space-y-2">
        {FIELDS.map(({ key, label, placeholder }) => (
          <FieldInput
            key={key}
            label={label}
            placeholder={placeholder}
            value={(titleBlock as unknown as Record<string, string>)[key] ?? ""}
            onBlur={(v) => handleBlur(key, v)}
          />
        ))}

        <button
          onClick={() => setShowEditor(true)}
          className="w-full mt-1 px-2 py-1.5 text-[10px] uppercase tracking-wider rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
        >
          Customize Title Block...
        </button>
        </div>
        </CollapsibleModuleSection>

        <CollapsibleModuleSection
          title="Custom fields"
          hint={
            titleBlock.customFields?.length
              ? `${titleBlock.customFields.length} field${titleBlock.customFields.length === 1 ? "" : "s"}`
              : "None"
          }
          persistKey="show-info:custom-fields"
        >
        <div className="space-y-2">
        {titleBlock.customFields?.map((cf) => (
          <div key={cf.id}>
            <div className="flex items-center gap-0.5 mb-0.5">
              <input
                className="flex-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] bg-transparent border-b border-transparent focus:border-blue-400 outline-none min-w-0"
                value={cf.label}
                onChange={(e) => renameCustomField(cf.id, e.target.value)}
              />
              <button
                onClick={() => removeCustomField(cf.id)}
                className="text-[10px] text-red-400 hover:text-red-600 cursor-pointer px-0.5 shrink-0"
                title="Remove field"
              >
                &times;
              </button>
            </div>
            <FieldInput
              label=""
              placeholder="Value"
              value={cf.value}
              onBlur={(v) => handleCustomFieldBlur(cf.id, v)}
              hideLabel
            />
          </div>
        ))}

        <button
          onClick={addCustomField}
          className="w-full mt-1 px-2 py-1 text-[10px] rounded border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] hover:border-[var(--color-text-muted)] transition-colors cursor-pointer"
        >
          + Add Field
        </button>
        </div>
        </CollapsibleModuleSection>
      </div>

      {showEditor && <TitleBlockDialog onClose={() => setShowEditor(false)} />}
    </SidebarPanelShell>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onBlur,
  hideLabel,
}: {
  label: string;
  placeholder: string;
  value: string;
  onBlur: (value: string) => void;
  hideLabel?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  // Sync draft when store value changes externally (e.g. import)
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div>
      {!hideLabel && label && (
        <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
          {label}
        </label>
      )}
      <input
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onBlur(draft)}
        placeholder={placeholder}
      />
    </div>
  );
}
