/** AutoCAD-style arrow nudge: 2 screen px without snap, grid step with snap. */

export const NUDGE_SCREEN_PX = 2;

export type ArrowDirection = "up" | "down" | "left" | "right";

export function arrowDirectionFromKey(key: string): ArrowDirection | null {
  switch (key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    default:
      return null;
  }
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function isArrowKey(key: string): boolean {
  return ARROW_KEYS.has(key);
}

/** Flow / schematic coordinates: 2 screen pixels at the current zoom. */
export function nudgeStepFlowUnits(zoom: number): number {
  return NUDGE_SCREEN_PX / Math.max(zoom, 0.01);
}

/** Signed delta on one axis from an arrow direction. */
export function axisDelta(direction: ArrowDirection, step: number): { dx: number; dy: number } {
  switch (direction) {
    case "left":
      return { dx: -step, dy: 0 };
    case "right":
      return { dx: step, dy: 0 };
    case "up":
      return { dx: 0, dy: -step };
    case "down":
      return { dx: 0, dy: step };
  }
}

/** Face-plate % coords: convert 2 screen pixels using SVG scale and face dimensions. */
export function nudgeStepFacePlatePct(
  screenScale: number,
  faceWidthPx: number,
  faceHeightPx: number,
): { dxPct: number; dyPct: number } {
  const s = Math.max(screenScale, 0.01);
  const svgDx = NUDGE_SCREEN_PX / s;
  return {
    dxPct: (svgDx / faceWidthPx) * 100,
    dyPct: (svgDx / faceHeightPx) * 100,
  };
}
