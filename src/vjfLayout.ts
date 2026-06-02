import type { FacePlateLayout, FacePlateLabel, Port } from "./types";

export interface VjfGridOptions {
  /** Ports in row-major order (top row first). */
  ports: Port[];
  colsPerRow: number;
  /** Panel title centered above grid (e.g. "HD ROUTER SOURCES"). */
  panelTitle?: string;
  /** Prefix for default port labels when port.label is generic (e.g. "Port "). */
  portLabelPrefix?: string;
  /**
   * Emit a label only at the start of each group of this size.
   * Defaults to colsPerRow when ≤16 (every port labelled), or 8 for denser rows.
   * Use 1 to label every port regardless.
   */
  labelGroupSize?: number;
}

/**
 * Build a 2-row (or N-row) VJF / patch-bay face-plate layout.
 * Port positions are percentages within the device face (0–100).
 * For dense rows (>16 cols) labels are thinned to group boundaries to avoid overlap.
 */
export function buildVjfGridLayout(opts: VjfGridOptions): FacePlateLayout {
  const { ports, colsPerRow, panelTitle, portLabelPrefix = "Port " } = opts;
  const labelGroupSize = opts.labelGroupSize ?? (colsPerRow > 16 ? 8 : 1);
  const rows = Math.max(1, Math.ceil(ports.length / colsPerRow));
  const positions: Record<string, { x: number; y: number }> = {};
  const labels: FacePlateLabel[] = [];

  if (panelTitle) {
    labels.push({ id: "panel-title", text: panelTitle, x: 50, y: 4 });
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
    const cx = colW * col + colW / 2;
    const cy = topPad + rowH * row + rowH * 0.55;
    positions[p.id] = { x: cx, y: cy };

    const num = i + 1;
    const isGroupStart = labelGroupSize === 1 || (i % labelGroupSize === 0);
    if (isGroupStart) {
      const displayLabel =
        p.label && !p.label.startsWith(portLabelPrefix.trim())
          ? p.label
          : `${num}`;
      labels.push({
        id: `lbl-${p.id}`,
        text: displayLabel,
        x: cx,
        y: topPad + rowH * row + rowH * 0.2,
      });
    }
  }

  return {
    positions,
    labels,
    deviceLabel: { x: 50, y: panelTitle ? 7 : 6, fontSize: 10 },
  };
}

/** Standard 64-circuit VJF: 2 rows × 32 jacks (ports 1–32 top, 33–64 bottom). */
export function buildVjf64Layout(ports: Port[], panelTitle: string): FacePlateLayout {
  return buildVjfGridLayout({ ports, colsPerRow: 32, panelTitle, portLabelPrefix: "Port " });
}

/** 96-circuit VJF: 3 rows × 32 jacks. */
export function buildVjf96Layout(ports: Port[], panelTitle: string): FacePlateLayout {
  return buildVjfGridLayout({ ports, colsPerRow: 32, panelTitle, portLabelPrefix: "Port " });
}
