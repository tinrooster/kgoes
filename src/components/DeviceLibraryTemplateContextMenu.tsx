import { useCallback, useEffect } from "react";
import { useContextMenuPosition } from "../hooks/useContextMenuPosition";
import { useSchematicStore } from "../store";
import type { CustomTemplateGroup, DeviceTemplate } from "../types";
import {
  cloneForUserLibrary,
  cloneTemplateDeep,
  LIBRARY_EDIT_PLACEMENT,
  submitTemplateToCommunity,
  templateKey,
} from "../deviceTemplateActions";

export interface LibraryTemplateMenuState {
  template: DeviceTemplate;
  screenX: number;
  screenY: number;
  isCustom: boolean;
}

interface Props {
  menu: LibraryTemplateMenuState | null;
  onClose: () => void;
  groups: CustomTemplateGroup[];
  onOpenAdmin?: (template: DeviceTemplate) => void;
  onLoginRequired?: () => void;
}

export default function DeviceLibraryTemplateContextMenu({
  menu,
  onClose,
  groups,
  onOpenAdmin,
  onLoginRequired,
}: Props) {
  const { ref: menuRef, pos: menuPos } = useContextMenuPosition(
    menu?.screenX ?? 0,
    menu?.screenY ?? 0,
    [menu?.template.id, menu?.isCustom],
  );

  const createAndEditDevice = useSchematicStore((s) => s.createAndEditDevice);
  const upsertLibraryTemplate = useSchematicStore((s) => s.upsertLibraryTemplate);
  const removeLibraryTemplateWithBackup = useSchematicStore((s) => s.removeLibraryTemplateWithBackup);
  const toggleFavoriteTemplate = useSchematicStore((s) => s.toggleFavoriteTemplate);
  const addOwnedGear = useSchematicStore((s) => s.addOwnedGear);
  const moveCustomTemplateToGroup = useSchematicStore((s) => s.moveCustomTemplateToGroup);
  const addCustomTemplateGroup = useSchematicStore((s) => s.addCustomTemplateGroup);
  const addToast = useSchematicStore((s) => s.addToast);
  const favoriteTemplates = useSchematicStore((s) => s.favoriteTemplates);

  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  const run = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );

  if (!menu) return null;

  const { template, isCustom } = menu;
  const key = templateKey(template);
  const isFavorite = favoriteTemplates.includes(key);

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[180px]"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        maxHeight: menuPos.maxHeight,
        overflowY: menuPos.maxHeight ? "auto" : undefined,
        visibility: menuPos.ready ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        label="Edit template..."
        onClick={() =>
          run(() => {
            createAndEditDevice(cloneTemplateDeep(template), LIBRARY_EDIT_PLACEMENT);
            addToast(`Editing ${template.label} — placed on canvas for editing`, "info");
          })
        }
      />
      <MenuItem
        label="Clone to user library"
        onClick={() =>
          run(() => {
            upsertLibraryTemplate(cloneForUserLibrary(template));
            addToast(`Cloned ${template.label} to user library`, "success");
          })
        }
      />
      <MenuItem
        label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={() => run(() => toggleFavoriteTemplate(key))}
      />
      <MenuItem
        label="Add to owned gear"
        onClick={() =>
          run(() => {
            addOwnedGear(template);
            addToast(`Added ${template.label} to owned gear`, "success");
          })
        }
      />

      {isCustom && groups.length > 0 && (
        <>
          <div className="border-t border-gray-200 my-1" />
          <div className="px-3 py-1 text-neutral-400 text-[10px] uppercase tracking-wider">
            Move to group
          </div>
          {groups.map((g) => (
            <MenuItem
              key={g.id}
              label={g.label}
              indent
              onClick={() =>
                run(() => {
                  moveCustomTemplateToGroup(key, g.id);
                  addToast(`Moved to ${g.label}`, "success");
                })
              }
            />
          ))}
          <MenuItem
            label="Ungrouped"
            indent
            onClick={() => run(() => moveCustomTemplateToGroup(key, null))}
          />
        </>
      )}

      {isCustom && (
        <MenuItem
          label="New group..."
          indent
          onClick={() =>
            run(() => {
              const label = window.prompt("Group name:");
              if (!label?.trim()) return;
              const groupId = addCustomTemplateGroup(label.trim());
              moveCustomTemplateToGroup(key, groupId);
              addToast(`Created group “${label.trim()}”`, "success");
            })
          }
        />
      )}

      <div className="border-t border-gray-200 my-1" />
      <MenuItem
        label="Submit to community..."
        onClick={() =>
          run(async () => {
            try {
              const result = await submitTemplateToCommunity(template);
              if (result === "login_required") {
                onLoginRequired?.();
                addToast("Sign in to submit to the community library", "info");
              } else {
                addToast("Opened community submission", "success");
              }
            } catch (e) {
              addToast(e instanceof Error ? e.message : "Submission failed", "error");
            }
          })
        }
      />
      {onOpenAdmin && (
        <MenuItem
          label="Manage in admin panel..."
          onClick={() => run(() => onOpenAdmin(template))}
        />
      )}
      {template.id && (
        <MenuItem
          label="Copy template ID"
          onClick={() =>
            run(async () => {
              try {
                await navigator.clipboard.writeText(template.id!);
                addToast("Template ID copied", "success");
              } catch {
                addToast("Could not copy to clipboard", "error");
              }
            })
          }
        />
      )}

      <div className="border-t border-gray-200 my-1" />
      <MenuItem
        label="Remove from library…"
        danger
        onClick={() =>
          run(() => {
            if (!window.confirm(`Remove “${template.label}”? A backup is saved automatically.`)) return;
            removeLibraryTemplateWithBackup(key, `Deleted: ${template.label}`);
            addToast(`Removed ${template.label} (backup saved)`, "success");
          })
        }
      />
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
  indent,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      className={`w-full text-left py-1.5 text-xs cursor-pointer ${indent ? "px-5" : "px-3"} ${
        danger
          ? "text-red-600 hover:bg-red-50 hover:text-red-700"
          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
