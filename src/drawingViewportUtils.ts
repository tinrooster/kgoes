import type { PrintSheetPage, PrintViewport, SchematicNode } from "./types";
import { getPaperSize, PAGE_MARGIN_IN, TITLE_BLOCK_HEIGHT_IN } from "./printConfig";
import { computeSchematicContentBounds, contentBoundsAspect, type ContentBounds } from "./viewNavUtils";

const IN_TO_MM = 25.4;

export function isDrawingViewport(vp: PrintViewport): boolean {
  return vp.kind === "drawing";
}

export function isRackViewport(vp: PrintViewport): boolean {
  return vp.kind === "rack-front" || vp.kind === "rack-rear" || vp.kind === "rack-side";
}

export function isTowerDraftViewport(vp: PrintViewport): boolean {
  return vp.kind === "tower-draft";
}

export function printViewportKindLabel(vp: PrintViewport): string {
  if (vp.kind === "drawing") return "Drawing";
  if (vp.kind === "rack-front") return "Front";
  if (vp.kind === "rack-rear") return "Rear";
  if (vp.kind === "rack-side") return "Side";
  if (vp.kind === "tower-draft") {
    if (vp.towerView === "all-faces") return "All faces";
    if (vp.towerView === "site") return "Site plan";
    return "Profile";
  }
  return "Side";
}

export function drawingRegionForViewport(
  vp: PrintViewport,
  nodes: Parameters<typeof computeSchematicContentBounds>[0],
): ContentBounds | null {
  if (vp.drawingRegion) {
    return vp.drawingRegion;
  }
  return computeSchematicContentBounds(nodes);
}

export function naturalAspectForViewport(
  vp: PrintViewport,
  nodes: Parameters<typeof computeSchematicContentBounds>[0],
  rackAspect?: number,
): number {
  if (isDrawingViewport(vp)) {
    const bounds = drawingRegionForViewport(vp, nodes);
    return bounds ? contentBoundsAspect(bounds) : 4 / 3;
  }
  return rackAspect ?? vp.sizeMm.w / vp.sizeMm.h;
}

export function defaultDrawingViewportData(
  positionMm: { x: number; y: number },
  sizeMm: { w: number; h: number },
): Omit<PrintViewport, "id"> {
  return {
    kind: "drawing",
    positionMm,
    sizeMm,
    showLabel: true,
    showStats: false,
  };
}

/** Size and position a drawing viewport to fill the printable area (margins + title block). */
export function layoutDrawingViewportOnSheet(
  sheet: PrintSheetPage,
  nodes: SchematicNode[],
): { positionMm: { x: number; y: number }; sizeMm: { w: number; h: number } } | null {
  const bounds = computeSchematicContentBounds(nodes);
  if (!bounds) return null;

  const paper = getPaperSize(sheet.paperId, sheet.customWidthIn, sheet.customHeightIn);
  const pageW = sheet.orientation === "landscape" ? paper.heightIn * IN_TO_MM : paper.widthIn * IN_TO_MM;
  const pageH = sheet.orientation === "landscape" ? paper.widthIn * IN_TO_MM : paper.heightIn * IN_TO_MM;
  const marginMm = PAGE_MARGIN_IN * IN_TO_MM;
  const titleBlockH = sheet.showTitleBlock ? TITLE_BLOCK_HEIGHT_IN * IN_TO_MM : 0;
  const contentW = pageW - 2 * marginMm;
  const contentH = pageH - 2 * marginMm - titleBlockH;

  const aspect = contentBoundsAspect(bounds);
  let w = contentW;
  let h = w / aspect;
  if (h > contentH) {
    h = contentH;
    w = h * aspect;
  }

  return {
    positionMm: {
      x: marginMm + (contentW - w) / 2,
      y: marginMm + (contentH - h) / 2,
    },
    sizeMm: { w, h },
  };
}

export function newDrawingViewportForSheet(
  sheet: PrintSheetPage,
  nodes: SchematicNode[],
): Omit<PrintViewport, "id"> | null {
  const layout = layoutDrawingViewportOnSheet(sheet, nodes);
  if (!layout) return null;
  return defaultDrawingViewportData(layout.positionMm, layout.sizeMm);
}
