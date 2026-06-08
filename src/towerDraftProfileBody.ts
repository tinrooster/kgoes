import type { TowerDraftPage, TrackItTowerSiteContext } from "./types";
import { towerHalfWidthAtY } from "./towerDraftElevationLayout";

export type TowerProfileVisual =
  | "reference_image"
  | "generated_guyed"
  | "generated_self_support"
  | "generated_monopole";

export function resolveProfileVisual(
  page: TowerDraftPage,
  context?: TrackItTowerSiteContext | null,
  hasReferenceImage?: boolean,
): TowerProfileVisual {
  const fromContext = context?.profileVisual;
  if (fromContext && fromContext !== "reference_image") return fromContext;
  if (hasReferenceImage) return "reference_image";
  const towerType = page.towerType ?? context?.towerType ?? "self_support";
  if (towerType === "guyed") return "generated_guyed";
  if (towerType === "monopole") return "generated_monopole";
  return "generated_self_support";
}

export function shouldRenderGeneratedProfileBody(
  visual: TowerProfileVisual,
  referenceImageFailed: boolean,
): boolean {
  if (referenceImageFailed) return true;
  return visual !== "reference_image";
}

type ProfileBodyOpts = {
  centerX: number;
  topY: number;
  groundY: number;
  layoutHeightFt: number;
  pxPerFt: number;
  towerType: TowerDraftPage["towerType"];
  visual: TowerProfileVisual;
};

/** Guyed mast: tapered lattice + three guy wires (not a single thin line). */
export function guyedMastProfileElements(opts: ProfileBodyOpts): {
  mast: string;
  guys: string;
  anchors: string;
} {
  const { centerX, topY, groundY } = opts;
  const h = groundY - topY;
  const baseHalfW = 22;
  const topHalfW = 8;
  const lTop = centerX - topHalfW;
  const rTop = centerX + topHalfW;
  const lBase = centerX - baseHalfW;
  const rBase = centerX + baseHalfW;

  const rows = 12;
  const struts: string[] = [];
  const braces: string[] = [];
  for (let i = 0; i < rows; i++) {
    const y1 = topY + (h * i) / rows;
    const y2 = topY + (h * (i + 1)) / rows;
    const hw1 = towerHalfWidthAtY(y1, topY, groundY, baseHalfW, topHalfW);
    const hw2 = towerHalfWidthAtY(y2, topY, groundY, baseHalfW, topHalfW);
    braces.push(
      `M ${centerX - hw1} ${y1} L ${centerX + hw2} ${y2} M ${centerX + hw1} ${y1} L ${centerX - hw2} ${y2}`,
    );
    struts.push(`M ${centerX - hw2} ${y2} L ${centerX + hw2} ${y2}`);
  }

  const mast = [
    `M ${lBase} ${groundY} L ${lTop} ${topY} L ${rTop} ${topY} L ${rBase} ${groundY} Z`,
    `M ${lBase} ${groundY} L ${lTop} ${topY}`,
    `M ${rBase} ${groundY} L ${rTop} ${topY}`,
    struts.join(" "),
    braces.join(" "),
  ].join(" ");

  const guyAttachY = topY + h * 0.72;
  const span = Math.max(48, h * 0.22);
  const guys = [
    `M ${centerX - span} ${groundY} L ${centerX} ${guyAttachY}`,
    `M ${centerX + span} ${groundY} L ${centerX} ${guyAttachY}`,
    `M ${centerX} ${groundY + 4} L ${centerX} ${guyAttachY}`,
  ].join(" ");

  const anchors = [
    `M ${centerX - span - 6} ${groundY} h 12`,
    `M ${centerX + span - 6} ${groundY} h 12`,
    `M ${centerX - 6} ${groundY + 4} h 12`,
  ].join(" ");

  return { mast, guys, anchors };
}

export function selfSupportProfileElements(opts: ProfileBodyOpts): {
  body: string;
  struts: string;
  braces: string;
} {
  const { centerX, topY, groundY } = opts;
  const baseHalfW = 18;
  const topHalfW = 12;
  const lTop = centerX - topHalfW;
  const rTop = centerX + topHalfW;
  const lBase = centerX - baseHalfW;
  const rBase = centerX + baseHalfW;
  const rows = 9;
  const braces: string[] = [];
  const struts: string[] = [];
  for (let i = 0; i < rows; i++) {
    const y1 = topY + ((groundY - topY) * i) / rows;
    const y2 = topY + ((groundY - topY) * (i + 1)) / rows;
    const hw1 = towerHalfWidthAtY(y1, topY, groundY, baseHalfW, topHalfW);
    const hw2 = towerHalfWidthAtY(y2, topY, groundY, baseHalfW, topHalfW);
    braces.push(
      `M ${centerX - hw1} ${y1} L ${centerX + hw2} ${y2} M ${centerX + hw1} ${y1} L ${centerX - hw2} ${y2}`,
    );
    struts.push(`M ${centerX - hw2} ${y2} L ${centerX + hw2} ${y2}`);
  }
  return {
    body: `M ${lBase} ${groundY} L ${lTop} ${topY} L ${rTop} ${topY} L ${rBase} ${groundY} Z`,
    struts: struts.join(" "),
    braces: braces.join(" "),
  };
}
