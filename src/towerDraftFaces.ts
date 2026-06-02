import type { DeviceData, TowerDraftPlacement, TowerElevationReferenceImage } from "./types";
import type { TrackItTowerSiteContext } from "./types";
import { profileContentWidthForReference } from "./towerElevationReference";
import {
  TOWER_DRAFT_ALL_FACES_COL_GAP,
  TOWER_DRAFT_ALL_FACES_COL_START,
  TOWER_DRAFT_ALL_FACES_COL_W,
  TOWER_DRAFT_PAD_X,
  TOWER_DRAFT_RULER_W,
  towerDraftTowerCenterX,
} from "./towerDraftUtils";

export type TowerFace = "N" | "S" | "E" | "W";

export type TowerElevationView = "profile" | "all-faces" | "site" | TowerFace;

/** Design toolbar: Profile · All faces · Site plan */
export type TowerMainView = "profile" | "faces" | "site";

export type TowerFaceFilter = "All" | TowerFace;

export const TOWER_FACE_ORDER: TowerFace[] = ["N", "E", "S", "W"];

/** Profile, all-faces, or single-face — not site plan. */
export function isTowerSectionElevationView(view: TowerElevationView): boolean {
  return view !== "site";
}

/** Horizontal center for tall-tower pan/zoom (per view layout). */
export function towerSectionPanCenterX(
  view: TowerElevationView,
  profileCenterX: number,
): number {
  if (view === "all-faces") {
    const pitch = TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_GAP;
    const start = TOWER_DRAFT_ALL_FACES_COL_START + TOWER_DRAFT_ALL_FACES_COL_W / 2;
    const end = start + (TOWER_FACE_ORDER.length - 1) * pitch;
    return (start + end) / 2;
  }
  const face = activeViewFace(view);
  if (face) return towerFaceColumnCenterX(face);
  return profileCenterX;
}

export function towerElevationViewFrom(
  main: TowerMainView,
  face: TowerFaceFilter,
): TowerElevationView {
  if (main === "profile") return "profile";
  if (main === "site") return "site";
  return face === "All" ? "all-faces" : face;
}

export function splitTowerElevationView(view: TowerElevationView): {
  main: TowerMainView;
  face: TowerFaceFilter;
} {
  if (view === "profile") return { main: "profile", face: "All" };
  if (view === "site") return { main: "site", face: "All" };
  if (view === "all-faces") return { main: "faces", face: "All" };
  return { main: "faces", face: view };
}

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
  if (view === "site") return true;
  if (view === "profile") return true;
  if (view === "all-faces") {
    return resolvePlacementTowerFace(placement, data, context) != null;
  }
  return resolvePlacementTowerFace(placement, data, context) === view;
}

export function towerFaceColumnCenterX(face: TowerFace): number {
  const idx = TOWER_FACE_ORDER.indexOf(face);
  const pitch = TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_GAP;
  return TOWER_DRAFT_ALL_FACES_COL_START + idx * pitch + TOWER_DRAFT_ALL_FACES_COL_W / 2;
}

export type TowerContentWidthOpts = {
  elevationRef?: TowerElevationReferenceImage | null;
  towerHeightFt?: number;
  pxPerFt?: number;
};

function defaultProfileContentWidth(): number {
  return TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X + 80 + 420;
}

export function towerDraftContentWidthForView(
  view: TowerElevationView,
  opts?: TowerContentWidthOpts,
): number {
  if (view === "site") return 720;
  if (view === "all-faces") {
    return (
      TOWER_DRAFT_ALL_FACES_COL_START +
      TOWER_FACE_ORDER.length * TOWER_DRAFT_ALL_FACES_COL_W +
      (TOWER_FACE_ORDER.length - 1) * TOWER_DRAFT_ALL_FACES_COL_GAP +
      46
    );
  }
  const base = defaultProfileContentWidth();
  if (!opts?.elevationRef || opts.towerHeightFt == null || opts.pxPerFt == null) {
    return base;
  }
  return profileContentWidthForReference({
    ref: opts.elevationRef,
    towerHeightFt: opts.towerHeightFt,
    pxPerFt: opts.pxPerFt,
    baseContentWidth: base,
  });
}

/** Resolve column center for a placement in the current view. */
export function placementCenterX(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  view: TowerElevationView,
  context?: TrackItTowerSiteContext | null,
  profileCenterX?: number,
): number {
  if (view === "all-faces") {
    const face = resolvePlacementTowerFace(placement, data, context);
    if (!face) return profileCenterX ?? towerDraftTowerCenterX();
    return towerFaceColumnCenterX(face);
  }
  return profileCenterX ?? towerDraftTowerCenterX();
}

/** Pick tower face from canvas X in all-faces view. */
export function towerFaceAtContentX(x: number): TowerFace | undefined {
  const pitch = TOWER_DRAFT_ALL_FACES_COL_W + TOWER_DRAFT_ALL_FACES_COL_GAP;
  const idx = Math.floor((x - TOWER_DRAFT_ALL_FACES_COL_START) / pitch);
  if (idx < 0 || idx >= TOWER_FACE_ORDER.length) return undefined;
  return TOWER_FACE_ORDER[idx];
}

/** Which face column a single-face view represents (undefined for profile / all-faces). */
export function activeViewFace(view: TowerElevationView): TowerFace | undefined {
  if (view === "profile" || view === "all-faces" || view === "site") return undefined;
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
