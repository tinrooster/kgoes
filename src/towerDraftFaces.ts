import type { DeviceData, TowerDraftPlacement } from "./types";
import type { TrackItTowerSiteContext } from "./types";
import {
  TOWER_DRAFT_ALL_FACES_COL_W,
  TOWER_DRAFT_PAD_X,
  TOWER_DRAFT_RULER_W,
  towerDraftTowerCenterX,
} from "./towerDraftUtils";

export type TowerFace = "N" | "S" | "E" | "W";

export type TowerElevationView = "profile" | "all-faces" | TowerFace;

export const TOWER_FACE_ORDER: TowerFace[] = ["N", "E", "S", "W"];

export const TOWER_FACE_LABELS: Record<TowerFace, string> = {
  N: "North",
  S: "South",
  E: "East",
  W: "West",
};

/** Map compass azimuth (0° = north) to tower face bearing. */
export function azimuthToTowerFace(azimuthDeg: number): TowerFace {
  const n = ((azimuthDeg % 360) + 360) % 360;
  if (n >= 315 || n < 45) return "N";
  if (n >= 45 && n < 135) return "E";
  if (n >= 135 && n < 225) return "S";
  return "W";
}

export function resolvePlacementAzimuthDeg(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  context?: TrackItTowerSiteContext | null,
): number | undefined {
  if (data?.rfInstallation?.azimuthDeg != null) return data.rfInstallation.azimuthDeg;
  if (placement.plantLocationId) {
    const level = context?.antennaLevels.find((l) => l.id === placement.plantLocationId);
    if (level?.azimuthDeg != null) return level.azimuthDeg;
  }
  return undefined;
}

/** Explicit face override, else derived from azimuth; undefined = profile-only / unassigned. */
export function resolvePlacementTowerFace(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  context?: TrackItTowerSiteContext | null,
): TowerFace | undefined {
  if (placement.towerFace) return placement.towerFace;
  const az = resolvePlacementAzimuthDeg(placement, data, context);
  if (az == null) return undefined;
  return azimuthToTowerFace(az);
}

export function placementVisibleInView(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  view: TowerElevationView,
  context?: TrackItTowerSiteContext | null,
): boolean {
  if (view === "profile") return true;
  if (view === "all-faces") {
    return resolvePlacementTowerFace(placement, data, context) != null;
  }
  return resolvePlacementTowerFace(placement, data, context) === view;
}

export function towerFaceColumnCenterX(face: TowerFace): number {
  const idx = TOWER_FACE_ORDER.indexOf(face);
  const startX = TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X;
  return startX + idx * TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_W / 2;
}

export function towerDraftContentWidthForView(view: TowerElevationView): number {
  if (view === "all-faces") {
    return (
      TOWER_DRAFT_RULER_W +
      TOWER_DRAFT_PAD_X +
      TOWER_FACE_ORDER.length * TOWER_DRAFT_ALL_FACES_COL_W +
      80
    );
  }
  return TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X + 80 + 420;
}

/** Resolve column center for a placement in the current view. */
export function placementCenterX(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  view: TowerElevationView,
  context?: TrackItTowerSiteContext | null,
): number {
  if (view === "all-faces") {
    const face = resolvePlacementTowerFace(placement, data, context);
    if (!face) return towerDraftTowerCenterX();
    return towerFaceColumnCenterX(face);
  }
  return towerDraftTowerCenterX();
}

/** Pick tower face from canvas X in all-faces view. */
export function towerFaceAtContentX(x: number): TowerFace | undefined {
  const startX = TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X;
  const idx = Math.floor((x - startX) / TOWER_DRAFT_ALL_FACES_COL_W);
  if (idx < 0 || idx >= TOWER_FACE_ORDER.length) return undefined;
  return TOWER_FACE_ORDER[idx];
}

/** Which face column a single-face view represents (undefined for profile / all-faces). */
export function activeViewFace(view: TowerElevationView): TowerFace | undefined {
  if (view === "profile" || view === "all-faces") return undefined;
  return view;
}

/** 0° azimuth = boresight along concave opening (+X in glyph space). */
const AIM_GLYPH_BASE_DEG = 0;

function isAimableDeviceType(deviceType: string | undefined): boolean {
  return (
    deviceType === "microwave-dish" ||
    deviceType === "microwave-horn" ||
    deviceType === "microwave-odu" ||
    deviceType === "outdoor-ptz-camera" ||
    deviceType === "camera" ||
    deviceType === "ptz-camera"
  );
}

/**
 * Rotation (deg) for aimable glyphs — absolute compass aim on canvas.
 * Moving between tower faces or views does not spin the icon; only azimuth / flip change aim.
 */
export function aimableGlyphRotationDeg(
  deviceType: string | undefined,
  azimuthDeg: number | undefined,
  _view: TowerElevationView,
  _viewFace?: TowerFace,
  _placementFace?: TowerFace,
  mountFlip?: boolean,
): number | undefined {
  if (azimuthDeg == null || !isAimableDeviceType(deviceType)) return undefined;
  let rotation = azimuthDeg - AIM_GLYPH_BASE_DEG;
  if (mountFlip) rotation += 180;
  return rotation;
}

export function isAimableTowerDeviceType(deviceType: string | undefined): boolean {
  return isAimableDeviceType(deviceType);
}
