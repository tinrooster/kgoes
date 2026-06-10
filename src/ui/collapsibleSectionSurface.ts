import type { CSSProperties } from "react";

/** Pastel section fills — matches tower mount editor (sky mount block, sand RF block). */
export type SectionTint = "sky" | "sand" | "sage" | "slate";
export type CollapsibleSectionDepth = 0 | 1 | 2;

export const SECTION_TINT_ORDER: SectionTint[] = ["sky", "sand", "sage", "slate"];

const TINT_RGB: Record<SectionTint, string> = {
  sky: "#7dd3fc",
  sand: "#d4a574",
  sage: "#86efac",
  slate: "#94a3b8",
};

export function sectionTintFromPersistKey(key?: string, fallbackIndex = 0): SectionTint {
  if (!key) return SECTION_TINT_ORDER[fallbackIndex % SECTION_TINT_ORDER.length]!;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % SECTION_TINT_ORDER.length;
  }
  return SECTION_TINT_ORDER[hash]!;
}

function mix(color: string, pct: number, base: string): string {
  return `color-mix(in oklab, ${color} ${pct}%, ${base})`;
}

const DEPTH_TITLE: Record<CollapsibleSectionDepth, string> = {
  0: "text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-heading)]",
  1: "text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-heading)]",
  2: "text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]",
};

const DEPTH_WRAPPER: Record<CollapsibleSectionDepth, string> = {
  0: "rounded-lg border overflow-hidden shadow-sm",
  1: "ml-3 pl-2 border-l-2 rounded-r-md overflow-hidden",
  2: "ml-5 pl-2 border-l rounded-r-md overflow-hidden",
};

const DEPTH_BODY_PAD: Record<CollapsibleSectionDepth, string> = {
  0: "px-3 py-3",
  1: "mt-1.5 pl-1 pr-0.5 py-2",
  2: "mt-1 pl-1 py-1.5",
};

/** Inline styles for light tinted section fills. */
export function collapsibleSectionSurfaceStyle(
  tint: SectionTint,
  depth: CollapsibleSectionDepth,
): { wrapper: CSSProperties; header: CSSProperties; body: CSSProperties; titleClass: string; bodyClass: string; wrapperClass: string } {
  const rgb = TINT_RGB[tint];
  const surface = "var(--color-surface)";
  const bg = "var(--color-bg)";
  const border = "var(--color-border)";

  const fillPct = depth === 0 ? 14 : depth === 1 ? 10 : 7;
  const headerPct = depth === 0 ? 22 : depth === 1 ? 16 : 12;
  const borderPct = depth === 0 ? 28 : depth === 1 ? 22 : 18;

  return {
    wrapperClass: DEPTH_WRAPPER[depth],
    titleClass: DEPTH_TITLE[depth],
    bodyClass: DEPTH_BODY_PAD[depth],
    wrapper: {
      borderColor: mix(rgb, borderPct, border),
      background: mix(rgb, fillPct, depth === 0 ? surface : bg),
      ...(depth >= 1 ? { borderLeftColor: mix(rgb, 35, border) } : {}),
    },
    header: {
      background: mix(rgb, headerPct, surface),
      borderBottom: depth === 0 ? `1px solid ${mix(rgb, 18, border)}` : undefined,
      border: depth >= 1 ? `1px solid ${mix(rgb, borderPct, border)}` : undefined,
    },
    body: {
      background: mix(rgb, depth === 0 ? 8 : 5, bg),
    },
  };
}

export { TINT_RGB };
