import type { DeviceTemplate } from "./types";
import { exportTemplatesToFile } from "./templateExport";

const BACKUP_KEY = "easyschematic-library-backups";
const MAX_BACKUPS = 12;

export interface LibraryBackupEntry {
  id: string;
  savedAt: string;
  label: string;
  templates: DeviceTemplate[];
}

function loadBackups(): LibraryBackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryBackupEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistBackups(entries: LibraryBackupEntry[]): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(entries.slice(0, MAX_BACKUPS)));
  } catch {
    /* ignore quota */
  }
}

export function pushLibraryBackup(templates: DeviceTemplate[], label: string): void {
  if (templates.length === 0) return;
  const entry: LibraryBackupEntry = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    label,
    templates: structuredClone(templates),
  };
  persistBackups([entry, ...loadBackups()]);
}

export function listLibraryBackups(): LibraryBackupEntry[] {
  return loadBackups();
}

export function restoreLibraryBackup(id: string): DeviceTemplate[] | null {
  const entry = loadBackups().find((b) => b.id === id);
  return entry ? structuredClone(entry.templates) : null;
}

export function downloadLibraryBackup(templates: DeviceTemplate[], filename = "library-backup.json"): void {
  exportTemplatesToFile(templates);
  void filename;
}
