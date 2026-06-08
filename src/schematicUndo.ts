import { UndoHistoryStack } from './undoHistoryStack';
import type { ConnectionEdge, SchematicNode, SchematicPage } from './types';

export interface SchematicSnapshot {
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
  pages: SchematicPage[];
  autoRoute?: boolean;
}

export type SchematicUndoMeta = {
  label?: string;
  source?: string;
};

export const SCHEMATIC_UNDO_MAX = 20;

let undoScopeKey = 'standalone';
let pendingUndoSnapshot: SchematicSnapshot | null = null;
let onUndoStateChange: (() => void) | null = null;

function cloneSnapshot(snapshot: SchematicSnapshot): SchematicSnapshot {
  return structuredClone(snapshot);
}

function persistKeyForScope(): string {
  return `kgo-es-undo:${undoScopeKey}`;
}

const stack = new UndoHistoryStack<SchematicSnapshot>(
  SCHEMATIC_UNDO_MAX,
  cloneSnapshot,
  persistKeyForScope,
);

export function summarizeSchematicSnapshot(snapshot: SchematicSnapshot): string {
  const deviceCount = snapshot.nodes.filter((n) => n.type === 'device').length;
  const connectionCount = snapshot.edges.length;
  return `${deviceCount} device${deviceCount === 1 ? '' : 's'}, ${connectionCount} connection${connectionCount === 1 ? '' : 's'}`;
}

export function inferSchematicUndoLabel(
  snapshot: SchematicSnapshot,
  previous?: SchematicSnapshot | null,
): string {
  if (!previous) {
    return summarizeSchematicSnapshot(snapshot);
  }
  const nodeDelta = snapshot.nodes.length - previous.nodes.length;
  const edgeDelta = snapshot.edges.length - previous.edges.length;
  if (nodeDelta < 0) {
    const n = Math.abs(nodeDelta);
    return `Delete · ${n} item${n === 1 ? '' : 's'}`;
  }
  if (edgeDelta < 0) {
    const n = Math.abs(edgeDelta);
    return `Connection removed · ${n}`;
  }
  if (nodeDelta > 0) {
    return `Add · ${nodeDelta} item${nodeDelta === 1 ? '' : 's'}`;
  }
  if (edgeDelta > 0) {
    return `Connect · ${edgeDelta} connection${edgeDelta === 1 ? '' : 's'}`;
  }
  return `Edit · ${summarizeSchematicSnapshot(snapshot)}`;
}

function stackTopSnapshot(): SchematicSnapshot | null {
  return stack.peekUndoPayload(1);
}

export function setSchematicUndoScope(scopeKey: string): void {
  if (scopeKey === undoScopeKey) return;
  undoScopeKey = scopeKey;
  stack.restoreFromSession();
  onUndoStateChange?.();
}

export function setSchematicUndoStateListener(listener: (() => void) | null): void {
  onUndoStateChange = listener;
}

export function restoreSchematicUndoFromSession(): void {
  stack.restoreFromSession();
  onUndoStateChange?.();
}

export function clearSchematicUndoHistory(): void {
  pendingUndoSnapshot = null;
  stack.clear();
  onUndoStateChange?.();
}

export function setPendingUndoSnapshot(snapshot: SchematicSnapshot): void {
  pendingUndoSnapshot = cloneSnapshot(snapshot);
}

export function clearPendingUndoSnapshot(): void {
  pendingUndoSnapshot = null;
}

export function flushPendingUndoSnapshot(current: SchematicSnapshot): void {
  if (!pendingUndoSnapshot) return;
  pushSchematicUndo(current, { label: 'Move' });
}

function redoMeta(snapshot: SchematicSnapshot) {
  return { label: summarizeSchematicSnapshot(snapshot), source: 'es' as const };
}

export function pushSchematicUndo(current: SchematicSnapshot, meta?: SchematicUndoMeta): void {
  const before = pendingUndoSnapshot ?? current;
  const label =
    meta?.label?.trim() ||
    inferSchematicUndoLabel(before, pendingUndoSnapshot ? null : stackTopSnapshot());
  stack.pushBefore(before, { label, source: meta?.source ?? 'es' });
  pendingUndoSnapshot = null;
  onUndoStateChange?.();
}

export function undoSchematic(current: SchematicSnapshot): SchematicSnapshot | null {
  const restored = stack.undo(current, redoMeta(current));
  if (restored) onUndoStateChange?.();
  return restored;
}

export function redoSchematic(current: SchematicSnapshot): SchematicSnapshot | null {
  const restored = stack.redo(current, redoMeta(current));
  if (restored) onUndoStateChange?.();
  return restored;
}

export function undoSchematicSteps(current: SchematicSnapshot, steps: number): SchematicSnapshot | null {
  const restored = stack.undoSteps(current, steps, redoMeta(current));
  if (restored) onUndoStateChange?.();
  return restored;
}

export function listSchematicUndoHistory(limit = 8) {
  return stack.listUndoItems(limit);
}

export function schematicUndoSize(): number {
  return stack.undoSize;
}

export function schematicRedoSize(): number {
  return stack.redoSize;
}
