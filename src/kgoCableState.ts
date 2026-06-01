import type { ConnectionData, ConnectionEdge } from "./types";

export type CableStateKey =
  | "unnumbered"
  | "reserved"
  | "in_service"
  | "mismatch"
  | "retired_reclaimable";

export type CableStateTone = "success" | "info" | "warning" | "accent" | "neutral" | "danger";

export interface CableStateMeta {
  key: CableStateKey;
  tone: CableStateTone;
  label: string;
  hint: string;
  action: string;
  icon: string;
  btnVariant: "default" | "accent" | "soft" | "ghost" | "danger";
}

const CABLE_STATE: Record<CableStateKey, CableStateMeta> = {
  in_service: {
    key: "in_service",
    tone: "success",
    label: "In service",
    hint: "Live on a numbered cable in the plant register.",
    action: "View in numbering",
    icon: "eye",
    btnVariant: "default",
  },
  reserved: {
    key: "reserved",
    tone: "info",
    label: "Reserved",
    hint: "Held in the plant register for this drawing, not yet built.",
    action: "Manage",
    icon: "flag",
    btnVariant: "default",
  },
  unnumbered: {
    key: "unnumbered",
    tone: "warning",
    label: "Unnumbered",
    hint: "No cable number yet. Assign one from a reserved block.",
    action: "Assign number…",
    icon: "plus",
    btnVariant: "accent",
  },
  mismatch: {
    key: "mismatch",
    tone: "danger",
    label: "Signal mismatch",
    hint: "Connected across incompatible signal types.",
    action: "Review connection",
    icon: "alert",
    btnVariant: "default",
  },
  retired_reclaimable: {
    key: "retired_reclaimable",
    tone: "accent",
    label: "Retired — reclaimable",
    hint: "Number from a decommissioned system.",
    action: "Reclaim…",
    icon: "refresh",
    btnVariant: "accent",
  },
};

/** Map edge data to design v2 cable-state metadata. */
export function resolveCableState(edge: ConnectionEdge | undefined | null): CableStateMeta | null {
  if (!edge?.data) return null;
  const data = edge.data as ConnectionData;
  if (data.directAttach) return null;

  if ((data as { connectorMismatch?: boolean }).connectorMismatch) return CABLE_STATE.mismatch;
  if (!data.cableId) return CABLE_STATE.unnumbered;

  const state = (data as { cableState?: string }).cableState;
  if (state === "reserved") return CABLE_STATE.reserved;
  if (state === "retired_reclaimable") return CABLE_STATE.retired_reclaimable;

  return CABLE_STATE.in_service;
}

export function countUnnumberedEdges(edges: ConnectionEdge[]): number {
  return edges.filter((e) => !e.data?.directAttach && !e.data?.cableId && e.data?.signalType).length;
}
