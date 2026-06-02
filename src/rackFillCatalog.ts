/**
 * Default 19" rack filler panel catalog for fill-order presets.
 * Part numbers and costs are placeholders — adjust to your vendor / CMDB.
 */

export type FillPanelKind = "blank" | "vent";

export interface FillPanelSku {
  kind: FillPanelKind;
  heightU: number;
  partNumber: string;
  description: string;
  /** Estimated unit cost (USD) for BOM rollup. */
  unitCostUsd: number;
  /** Rack screws (typically 10–32 cage screw + clip nut pairs per panel face). */
  screwsEach: number;
  cageNutsEach: number;
}

export const DEFAULT_BLANK_SIZES_U = [6, 4, 2, 1] as const;

export const RACK_FILL_PANEL_CATALOG: FillPanelSku[] = [
  {
    kind: "blank",
    heightU: 6,
    partNumber: "RP6U-BLK-19",
    description: "6U blank panel, 19 in",
    unitCostUsd: 48,
    screwsEach: 8,
    cageNutsEach: 8,
  },
  {
    kind: "blank",
    heightU: 4,
    partNumber: "RP4U-BLK-19",
    description: "4U blank panel, 19 in",
    unitCostUsd: 32,
    screwsEach: 6,
    cageNutsEach: 6,
  },
  {
    kind: "blank",
    heightU: 2,
    partNumber: "RP2U-BLK-19",
    description: "2U blank panel, 19 in",
    unitCostUsd: 18,
    screwsEach: 4,
    cageNutsEach: 4,
  },
  {
    kind: "blank",
    heightU: 1,
    partNumber: "RP1U-BLK-19",
    description: "1U blank panel, 19 in",
    unitCostUsd: 12,
    screwsEach: 4,
    cageNutsEach: 4,
  },
  {
    kind: "vent",
    heightU: 2,
    partNumber: "RP2U-VNT-19",
    description: "2U vent panel, 19 in",
    unitCostUsd: 28,
    screwsEach: 4,
    cageNutsEach: 4,
  },
  {
    kind: "vent",
    heightU: 1,
    partNumber: "RP1U-VNT-19",
    description: "1U vent panel, 19 in",
    unitCostUsd: 18,
    screwsEach: 4,
    cageNutsEach: 4,
  },
];

export function skuForFillPanel(kind: FillPanelKind, heightU: number): FillPanelSku {
  const hit = RACK_FILL_PANEL_CATALOG.find((s) => s.kind === kind && s.heightU === heightU);
  if (hit) return hit;
  const fallback: FillPanelSku = {
    kind,
    heightU,
    partNumber: kind === "vent" ? `RP${heightU}U-VNT-19` : `RP${heightU}U-BLK-19`,
    description: `${heightU}U ${kind} panel, 19 in`,
    unitCostUsd: 12 * heightU,
    screwsEach: 4,
    cageNutsEach: 4,
  };
  return fallback;
}

export interface FillOrderLineItem {
  kind: FillPanelKind;
  heightU: number;
  qty: number;
  partNumber: string;
  description: string;
  unitCostUsd: number;
  screwsEach: number;
  cageNutsEach: number;
  lineCostUsd: number;
  lineScrews: number;
  lineCageNuts: number;
}

export interface FillOrderSummary {
  lines: FillOrderLineItem[];
  /** Total rack U covered by panels. */
  totalU: number;
  totalPanels: number;
  totalScrews: number;
  totalCageNuts: number;
  estimatedCostUsd: number;
  /** @deprecated Use lines — kept for quick display */
  blank: number;
  /** @deprecated Use lines */
  vent: number;
}

