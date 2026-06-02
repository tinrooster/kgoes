import {
  formatDistanceFromFt,
  type MeasurementSystem,
} from "./measurementUnits";

/** Tower elevation always displays heights in feet for DET field work. */
export const TOWER_ELEVATION_DISPLAY_SYSTEM: MeasurementSystem = "imperial";

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

  let suffix = raw
    .replace(/^\d+[\d.]*\s*(?:m|ft|′|')\s*/i, "")
    .replace(/^\d+[\d.]*\s*(?:m|ft|′|')\s*[·\-–]\s*/i, "")
    .replace(/^[·\-–]\s*/, "")
    .trim();

  if (!suffix || suffix === raw) {
    if (/^\d+[\d.]*\s*(?:m|ft|′|')?\s*$/i.test(raw)) return height;
    return `${height} · ${raw}`;
  }
  return `${height} · ${suffix}`;
}
