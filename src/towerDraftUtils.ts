import type {
  DeviceTemplate,
  TowerDraftLineStyle,
  TowerDraftPage,
  TowerDraftPlacement,
  TowerDraftTowerType,
  TowerGuideBandFt,
} from "./types";

/** Pixels per foot AGL on tower draft canvas (documentation scale). */
export const TOWER_DRAFT_PX_PER_FT = 2.4;

export const TOWER_DRAFT_RULER_W = 48;
export const TOWER_DRAFT_PAD_X = 120;
export const TOWER_DRAFT_PAD_TOP = 48;
export const TOWER_DRAFT_PAD_BOTTOM = 48;
export const TOWER_DRAFT_COLUMN_W = 80;
/** Column width per face in all-faces elevation view. */
export const TOWER_DRAFT_ALL_FACES_COL_W = 96;

/** Horizontal spacing when stacking antennas at similar heights. */
export const TOWER_DRAFT_PLACEMENT_SPACING = 38;

/** Ground line Y for a given tower height (base at bottom). */
export function towerDraftGroundY(towerHeightFt: number): number {
  return TOWER_DRAFT_PAD_TOP + towerHeightFt * TOWER_DRAFT_PX_PER_FT;
}

/** Canvas Y for a height in ft AGL (0 = base). */
export function ftAglToY(ftAgl: number, towerHeightFt: number): number {
  return towerDraftGroundY(towerHeightFt) - ftAgl * TOWER_DRAFT_PX_PER_FT;
}

export const TOWER_DRAFT_SNAP_LEVEL = -1;

/** Snap raw ft AGL to guide bands, grid, or nearest foot. */
export function resolveSnapMountHeight(
  rawFt: number,
  towerHeightFt: number,
  snapFt: number,
  guideBandsFt?: { ftAgl: number }[],
): number {
  const clamped = Math.max(0, Math.min(towerHeightFt, rawFt));
  if (snapFt === TOWER_DRAFT_SNAP_LEVEL && guideBandsFt?.length) {
    return guideBandsFt.reduce(
      (best, b) => (Math.abs(b.ftAgl - clamped) < Math.abs(best - clamped) ? b.ftAgl : best),
      guideBandsFt[0].ftAgl,
    );
  }
  if (snapFt <= 0) return Math.round(clamped);
  return Math.round(clamped / snapFt) * snapFt;
}

/** Inverse: canvas Y → ft AGL snapped to nearest foot or grid. */
export function yToFtAgl(y: number, towerHeightFt: number, snapFt = 1): number {
  return yToFtAglWithSnap(y, towerHeightFt, snapFt);
}

/** Canvas Y → ft AGL with optional snap (including level bands when snapFt === TOWER_DRAFT_SNAP_LEVEL). */
export function yToFtAglWithSnap(
  y: number,
  towerHeightFt: number,
  snapFt: number,
  guideBandsFt?: { ftAgl: number }[],
): number {
  const ground = towerDraftGroundY(towerHeightFt);
  const raw = (ground - y) / TOWER_DRAFT_PX_PER_FT;
  return resolveSnapMountHeight(raw, towerHeightFt, snapFt, guideBandsFt);
}

/** Expected ft AGL from trackIT antenna level (metres). */
export function mountHeightMToFtAgl(mountHeightM: number): number {
  return Math.round(mountHeightM * 3.28084);
}

export function placementSyncStatus(
  placement: TowerDraftPlacement,
  contextLevels?: { id: string; mountHeightM?: number }[],
): 'linked' | 'mismatch' | 'unassigned' {
  if (!placement.plantLocationId) return 'unassigned';
  const level = contextLevels?.find((l) => l.id === placement.plantLocationId);
  if (!level || level.mountHeightM == null) return 'linked';
  const expected = mountHeightMToFtAgl(level.mountHeightM);
  return Math.abs(expected - placement.mountHeightFtAgl) <= 2 ? 'linked' : 'mismatch';
}


export function towerDraftContentHeight(towerHeightFt: number): number {
  return TOWER_DRAFT_PAD_TOP + towerHeightFt * TOWER_DRAFT_PX_PER_FT + TOWER_DRAFT_PAD_BOTTOM;
}

export function towerDraftContentWidth(): number {
  return TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X + TOWER_DRAFT_COLUMN_W + 420;
}

