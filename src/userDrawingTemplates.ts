import { migrateSchematic } from "./migrations";
import type { SchematicFile } from "./types";

export interface UserDrawingTemplate {
  id: string;
  label: string;
  description?: string;
  savedAt: string;
  file: SchematicFile;
}

const STORAGE_KEY = "kgo-es-user-drawing-templates";

function readAll(): UserDrawingTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserDrawingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(templates: UserDrawingTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* ignore quota */
  }
}

export function listUserDrawingTemplates(): UserDrawingTemplate[] {
  return readAll().sort((a, b) => a.label.localeCompare(b.label));
}

export function userTemplateId(id: string): string {
  return `user:${id}`;
}

export function isUserTemplateId(templateId: string): boolean {
  return templateId.startsWith("user:");
}

export function resolveUserTemplateId(templateId: string): string | null {
  if (!isUserTemplateId(templateId)) return null;
  return templateId.slice("user:".length);
}

export function getUserDrawingTemplate(templateId: string): UserDrawingTemplate | null {
  const id = resolveUserTemplateId(templateId);
  if (!id) return null;
  return readAll().find((t) => t.id === id) ?? null;
}

export function saveUserDrawingTemplate(
  label: string,
  file: SchematicFile,
  description?: string,
): UserDrawingTemplate {
  const trimmed = label.trim() || "My template";
  const id =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `tpl-${Date.now()}`;
  const migrated = migrateSchematic(file) as SchematicFile;
  const entry: UserDrawingTemplate = {
    id: `${id}-${Date.now().toString(36)}`,
    label: trimmed,
    description: description?.trim() || undefined,
    savedAt: new Date().toISOString(),
    file: migrated,
  };
  writeAll([...readAll(), entry]);
  return entry;
}

export function deleteUserDrawingTemplate(templateId: string): boolean {
  const id = resolveUserTemplateId(templateId);
  if (!id) return false;
  const next = readAll().filter((t) => t.id !== id);
  if (next.length === readAll().length) return false;
  writeAll(next);
  return true;
}
