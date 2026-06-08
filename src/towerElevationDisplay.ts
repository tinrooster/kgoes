import {
  formatDistanceFromFt,
  type MeasurementSystem,
} from "./measurementUnits";

/** Tower elevation always displays heights in feet for DET field work. */
export const TOWER_ELEVATION_DISPLAY_SYSTEM: MeasurementSystem = "imperial";

function guideBandLabelSuffix(raw: string): string {
  return raw
    .replace(/^\d+[\d.]*\s*(?:m|ft|′|')\s*/i, "")
    .replace(/^\d+[\d.]*\s*(?:m|ft|′|')\s*[·\-–]\s*/i, "")
    .replace(/^[·\-–]\s*/, "")
    .trim();
}

/** Structural / level description without the leading height (for split ruler layout). */
export function formatGuideBandLabelSuffix(
  band: { ftAgl: number; label?: string },
): string | null {
  const raw = band.label?.trim() ?? "";
  if (!raw) return null;
  if (band.ftAgl === 0) {
    if (/^base\b/i.test(raw)) {
      const tail = raw.replace(/^base\s*[·\-–]\s*/i, "").trim();
      return tail || null;
    }
    return raw;
  }
  const suffix = guideBandLabelSuffix(raw);
  if (!suffix || suffix === raw) {
    if (/^\d+[\d.]*\s*(?:m|ft|′|')?\s*$/i.test(raw)) return null;
    return raw;
  }
  return suffix;
}

/** Ruler / guide-band text: height from ft AGL + structural suffix (never stale metric labels). */
export function formatGuideBandElevationLabel(
  band: { ftAgl: number; label?: string },
  system: MeasurementSystem = TOWER_ELEVATION_DISPLAY_SYSTEM,
): string {
  if (band.ftAgl === 0) {
    const raw = band.label?.trim();
    if (raw && /amsl/i.test(raw)) return raw;
    return "Base";
  }
  const height = formatDistanceFromFt(band.ftAgl, system);
  const raw = band.label?.trim() ?? "";
  if (!raw) return height;

  const suffix = guideBandLabelSuffix(raw);
  if (!suffix || suffix === raw) {
    if (/^\d+[\d.]*\s*(?:m|ft|′|')?\s*$/i.test(raw)) return height;
    return `${height} · ${raw}`;
  }
  return `${height} · ${suffix}`;
}

/** Profile elevation: short height on the ruler, level text to the right (avoids left-edge clip). */
export function formatGuideBandRulerHeightLabel(
  band: { ftAgl: number; label?: string },
  system: MeasurementSystem = TOWER_ELEVATION_DISPLAY_SYSTEM,
): string {
  if (band.ftAgl === 0) return "Base";
  return formatDistanceFromFt(band.ftAgl, system);
}
