import type { Point } from "../domain/types";
import { generatePanelGrid } from "./panelGrid";

export interface HubMatrixLayout {
  viewBox: string;
  width: number;
  height: number;
  trunkX: number;
  sourceTitleX: number;
  destTitleX: number;
  sourcePanelRect: { x: number; y: number; width: number; height: number };
  destPanelRect: { x: number; y: number; width: number; height: number };
  sourcePositionsByIndex: Point[];
  destPositionsByIndex: Point[];
}

/** Compact side-by-side layout: source | thin trunk | destination (no half-screen dead zone). */
export function computeHubMatrixLayout(opts: {
  portsPerPanel: 12 | 24 | 48;
  columns: number;
  portWidth?: number;
  spacingX?: number;
  spacingY?: number;
}): HubMatrixLayout {
  const portWidth = opts.portWidth ?? 22;
  const spacingX = opts.spacingX ?? 8;
  const spacingY = opts.spacingY ?? 12;
  const rows = Math.ceil(opts.portsPerPanel / opts.columns);
  const gridW = opts.columns * (portWidth + spacingX) - spacingX;
  const gridH = rows * (portWidth + spacingY) - spacingY;

  const pad = 12;
  const headerH = 28;
  const trunkGap = 28;
  const yOffset = pad + headerH;

  const sourceX = pad;
  const trunkX = sourceX + gridW + trunkGap / 2;
  const destX = sourceX + gridW + trunkGap + pad;

  const sourceGrid = generatePanelGrid({
    xOffset: sourceX,
    yOffset,
    portsPerPanel: opts.portsPerPanel,
    columns: opts.columns,
    portWidth,
    spacingX,
    spacingY,
  });
  const destGrid = generatePanelGrid({
    xOffset: destX,
    yOffset,
    portsPerPanel: opts.portsPerPanel,
    columns: opts.columns,
    portWidth,
    spacingX,
    spacingY,
  });

  const width = destX + gridW + pad;
  const height = yOffset + gridH + pad;

  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    trunkX,
    sourceTitleX: sourceX + gridW / 2,
    destTitleX: destX + gridW / 2,
    sourcePanelRect: { x: sourceX - 4, y: pad, width: gridW + 8, height: gridH + headerH + 8 },
    destPanelRect: { x: destX - 4, y: pad, width: gridW + 8, height: gridH + headerH + 8 },
    sourcePositionsByIndex: sourceGrid.map((c) => ({ x: c.x, y: c.y })),
    destPositionsByIndex: destGrid.map((c) => ({ x: c.x, y: c.y })),
  };
}