export function rollupFillOrderLines(
  placements: Array<{ kind: FillPanelKind; heightU: number }>,
): FillOrderSummary {
  const tally = new Map<string, { sku: FillPanelSku; qty: number }>();
  let totalU = 0;

  for (const p of placements) {
    const sku = skuForFillPanel(p.kind, p.heightU);
    const key = `${p.kind}:${p.heightU}`;
    const prev = tally.get(key);
    if (prev) prev.qty += 1;
    else tally.set(key, { sku, qty: 1 });
    totalU += p.heightU;
  }

  const lines: FillOrderLineItem[] = [...tally.values()]
    .sort((a, b) => {
      if (a.sku.kind !== b.sku.kind) return a.sku.kind === "vent" ? 1 : -1;
      return b.sku.heightU - a.sku.heightU;
    })
    .map(({ sku, qty }) => ({
      kind: sku.kind,
      heightU: sku.heightU,
      qty,
      partNumber: sku.partNumber,
      description: sku.description,
      unitCostUsd: sku.unitCostUsd,
      screwsEach: sku.screwsEach,
      cageNutsEach: sku.cageNutsEach,
      lineCostUsd: Math.round(sku.unitCostUsd * qty * 100) / 100,
      lineScrews: sku.screwsEach * qty,
      lineCageNuts: sku.cageNutsEach * qty,
    }));

  let blank = 0;
  let vent = 0;
  let totalPanels = 0;
  let totalScrews = 0;
  let totalCageNuts = 0;
  let estimatedCostUsd = 0;
  for (const line of lines) {
    totalPanels += line.qty;
    totalScrews += line.lineScrews;
    totalCageNuts += line.lineCageNuts;
    estimatedCostUsd += line.lineCostUsd;
    if (line.kind === "blank") blank += line.qty;
    else vent += line.qty;
  }

  return {
    lines,
    totalU,
    totalPanels,
    totalScrews,
    totalCageNuts,
    estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
    blank,
    vent,
  };
}

/** Accept current BOM shape or legacy `{ blank, vent, totalU }` from older presets. */
export function normalizeFillOrderSummary(raw: unknown): FillOrderSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.lines)) {
    const lines = o.lines as FillOrderLineItem[];
    if (lines.length === 0) return null;
    const totalPanels =
      typeof o.totalPanels === "number"
        ? o.totalPanels
        : lines.reduce((s, l) => s + l.qty, 0);
    const totalU =
      typeof o.totalU === "number"
        ? o.totalU
        : lines.reduce((s, l) => s + l.heightU * l.qty, 0);
    const totalScrews =
      typeof o.totalScrews === "number"
        ? o.totalScrews
        : lines.reduce((s, l) => s + l.lineScrews, 0);
    const totalCageNuts =
      typeof o.totalCageNuts === "number"
        ? o.totalCageNuts
        : lines.reduce((s, l) => s + l.lineCageNuts, 0);
    const estimatedCostUsd =
      typeof o.estimatedCostUsd === "number"
        ? o.estimatedCostUsd
        : lines.reduce((s, l) => s + l.lineCostUsd, 0);
    let blank = 0;
    let vent = 0;
    for (const line of lines) {
      if (line.kind === "blank") blank += line.qty;
      else vent += line.qty;
    }
    return {
      lines,
      totalU,
      totalPanels,
      totalScrews,
      totalCageNuts,
      estimatedCostUsd,
      blank: typeof o.blank === "number" ? o.blank : blank,
      vent: typeof o.vent === "number" ? o.vent : vent,
    };
  }

  const blank = Number(o.blank) || 0;
  const vent = Number(o.vent) || 0;
  if (blank === 0 && vent === 0) return null;

  const placements: Array<{ kind: FillPanelKind; heightU: number }> = [];
  for (let i = 0; i < blank; i += 1) placements.push({ kind: "blank", heightU: 1 });
  for (let i = 0; i < vent; i += 1) placements.push({ kind: "vent", heightU: 1 });
  const summary = rollupFillOrderLines(placements);
  if (typeof o.totalU === "number") summary.totalU = o.totalU;
  return summary;
}

export function formatFillOrderPlainText(summary: FillOrderSummary): string {
  const bom = normalizeFillOrderSummary(summary) ?? summary;
  const header = ["Qty", "RU", "P/N", "Description", "Unit $", "Ext $", "Screws", "Cage nuts"];
  const rows = bom.lines.map((l) => [
    String(l.qty),
    String(l.heightU),
    l.partNumber,
    l.description,
    l.unitCostUsd.toFixed(2),
    l.lineCostUsd.toFixed(2),
    String(l.lineScrews),
    String(l.lineCageNuts),
  ]);
  const table = [header, ...rows].map((r) => r.join("\t")).join("\n");
  return [
    table,
    "",
    `Panels: ${bom.totalPanels} · ${bom.totalU}U · screws ${bom.totalScrews} · cage nuts ${bom.totalCageNuts} · est. $${bom.estimatedCostUsd.toFixed(2)}`,
  ].join("\n");
}

export function formatFillOrderShort(summary: FillOrderSummary): string {
  const bom = normalizeFillOrderSummary(summary) ?? summary;
  if (!bom.lines?.length) {
    return `${bom.blank}× blank, ${bom.vent}× vent · ${bom.totalU}U`;
  }
  const parts = bom.lines.map((l) => `${l.qty}× ${l.heightU}U ${l.kind}`);
  return `${parts.join(", ")} · ${bom.totalU}U · ~$${bom.estimatedCostUsd.toFixed(0)}`;
}
