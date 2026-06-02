/**
 * Pack contiguous empty rack U into multi-U blank/vent panels.
 */

import type { FillPanelKind } from "./rackFillCatalog";

export type FillPlacement = {
  uPosition: number;
  heightU: number;
  kind: FillPanelKind;
};

function isVentU(u: number, ventEveryNU: number): boolean {
  return ventEveryNU > 0 && u % ventEveryNU === 0;
}

function contiguousRuns(freeU: number[]): number[][] {
  if (!freeU.length) return [];
  const runs: number[][] = [[freeU[0]!]];
  for (let i = 1; i < freeU.length; i += 1) {
    const u = freeU[i]!;
    const prev = freeU[i - 1]!;
    if (u === prev + 1) runs[runs.length - 1]!.push(u);
    else runs.push([u]);
  }
  return runs;
}

/** Greedy largest-first pack for a contiguous blank-only run. */
export function packBlankRun(
  runLength: number,
  startU: number,
  allowedSizesU: number[],
): FillPlacement[] {
  const sizes = [...allowedSizesU].filter((s) => s >= 1).sort((a, b) => b - a);
  if (!sizes.length) sizes.push(1);

  const out: FillPlacement[] = [];
  let u = startU;
  let remaining = runLength;

  while (remaining > 0) {
    const size = sizes.find((s) => s <= remaining) ?? 1;
    out.push({ uPosition: u, heightU: size, kind: "blank" });
    u += size;
    remaining -= size;
  }
  return out;
}

function placementsForRun(
  run: number[],
  ventEveryNU: number,
  ventPanelHeightU: 1 | 2,
  blankSizesU: number[],
): FillPlacement[] {
  const out: FillPlacement[] = [];
  let idx = 0;

  while (idx < run.length) {
    const u = run[idx]!;

    if (isVentU(u, ventEveryNU)) {
      const can2 =
        ventPanelHeightU === 2 && idx + 1 < run.length && run[idx + 1] === u + 1;
      const h = can2 ? 2 : 1;
      out.push({ uPosition: u, heightU: h, kind: "vent" });
      idx += h;
      continue;
    }

    let blankLen = 0;
    const startU = u;
    while (idx < run.length && !isVentU(run[idx]!, ventEveryNU)) {
      blankLen += 1;
      idx += 1;
    }
    if (blankLen > 0) {
      out.push(...packBlankRun(blankLen, startU, blankSizesU));
    }
  }

  return out;
}

/**
 * Plan placements for one rack fill band [skipBottom, skipFromU).
 * `freeU` is sorted ascending list of unoccupied U in that band.
 */
export function planFillPlacements(opts: {
  freeU: number[];
  ventEveryNU: number;
  ventPanelHeightU: 1 | 2;
  blankSizesU: number[];
}): FillPlacement[] {
  const { freeU, ventEveryNU, ventPanelHeightU, blankSizesU } = opts;
  if (!freeU.length) return [];

  const placements: FillPlacement[] = [];
  for (const run of contiguousRuns(freeU)) {
    placements.push(...placementsForRun(run, ventEveryNU, ventPanelHeightU, blankSizesU));
  }
  return placements;
}
