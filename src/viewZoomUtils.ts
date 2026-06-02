/** Stepped viewport zoom — same 25% preset ladder as trackIT numbering map display scale. */

export const VIEW_ZOOM_PRESETS = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3,
  3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6,
  6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8,
] as const;

export const VIEW_ZOOM_MIN = VIEW_ZOOM_PRESETS[0];
export const VIEW_ZOOM_MAX = VIEW_ZOOM_PRESETS[VIEW_ZOOM_PRESETS.length - 1];
export const VIEW_ZOOM_DEFAULT = 1;

/** Min/max only — for scroll-wheel zoom (no 25% preset snapping). */
export function clampViewZoomContinuous(scale: number): number {
  if (!Number.isFinite(scale)) return VIEW_ZOOM_DEFAULT;
  return Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, scale));
}

export function clampViewZoom(scale: number): number {
  if (!Number.isFinite(scale)) return VIEW_ZOOM_DEFAULT;
  const bounded = clampViewZoomContinuous(scale);
  let nearest: number = VIEW_ZOOM_PRESETS[0];
  let bestDelta = Math.abs(bounded - nearest);
  for (const preset of VIEW_ZOOM_PRESETS) {
    const delta = Math.abs(bounded - preset);
    if (delta < bestDelta) {
      bestDelta = delta;
      nearest = preset;
    }
  }
  return nearest;
}

function viewZoomPresetIndex(scale: number): number {
  const clamped = clampViewZoom(scale);
  const idx = VIEW_ZOOM_PRESETS.indexOf(clamped as (typeof VIEW_ZOOM_PRESETS)[number]);
  return idx >= 0 ? idx : VIEW_ZOOM_PRESETS.indexOf(VIEW_ZOOM_DEFAULT);
}

export function stepViewZoom(current: number, direction: "in" | "out"): number {
  const idx = viewZoomPresetIndex(current);
  const nextIdx =
    direction === "in"
      ? Math.min(VIEW_ZOOM_PRESETS.length - 1, idx + 1)
      : Math.max(0, idx - 1);
  return VIEW_ZOOM_PRESETS[nextIdx];
}

/** Whole-number percent label — shows actual zoom (wheel may land between 25% presets). */
export function viewZoomPercent(scale: number): number {
  return Math.round(clampViewZoomContinuous(scale) * 100);
}
