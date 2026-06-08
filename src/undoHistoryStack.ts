/** Small undo/redo stack with optional sessionStorage persistence. */

export type UndoHistoryMeta = {
  label: string;
  at: number;
  source?: string;
};

export type UndoHistoryEntry<T> = UndoHistoryMeta & {
  payload: T;
};

export type UndoHistoryPersisted<T> = {
  undo: UndoHistoryEntry<T>[];
  redo: UndoHistoryEntry<T>[];
};

export type UndoHistoryListItem = {
  depth: number;
  label: string;
  at: number;
  source?: string;
};

export class UndoHistoryStack<T> {
  private undoStack: UndoHistoryEntry<T>[] = [];
  private redoStack: UndoHistoryEntry<T>[] = [];
  private maxDepth: number;
  private clone: (value: T) => T;
  private persistKey?: string | (() => string | null);

  constructor(
    maxDepth: number,
    clone: (value: T) => T,
    persistKey?: string | (() => string | null),
  ) {
    this.maxDepth = maxDepth;
    this.clone = clone;
    this.persistKey = persistKey;
  }

  private wrap(payload: T, meta?: Partial<UndoHistoryMeta>): UndoHistoryEntry<T> {
    return {
      payload: this.clone(payload),
      label: meta?.label?.trim() || 'Edit',
      at: meta?.at ?? Date.now(),
      source: meta?.source,
    };
  }

  private resolvePersistKey(): string | null {
    if (!this.persistKey) return null;
    return typeof this.persistKey === 'function' ? this.persistKey() : this.persistKey;
  }

  private persist(): void {
    const key = this.resolvePersistKey();
    if (!key) return;
    try {
      const payload: UndoHistoryPersisted<T> = {
        undo: this.undoStack,
        redo: this.redoStack,
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // quota / private mode
    }
  }

  restoreFromSession(): boolean {
    const key = this.resolvePersistKey();
    if (!key) return false;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as UndoHistoryPersisted<T> | { undo: T[]; redo: T[] };
      if (!Array.isArray(parsed.undo)) return false;

      const toEntry = (item: T | UndoHistoryEntry<T>): UndoHistoryEntry<T> => {
        if (item && typeof item === 'object' && 'payload' in item) {
          return item as UndoHistoryEntry<T>;
        }
        return this.wrap(item as T, { label: 'Edit', at: Date.now() });
      };

      this.undoStack = parsed.undo.map(toEntry);
      this.redoStack = Array.isArray(parsed.redo) ? parsed.redo.map(toEntry) : [];
      return true;
    } catch {
      return false;
    }
  }

  clearPersisted(): void {
    const key = this.resolvePersistKey();
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  pushBefore(before: T, meta?: Partial<UndoHistoryMeta>): void {
    this.undoStack.push(this.wrap(before, meta));
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.persist();
  }

  undo(current: T, meta?: Partial<UndoHistoryMeta>): T | null {
    const previous = this.undoStack.pop();
    if (!previous) return null;
    this.redoStack.push(this.wrap(current, meta));
    this.persist();
    return previous.payload;
  }

  redo(current: T, meta?: Partial<UndoHistoryMeta>): T | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(this.wrap(current, meta));
    this.persist();
    return next.payload;
  }

  undoSteps(current: T, steps: number, meta?: Partial<UndoHistoryMeta>): T | null {
    if (steps < 1 || steps > this.undoStack.length) return null;
    this.redoStack.push(this.wrap(current, meta));
    let restored: T | null = null;
    for (let i = 0; i < steps; i++) {
      const entry = this.undoStack.pop();
      if (!entry) break;
      restored = entry.payload;
      if (i < steps - 1) {
        this.redoStack.push(entry);
      }
    }
    this.persist();
    return restored;
  }

  listUndoItems(limit = 8): UndoHistoryListItem[] {
    const items: UndoHistoryListItem[] = [];
    for (let i = this.undoStack.length - 1; i >= 0 && items.length < limit; i--) {
      const entry = this.undoStack[i];
      items.push({
        depth: this.undoStack.length - i,
        label: entry.label,
        at: entry.at,
        source: entry.source,
      });
    }
    return items;
  }

  peekUndoPayload(depthFromTop = 1): T | null {
    const idx = this.undoStack.length - depthFromTop;
    if (idx < 0) return null;
    return this.clone(this.undoStack[idx].payload);
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.clearPersisted();
  }

  get undoSize(): number {
    return this.undoStack.length;
  }

  get redoSize(): number {
    return this.redoStack.length;
  }
}
