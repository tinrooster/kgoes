/** Align / distribute print-sheet viewports (mm-space bounding boxes). */

import type { PrintViewport } from "./types";

export type PrintLayoutOp =
  | "align-left"
  | "align-center-h"
  | "align-right"
  | "align-top"
  | "align-middle-v"
  | "align-bottom"
  | "distribute-h"
  | "distribute-v";

export interface PrintRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function viewportRect(vp: PrintViewport): PrintRect {
  return { x: vp.positionMm.x, y: vp.positionMm.y, w: vp.sizeMm.w, h: vp.sizeMm.h };
}

/** Returns new positionMm per viewport id (size unchanged). */
export function computePrintLayout(
  viewports: PrintViewport[],
  selectedIds: string[],
  op: PrintLayoutOp,
): Map<string, { x: number; y: number }> {
  const selected = viewports.filter((v) => selectedIds.includes(v.id));
  if (selected.length < 2) return new Map();
  if ((op === "distribute-h" || op === "distribute-v") && selected.length < 2) return new Map();

  const updates = new Map<string, { x: number; y: number }>();

  const place = (vp: PrintViewport, x: number, y: number) => {
    if (vp.positionMm.x !== x || vp.positionMm.y !== y) {
      updates.set(vp.id, { x, y });
    }
  };

  switch (op) {
    case "align-left": {
      const minX = Math.min(...selected.map((v) => v.positionMm.x));
      for (const v of selected) place(v, minX, v.positionMm.y);
      break;
    }
    case "align-right": {
      const maxRight = Math.max(...selected.map((v) => v.positionMm.x + v.sizeMm.w));
      for (const v of selected) place(v, maxRight - v.sizeMm.w, v.positionMm.y);
      break;
    }
    case "align-center-h": {
      const minX = Math.min(...selected.map((v) => v.positionMm.x));
      const maxRight = Math.max(...selected.map((v) => v.positionMm.x + v.sizeMm.w));
      const cx = (minX + maxRight) / 2;
      for (const v of selected) place(v, cx - v.sizeMm.w / 2, v.positionMm.y);
      break;
    }
    case "align-top": {
      const minY = Math.min(...selected.map((v) => v.positionMm.y));
      for (const v of selected) place(v, v.positionMm.x, minY);
      break;
    }
    case "align-bottom": {
      const maxBottom = Math.max(...selected.map((v) => v.positionMm.y + v.sizeMm.h));
      for (const v of selected) place(v, v.positionMm.x, maxBottom - v.sizeMm.h);
      break;
    }
    case "align-middle-v": {
      const minY = Math.min(...selected.map((v) => v.positionMm.y));
      const maxBottom = Math.max(...selected.map((v) => v.positionMm.y + v.sizeMm.h));
      const cy = (minY + maxBottom) / 2;
      for (const v of selected) place(v, v.positionMm.x, cy - v.sizeMm.h / 2);
      break;
    }
    case "distribute-h": {
      const sorted = [...selected].sort((a, b) => a.positionMm.x - b.positionMm.x);
      if (sorted.length === 2) {
        const lo = Math.min(sorted[0].positionMm.x, sorted[1].positionMm.x);
        const hi = Math.max(
          sorted[0].positionMm.x + sorted[0].sizeMm.w,
          sorted[1].positionMm.x + sorted[1].sizeMm.w,
        );
        place(sorted[0], lo, sorted[0].positionMm.y);
        place(sorted[1], hi - sorted[1].sizeMm.w, sorted[1].positionMm.y);
      } else {
        const first = sorted[0].positionMm.x;
        const last = sorted[sorted.length - 1].positionMm.x;
        const step = (last - first) / (sorted.length - 1);
        sorted.forEach((v, i) => place(v, first + step * i, v.positionMm.y));
      }
      break;
    }
    case "distribute-v": {
      const sorted = [...selected].sort((a, b) => a.positionMm.y - b.positionMm.y);
      if (sorted.length === 2) {
        const lo = Math.min(sorted[0].positionMm.y, sorted[1].positionMm.y);
        const hi = Math.max(
          sorted[0].positionMm.y + sorted[0].sizeMm.h,
          sorted[1].positionMm.y + sorted[1].sizeMm.h,
        );
        place(sorted[0], sorted[0].positionMm.x, lo);
        place(sorted[1], sorted[1].positionMm.x, hi - sorted[1].sizeMm.h);
      } else {
        const first = sorted[0].positionMm.y;
        const last = sorted[sorted.length - 1].positionMm.y;
        const step = (last - first) / (sorted.length - 1);
        sorted.forEach((v, i) => place(v, v.positionMm.x, first + step * i));
      }
      break;
    }
  }

  return updates;
}
