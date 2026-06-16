import type { TowerDraftPage, TowerGuideBandFt, TrackItTowerSiteContext } from "./types";
import { defaultGuideBands } from "./towerDraftUtils";

/** Typical DET mountaintop guyed/self-support range (ft AGL). */
export const TOWER_ELEVATION_HEIGHT_DEFAULT_FT = 180;
export const TOWER_ELEVATION_HEIGHT_MIN_FT = 50;
export const TOWER_ELEVATION_HEIGHT_MAX_FT = 1200;

/** At and above this height, use Sutro-style structural guide bands (generic tower body). */
export const SUTRO_FORMAT_THRESHOLD_FT = 900;

/** Sutro Tower L2–L6 ratios (977 ft reference) — scaled to user height without reference art. */
const SUTRO_STRUCTURAL_LEVELS: { ratio: number; suffix: string }[] = [
  { ratio: 762 / 977, suffix: "L6 — 6th level" },
  { ratio: 630 / 977, suffix: "L5 — 5th level" },
  { ratio: 558 / 977, suffix: "L4 — waist" },
  { ratio: 372 / 977, suffix: "L3 — 3rd level" },
  { ratio: 186 / 977, suffix: "L2 — 2nd level" },
];

const SUTRO_FACE_LAYOUT_RATIO = 762 / 977;
const SUTRO_INITIAL_FOCUS_RATIO = 630 / 977;

export interface TowerElevationSetupOptions {
  heightFtAgl: number;
  latitude?: number;
  longitude?: number;
  accessNotes?: string;
  details?: string;
}

export function clampTowerElevationHeightFt(raw: number): number {
  if (!Number.isFinite(raw)) return TOWER_ELEVATION_HEIGHT_DEFAULT_FT;
  return Math.round(Math.max(TOWER_ELEVATION_HEIGHT_MIN_FT, Math.min(TOWER_ELEVATION_HEIGHT_MAX_FT, raw)));
}

export function usesSutroStructuralFormatting(heightFtAgl: number): boolean {
  return clampTowerElevationHeightFt(heightFtAgl) >= SUTRO_FORMAT_THRESHOLD_FT;
}

export function buildSutroStructuralGuideBands(heightFtAgl: number): TowerGuideBandFt[] {
  const h = clampTowerElevationHeightFt(heightFtAgl);
  const bands: TowerGuideBandFt[] = SUTRO_STRUCTURAL_LEVELS.map(({ ratio, suffix }) => {
    const ftAgl = Math.round(h * ratio);
    return { ftAgl, label: `${ftAgl}′ · ${suffix}` };
  });
  bands.push({ ftAgl: 0, label: "Base" });
  return bands.sort((a, b) => b.ftAgl - a.ftAgl);
}

export function buildGuideBandsForHeight(heightFtAgl: number): TowerGuideBandFt[] {
  const h = clampTowerElevationHeightFt(heightFtAgl);
  if (usesSutroStructuralFormatting(h)) return buildSutroStructuralGuideBands(h);
  return defaultGuideBands(h);
}

export function buildElevationViewportForHeight(
  heightFtAgl: number,
  guideBandsFt: TowerGuideBandFt[],
): NonNullable<TrackItTowerSiteContext["elevationViewport"]> {
  const h = clampTowerElevationHeightFt(heightFtAgl);
  if (usesSutroStructuralFormatting(h)) {
    return {
      tallTowerMode: true,
      defaultViewportSpanFt: 120,
      initialFocusFtAgl: Math.round(h * SUTRO_INITIAL_FOCUS_RATIO),
      workingZoomRatio: 1,
      guideBandsFt,
    };
  }
  if (h > 300) {
    return {
      tallTowerMode: true,
      defaultViewportSpanFt: 140,
      initialFocusFtAgl: Math.round(h * 0.6),
      workingZoomRatio: 1,
    };
  }
  return { tallTowerMode: false };
}

export function validateTowerElevationSetup(
  setup: TowerElevationSetupOptions,
): { ok: true } | { ok: false; message: string } {
  const h = setup.heightFtAgl;
  if (!Number.isFinite(h)) {
    return { ok: false, message: "Enter a valid tower height." };
  }
  if (h < TOWER_ELEVATION_HEIGHT_MIN_FT || h > TOWER_ELEVATION_HEIGHT_MAX_FT) {
    return {
      ok: false,
      message: `Height must be between ${TOWER_ELEVATION_HEIGHT_MIN_FT}′ and ${TOWER_ELEVATION_HEIGHT_MAX_FT}′.`,
    };
  }
  if (setup.latitude != null && (!Number.isFinite(setup.latitude) || setup.latitude < -90 || setup.latitude > 90)) {
    return { ok: false, message: "Latitude must be between −90 and 90." };
  }
  if (
    setup.longitude != null &&
    (!Number.isFinite(setup.longitude) || setup.longitude < -180 || setup.longitude > 180)
  ) {
    return { ok: false, message: "Longitude must be between −180 and 180." };
  }
  return { ok: true };
}

/** Map setup dialog values onto tower-draft page fields for `addTowerDraftPage`. */
export function buildTowerDraftPageOptsFromSetup(
  setup: TowerElevationSetupOptions,
): Partial<Omit<TowerDraftPage, "id" | "label" | "type" | "placements" | "polylines">> {
  const heightFtAgl = clampTowerElevationHeightFt(setup.heightFtAgl);
  const guideBandsFt = buildGuideBandsForHeight(heightFtAgl);
  const sutroFormat = usesSutroStructuralFormatting(heightFtAgl);

  const latitude = setup.latitude != null && Number.isFinite(setup.latitude) ? setup.latitude : undefined;
  const longitude =
    setup.longitude != null && Number.isFinite(setup.longitude) ? setup.longitude : undefined;
  const accessNotes = setup.accessNotes?.trim() || undefined;
  const details = setup.details?.trim() || undefined;

  const siteSetup =
    latitude != null || longitude != null || accessNotes || details
      ? { latitude, longitude, accessNotes, details }
      : undefined;

  return {
    towerHeightFtAgl: heightFtAgl,
    towerType: "self_support",
    guideBandsFt,
    siteSetup,
    elevationViewport: buildElevationViewportForHeight(heightFtAgl, guideBandsFt),
    ...(sutroFormat
      ? {
          profileVisual: "generated_self_support" as const,
          faceLayoutHeightFtAgl: Math.round(heightFtAgl * SUTRO_FACE_LAYOUT_RATIO),
        }
      : {}),
  };
}

export function defaultTowerElevationSetupOptions(): TowerElevationSetupOptions {
  return { heightFtAgl: TOWER_ELEVATION_HEIGHT_DEFAULT_FT };
}
