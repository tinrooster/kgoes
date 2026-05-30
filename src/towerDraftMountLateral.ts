import { TOWER_DRAFT_PLACEMENT_SPACING } from "./towerDraftUtils";

/** Lateral mount position on tower face / profile (maps to canvas offsetX). */
export type TowerMountLateral =
  | "center"
  | "quarter-left"
  | "quarter-right"
  | "midspan-left"
  | "midspan-right";

export const TOWER_MOUNT_LATERAL_OPTIONS: {
  id: TowerMountLateral;
  label: string;
  shortLabel: string;
  offsetX: number;
}[] = [
  { id: "center", label: "On mast (vertical)", shortLabel: "Mast", offsetX: 0 },
  {
    id: "quarter-left",
    label: "¼ span left",
    shortLabel: "¼ L",
    offsetX: -Math.round(TOWER_DRAFT_PLACEMENT_SPACING / 2),
  },
  {
    id: "quarter-right",
    label: "¼ span right",
    shortLabel: "¼ R",
    offsetX: Math.round(TOWER_DRAFT_PLACEMENT_SPACING / 2),
  },
  {
    id: "midspan-left",
    label: "Midspan left",
    shortLabel: "Mid L",
    offsetX: -TOWER_DRAFT_PLACEMENT_SPACING,
  },
  {
    id: "midspan-right",
    label: "Midspan right",
    shortLabel: "Mid R",
    offsetX: TOWER_DRAFT_PLACEMENT_SPACING,
  },
];

const CUSTOM_LATERAL_THRESHOLD = 6;

export function mountLateralFromOffsetX(offsetX: number | undefined): TowerMountLateral | "custom" {
  const ox = offsetX ?? 0;
  let best: TowerMountLateral | "custom" = "center";
  let bestDist = Infinity;
  for (const opt of TOWER_MOUNT_LATERAL_OPTIONS) {
    const d = Math.abs(ox - opt.offsetX);
    if (d < bestDist) {
      bestDist = d;
      best = opt.id;
    }
  }
  return bestDist <= CUSTOM_LATERAL_THRESHOLD ? best : "custom";
}

export function mountLateralLabel(offsetX: number | undefined): string {
  const id = mountLateralFromOffsetX(offsetX);
  if (id === "custom") {
    const ox = offsetX ?? 0;
    if (Math.abs(ox) < 1) return "On mast (vertical)";
    return ox < 0 ? `Custom (${Math.abs(Math.round(ox))} px left)` : `Custom (${Math.round(ox)} px right)`;
  }
  return TOWER_MOUNT_LATERAL_OPTIONS.find((o) => o.id === id)?.label ?? "On mast (vertical)";
}

export function offsetXForMountLateral(id: TowerMountLateral): number {
  return TOWER_MOUNT_LATERAL_OPTIONS.find((o) => o.id === id)?.offsetX ?? 0;
}

/** Snap a drag offset to the nearest named mount preset. */
export function snapOffsetXToMountLateral(offsetX: number): number {
  const id = mountLateralFromOffsetX(offsetX);
  if (id === "custom") return offsetX;
  return offsetXForMountLateral(id);
}
