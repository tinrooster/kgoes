import type { TowerDraftPage, TowerGuideBandFt, TrackItTowerSiteContext } from "./types";
import { defaultGuideBands } from "./towerDraftUtils";

/** Typical DET mountaintop guyed/self-support range (ft AGL). */
export const TOWER_ELEVATION_HEIGHT_DEFAULT_FT = 180;
export const TOWER_ELEVATION_HEIGHT_MIN_FT = 50;
export const TOWER_ELEVATION_HEIGHT_MAX_FT = 1200;

/** At and above this height, use tall-tower viewport + generated profile (not Sutro reference art). */
export const TALL_TOWER_FORMAT_THRESHOLD_FT = 900;

const TALL_FACE_LAYOUT_RATIO = 0.78;
const TALL_INITIAL_FOCUS_RATIO = 0.65;

export interface TowerElevationSetupOptions {
  heightFtAgl: number;
  latitude?: number;
  longitude?: number;
  accessNotes?: string;
  details?: string;
}

/** @deprecated Use TALL_TOWER_FORMAT_THRESHOLD_FT */
export const SUTRO_FORMAT_THRESHOLD_FT = TALL_TOWER_FORMAT_THRESHOLD_FT;

export function clampTowerElevationHeightFt(raw: number): number {
  if (!Number.isFinite(raw)) return TOWER_ELEVATION_HEIGHT_DEFAULT_FT;
  return Math.round(Math.max(TOWER_ELEVATION_HEIGHT_MIN_FT, Math.min(TOWER_ELEVATION_HEIGHT_MAX_FT, raw)));
}

export function usesTallTowerFormatting(heightFtAgl: number): boolean {
  return clampTowerElevationHeightFt(heightFtAgl) >= TALL_TOWER_FORMAT_THRESHOLD_FT;
}

/** @deprecated Use usesTallTowerFormatting */
export function usesSutroStructuralFormatting(heightFtAgl: number): boolean {
  return usesTallTowerFormatting(heightFtAgl);
}

export function buildGuideBandsForHeight(heightFtAgl: number): TowerGuideBandFt[] {
  return defaultGuideBands(clampTowerElevationHeightFt(heightFtAgl));
}

/** True when guide-band labels use generic Sutro L2–L6 naming on a non-Sutro page. */
export function hasGenericSutroLevelGuideLabels(bands: TowerGuideBandFt[] | undefined): boolean {
  return (bands ?? []).some((b) => /\bL[2-6]\b/.test(b.label ?? ""));
}

/** Replace mistaken Sutro level labels with quartile bands for standalone tall towers. */
export function migrateGenericTowerGuideBands(page: TowerDraftPage): TowerDraftPage {
  const pageHasSutroLabels = hasGenericSutroLevelGuideLabels(page.guideBandsFt);
  const viewportHasSutroLabels = hasGenericSutroLevelGuideLabels(
    page.elevationViewport?.guideBandsFt as TowerGuideBandFt[] | undefined,
  );
  if (!pageHasSutroLabels && !viewportHasSutroLabels) return page;
  if (page.elevationReferenceImage?.url?.trim()) return page;

  const height = clampTowerElevationHeightFt(page.towerHeightFtAgl);
  const guideBandsFt = buildGuideBandsForHeight(height);
  const { guideBandsFt: _removed, ...elevationViewportRest } = page.elevationViewport ?? {};
  const elevationViewport =
    page.elevationViewport && viewportHasSutroLabels
      ? Object.keys(elevationViewportRest).length > 0
        ? elevationViewportRest
        : undefined
      : page.elevationViewport;

  return {
    ...page,
    guideBandsFt: pageHasSutroLabels ? guideBandsFt : page.guideBandsFt,
    elevationViewport,
  };
}

export function buildElevationViewportForHeight(
  heightFtAgl: number,
): NonNullable<TrackItTowerSiteContext["elevationViewport"]> {
  const h = clampTowerElevationHeightFt(heightFtAgl);
  if (usesTallTowerFormatting(h)) {
    return {
      tallTowerMode: true,
      defaultViewportSpanFt: 120,
      initialFocusFtAgl: Math.round(h * TALL_INITIAL_FOCUS_RATIO),
      workingZoomRatio: 1,
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

export function towerSetupOptionsFromPage(page: TowerDraftPage): TowerElevationSetupOptions {
  return {
    heightFtAgl: page.towerHeightFtAgl,
    latitude: page.siteSetup?.latitude,
    longitude: page.siteSetup?.longitude,
    accessNotes: page.siteSetup?.accessNotes,
    details: page.siteSetup?.details,
  };
}

/** Map setup dialog values onto tower-draft page fields for create / update. */
export function buildTowerDraftPageOptsFromSetup(
  setup: TowerElevationSetupOptions,
): Partial<Omit<TowerDraftPage, "id" | "label" | "type" | "placements" | "polylines">> {
  const heightFtAgl = clampTowerElevationHeightFt(setup.heightFtAgl);
  const guideBandsFt = buildGuideBandsForHeight(heightFtAgl);
  const tallFormat = usesTallTowerFormatting(heightFtAgl);

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
    elevationViewport: buildElevationViewportForHeight(heightFtAgl),
    ...(tallFormat
      ? {
          profileVisual: "generated_self_support" as const,
          faceLayoutHeightFtAgl: Math.round(heightFtAgl * TALL_FACE_LAYOUT_RATIO),
        }
      : {
          profileVisual: undefined,
          faceLayoutHeightFtAgl: undefined,
        }),
  };
}

export function defaultTowerElevationSetupOptions(): TowerElevationSetupOptions {
  return { heightFtAgl: TOWER_ELEVATION_HEIGHT_DEFAULT_FT };
}
