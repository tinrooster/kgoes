/**
 * Shared TrackIt sync pill / drawer status (MenuBar + KgoSyncDrawer).
 */

export function computeTrackItSyncStatus(opts: {
  isLinked: boolean;
  lastPushedAt: string | null;
  hasUnsavedChanges: boolean;
  unnumberedCount: number;
}): {
  needsSchematicSave: boolean;
  pendingCount: number;
  pillLabel: string;
  pillWarning: boolean;
} {
  const { isLinked, lastPushedAt, hasUnsavedChanges, unnumberedCount } = opts;
  const needsSchematicSave = isLinked && (!lastPushedAt || hasUnsavedChanges);
  const pendingCount = unnumberedCount + (needsSchematicSave ? 1 : 0);

  let pillLabel = "In sync";
  if (needsSchematicSave && unnumberedCount === 0) {
    pillLabel = "Save to TrackIt";
  } else if (pendingCount > 0) {
    pillLabel = `${pendingCount} change${pendingCount !== 1 ? "s" : ""}`;
  }

  return {
    needsSchematicSave,
    pendingCount,
    pillLabel,
    pillWarning: pendingCount > 0,
  };
}
