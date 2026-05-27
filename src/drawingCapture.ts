import type { ContentBounds } from "./viewNavUtils";

export type DrawingCaptureFn = (
  bounds: ContentBounds,
  widthPx: number,
  heightPx: number,
) => Promise<string | null>;

let captureFn: DrawingCaptureFn | null = null;

export function registerDrawingCapture(fn: DrawingCaptureFn | null): void {
  captureFn = fn;
}

export async function captureDrawingRegion(
  bounds: ContentBounds,
  widthPx: number,
  heightPx: number,
): Promise<string | null> {
  if (!captureFn) return null;
  return captureFn(bounds, Math.max(64, Math.round(widthPx)), Math.max(64, Math.round(heightPx)));
}
