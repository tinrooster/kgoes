import type { CSSProperties, MouseEvent } from "react";

/** Label pills readable on light reference art (blueprint) while the app is in dark mode. */

export const LIGHT_ART_LABEL = {
  bg: "rgba(255, 255, 255, 0.94)",
  stroke: "rgba(15, 23, 42, 0.24)",
  ink: "#0f172a",
  accent: "#0369a1",
  muted: "#475569",
} as const;

export interface TowerDraftLabelLine {
  key: string;
  text: string;
  x?: number;
  y: number;
  fontSize: number;
  fontWeight?: number | string;
  fill: string;
  fontFamily?: string;
}

export function estimateSvgTextWidth(
  text: string,
  fontSize: number,
  fontWeight: number | string = 400,
): number {
  const weight = typeof fontWeight === "number" ? fontWeight : fontWeight === "bold" ? 700 : 400;
  const perChar = fontSize * (weight >= 600 ? 0.58 : 0.52);
  return Math.ceil(Math.max(text.length * perChar, fontSize * 2.2));
}

function labelLineBounds(line: TowerDraftLabelLine): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const x = line.x ?? 0;
  const width = estimateSvgTextWidth(line.text, line.fontSize, line.fontWeight ?? 400);
  const top = line.y - line.fontSize * 0.82;
  const height = line.fontSize * 1.08;
  return { x, y: top, width, height };
}

/** Rounded background behind one or more SVG text lines. */
export function TowerDraftLabelCard({
  lines,
  onLightArt,
}: {
  lines: TowerDraftLabelLine[];
  onLightArt: boolean;
}) {
  if (lines.length === 0) return null;

  const padX = 6;
  const padY = 4;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const line of lines) {
    const b = labelLineBounds(line);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  const bgX = minX - padX;
  const bgY = minY - padY;
  const bgW = maxX - minX + padX * 2;
  const bgH = maxY - minY + padY * 2;

  return (
    <g pointerEvents="none">
      <rect
        x={bgX}
        y={bgY}
        width={bgW}
        height={bgH}
        rx={4}
        fill={onLightArt ? LIGHT_ART_LABEL.bg : "var(--ti-surface)"}
        stroke={onLightArt ? LIGHT_ART_LABEL.stroke : "var(--ti-border)"}
        strokeWidth={1}
      />
      {lines.map((line) => (
        <text
          key={line.key}
          x={line.x ?? 0}
          y={line.y}
          fontSize={line.fontSize}
          fontWeight={line.fontWeight}
          fill={line.fill}
          fontFamily={line.fontFamily}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}

/** Single-line label with pill (guide-band ruler / level text). */
export function SvgTextWithPill({
  x,
  y,
  text,
  textAnchor = "start",
  fontSize,
  fontWeight = 400,
  fill,
  fontFamily,
  onLightArt,
  pointerEvents,
  style,
  onClick,
}: {
  x: number;
  y: number;
  text: string;
  textAnchor?: "start" | "end" | "middle";
  fontSize: number;
  fontWeight?: number | string;
  fill: string;
  fontFamily?: string;
  onLightArt: boolean;
  pointerEvents?: "none" | "all";
  style?: CSSProperties;
  onClick?: (ev: MouseEvent<SVGTextElement>) => void;
}) {
  const padX = 5;
  const padY = 3;
  const w = estimateSvgTextWidth(text, fontSize, fontWeight);
  const top = y - fontSize * 0.82;
  const h = fontSize * 1.08 + padY * 2;
  let rectX = x - padX;
  if (textAnchor === "end") rectX = x - w - padX;
  else if (textAnchor === "middle") rectX = x - w / 2 - padX;

  const bold =
    fontWeight === "bold" || (typeof fontWeight === "number" && fontWeight >= 600);
  const resolvedFill = onLightArt
    ? bold
      ? LIGHT_ART_LABEL.ink
      : fill.includes("muted")
        ? LIGHT_ART_LABEL.muted
        : LIGHT_ART_LABEL.ink
    : fill;

  return (
    <g pointerEvents={pointerEvents ?? "none"} style={style}>
      <rect
        x={rectX}
        y={top - padY}
        width={w + padX * 2}
        height={h}
        rx={3}
        fill={onLightArt ? LIGHT_ART_LABEL.bg : "var(--ti-surface)"}
        stroke={onLightArt ? LIGHT_ART_LABEL.stroke : "var(--ti-border)"}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="alphabetic"
        fontSize={fontSize}
        fontWeight={fontWeight}
        fill={resolvedFill}
        fontFamily={fontFamily}
        pointerEvents={pointerEvents}
        onClick={onClick}
      >
        {text}
      </text>
    </g>
  );
}
