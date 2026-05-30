/** Canonical measurement preference — aligns with trackIT (metric source data). */
export type MeasurementSystem = "metric" | "imperial";

export const M_TO_FT = 3.280839895;
export const FT_TO_M = 1 / M_TO_FT;

export function ftToM(ft: number): number {
  return ft * FT_TO_M;
}

export function mToFt(m: number): number {
  return m * M_TO_FT;
}

export function parseMeasurementSystem(raw: unknown): MeasurementSystem {
  return raw === "imperial" ? "imperial" : "metric";
}

export function measurementSystemFromDistanceUnit(unit: "m" | "ft" | undefined): MeasurementSystem {
  return unit === "ft" ? "imperial" : "metric";
}

export function distanceUnitFromMeasurementSystem(system: MeasurementSystem): "m" | "ft" {
  return system === "imperial" ? "ft" : "m";
}

/** Tower-draft heights are stored as ft AGL internally. */
export function formatHeightFtAgl(ftAgl: number, system: MeasurementSystem, opts?: { suffix?: boolean }): string {
  if (system === "imperial") {
    const suffix = opts?.suffix !== false ? " AGL" : "";
    return `${Math.round(ftAgl)}′${suffix}`;
  }
  const m = ftToM(ftAgl);
  const suffix = opts?.suffix !== false ? " AGL" : "";
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} m${suffix}`;
}

export function formatHeightM(valueM: number | undefined, system: MeasurementSystem): string {
  if (valueM == null || Number.isNaN(valueM)) return "—";
  if (system === "imperial") return `${Math.round(mToFt(valueM))}′`;
  return `${valueM.toFixed(1)} m`;
}

export function formatDistanceFromFt(ft: number, system: MeasurementSystem): string {
  if (system === "imperial") return `${Math.round(ft)}′`;
  const m = ftToM(ft);
  if (m < 10) return `${m.toFixed(1)} m`;
  return `${Math.round(m)} m`;
}

export function formatDishDiameter(diameterM: number, system: MeasurementSystem): string {
  if (system === "imperial") {
    const ft = mToFt(diameterM);
    const rounded = Math.abs(ft - Math.round(ft)) < 0.05 ? Math.round(ft) : ft.toFixed(1);
    return `${rounded}′`;
  }
  if (diameterM < 1) return `${(diameterM * 100).toFixed(0)} cm`;
  return `${diameterM.toFixed(2)} m`;
}