export function defaultGuideBands(towerHeightFt: number): TowerGuideBandFt[] {
  return [
    { ftAgl: towerHeightFt, label: `${towerHeightFt}′` },
    { ftAgl: Math.round(towerHeightFt * 0.75), label: `${Math.round(towerHeightFt * 0.75)}′` },
    { ftAgl: Math.round(towerHeightFt * 0.5), label: `${Math.round(towerHeightFt * 0.5)}′` },
    { ftAgl: Math.round(towerHeightFt * 0.25), label: `${Math.round(towerHeightFt * 0.25)}′` },
    { ftAgl: 0, label: "Base" },
  ];
}

export function towerDraftTowerCenterX(): number {
  return TOWER_DRAFT_RULER_W + TOWER_DRAFT_PAD_X + TOWER_DRAFT_COLUMN_W / 2;
}

export function createDefaultTowerDraftPage(
  label: string,
  opts?: {
    id?: string;
    towerHeightFtAgl?: number;
    towerType?: TowerDraftTowerType;
    guideBandsFt?: TowerGuideBandFt[];
  },
): TowerDraftPage {
  const towerHeightFtAgl = opts?.towerHeightFtAgl ?? 150;
  return {
    id: opts?.id ?? `towerdraft-1`,
    label,
    type: "tower-draft",
    towerHeightFtAgl,
    towerType: opts?.towerType ?? "self_support",
    guideBandsFt: opts?.guideBandsFt ?? defaultGuideBands(towerHeightFtAgl),
    placements: [],
    polylines: [],
  };
}

/** Structural / plan symbols — not shown on elevation draft palette. */
const TOWER_DRAFT_EXCLUDED = new Set([
  "tower-lattice",
  "site-shelter",
  "site-equipment-shelter",
  "site-gate",
  "site-access-gate",
  "site-generator-pad",
  "site-cable-tray",
  "site-transformer",
  "site-transformer-pad",
  "adapter",
  "cable-accessory",
  "microwave-radio-idu",
  "microwave-gateway",
  "eng-receiver-ird",
]);

/** Antennas and tower-mounted RF/MW gear for elevation placement. */
const TOWER_DRAFT_INCLUDED = new Set([
  "microwave-dish",
  "microwave-odu",
  "microwave-horn",
  "rf-antenna",
  "rf-slot-panel",
  "rf-yagi",
  "rf-repeater-antenna",
  "rf-collinear",
  "camera",
  "ptz-camera",
  "outdoor-ptz-camera",
  "tower-obstruction-light",
  "site-obstruction-light",
  "site-rest-platform",
]);

export function isTowerDraftEligibleDeviceType(deviceType?: string): boolean {
  if (!deviceType) return false;
  if (TOWER_DRAFT_EXCLUDED.has(deviceType)) return false;
  if (TOWER_DRAFT_INCLUDED.has(deviceType)) return true;
  if (deviceType.startsWith("microwave-")) return true;
  return false;
}

/** Pick a horizontal offset so multiple antennas can sit at similar heights. */
export function suggestPlacementOffsetX(
  placements: TowerDraftPlacement[],
  mountHeightFtAgl: number,
  preferredOffsetX?: number,
): number {
  const heightToleranceFt = 3;
  const nearby = placements.filter(
    (p) => Math.abs(p.mountHeightFtAgl - mountHeightFtAgl) <= heightToleranceFt,
  );

  const isTaken = (offsetX: number) =>
    nearby.some((p) => Math.abs((p.offsetX ?? 0) - offsetX) < TOWER_DRAFT_PLACEMENT_SPACING * 0.65);

  if (preferredOffsetX != null && !isTaken(preferredOffsetX)) {
    return preferredOffsetX;
  }

  for (let slot = 0; slot < 12; slot++) {
    const offset =
      slot === 0 ? 0 : (slot % 2 === 1 ? 1 : -1) * Math.ceil(slot / 2) * TOWER_DRAFT_PLACEMENT_SPACING;
    if (!isTaken(offset)) return offset;
  }
  return preferredOffsetX ?? 0;
}

/** Device library entries available on the tower draft sidebar (MW/RF mount gear). */
export function towerDraftLibraryTemplates(templates: DeviceTemplate[]): DeviceTemplate[] {
  return templates
    .filter((t) => isTowerDraftEligibleDeviceType(t.deviceType))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function towerDraftPolylineDash(lineStyle?: TowerDraftLineStyle): string | undefined {
  switch (lineStyle) {
    case "dashed":
      return "8 4";
    case "dotted":
      return "2 3";
    default:
      return undefined;
  }
}
