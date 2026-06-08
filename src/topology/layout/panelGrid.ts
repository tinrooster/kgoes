import type { PortCoordinate } from "../domain/types";

export interface PanelLayoutConfig {
  xOffset: number;
  yOffset: number;
  portsPerPanel: 12 | 24 | 48;
  columns?: number;
  portWidth?: number;
  portHeight?: number;
  spacingX?: number;
  spacingY?: number;
}

/** Pixel centers for each port on a panel grid (1×12, 2×6, 1×24, 2×12). */
export function generatePanelGrid(config: PanelLayoutConfig): PortCoordinate[] {
  const {
    xOffset,
    yOffset,
    portsPerPanel,
    columns = portsPerPanel === 24 ? 12 : portsPerPanel === 48 ? 24 : 12,
    portWidth = 24,
    portHeight = 24,
    spacingX = 12,
    spacingY = 16,
  } = config;

  const coordinates: PortCoordinate[] = [];

  for (let i = 0; i < portsPerPanel; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = xOffset + col * (portWidth + spacingX) + portWidth / 2;
    const y = yOffset + row * (portHeight + spacingY) + portHeight / 2;
    coordinates.push({ portNumber: i + 1, x, y });
  }

  return coordinates;
}

export type GridLayoutPreset = "1x12" | "2x6" | "1x24" | "2x12";

export function columnsForGridPreset(
  portsPerPanel: 12 | 24 | 48,
  preset: GridLayoutPreset,
): number {
  switch (preset) {
    case "2x6":
      return 6;
    case "1x24":
      return 24;
    case "2x12":
      return 12;
    case "1x12":
    default:
      return portsPerPanel === 48 ? 24 : 12;
  }
}
