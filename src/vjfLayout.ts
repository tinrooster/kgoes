import type { FacePlateLayout, FacePlateLabel, Port } from "./types";

export interface VjfGridOptions {
  /** Ports in row-major order (top row first). */
  ports: Port[];
  colsPerRow: number;
  /** Panel title centered above grid (e.g. "HD ROUTER SOURCES"). */
  panelTitle?: string;
  /** Prefix for default port labels when port.label is generic (e.g. "Port "). */
  portLabelPrefix?: string;
}

/**
 * Build a 2-row (or N-row) VJF / patch-bay face-plate layout.
 * Port positions are percentages within the device face (0–100).
 */
export function buildVjfGridLayout(opts: VjfGridOptions): FacePlateLayout {
  const { ports, colsPerRow, panelTitle, portLabelPrefix = "Port " } = opts;
  const rows = Math.max(1, Math.ceil(ports.length / colsPerRow));
  const positions: Record<string, { x: number; y: number }> = {};
  const labels: FacePlateLabel[] = [];

  if (panelTitle) {
    labels.push({
      id: "panel-title",
      text: panelTitle,
      x: 50,
      y: 4,
    });
  }

  const topPad = panelTitle ? 12 : 8;
  const bottomPad = 6;
  const usableH = 100 - topPad - bottomPad;
  const rowH = usableH / rows;
  const colW = 100 / colsPerRow;

  for (let i = 0; i < ports.length; i++) {
    const row = Math.floor(i / colsPerRow);
    const col = i % colsPerRow;
    const p = ports[i];
    positions[p.id] = {
      x: colW * col + colW / 2,
      y: topPad + rowH * row + rowH * 0.55,
    };
    const num = i + 1;
    const displayLabel =
      p.label && !p.label.startsWith(portLabelPrefix.trim())
        ? p.label
        : `${num}`;
    labels.push({
      id: `lbl-${p.id}`,
      text: displayLabel,
      x: positions[p.id].x,
      y: topPad + rowH * row + rowH * 0.25,
    });
  }

  return {
    positions,
    labels,
    deviceLabel: { x: 50, y: panelTitle ? 7 : 6, fontSize: 10 },
  };
}

/** Standard 64-circuit VJF: 2 rows × 32 jacks (ports 1–32 top, 33–64 bottom). */
export function buildVjf64Layout(
  ports: Port[],
  panelTitle: string,
): FacePlateLayout {
  return buildVjfGridLayout({
    ports,
    colsPerRow: 32,
    panelTitle,
    portLabelPrefix: "Port ",
  });
}
