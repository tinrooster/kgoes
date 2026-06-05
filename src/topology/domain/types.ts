/**
 * MDF / jack-field topology domain model — separate from React Flow geometry.
 * Cable metadata lives here; routing points are computed at render time.
 */

import type { ServiceType } from "../serviceSchema";

export type PanelType = "SOURCE_EQUIPMENT" | "MDF_PATCH_PANEL" | "DESTINATION_PANEL";
export type CableCategory = "Cat6" | "Cat6A" | "Fiber_OS2";

export interface NetworkPanel {
  id: string;
  name: string;
  type: PanelType;
  portsCount: 12 | 24 | 48;
  /** Links to a floor/room tier when using riser layouts. */
  roomId?: string;
  /** PoE sourcing switch — enables budget tracking on this panel. */
  maxPoeBudgetWatts?: number;
}

export interface NetworkPort {
  id: string;
  panelId: string;
  portNumber: number;
  label?: string;
}

export interface CableSegment {
  id: string;
  tagNumber: string;
  category: CableCategory;
  sourcePortId: string;
  destinationPortId: string;
  lengthFeet?: number;
  serviceType?: ServiceType;
}

/** End-to-end logical circuit spanning one or more physical segments. */
export interface CircuitPath {
  id: string;
  name: string;
  orderedSegmentIds: string[];
  isActive: boolean;
}

export interface TopologyDatabase {
  panels: NetworkPanel[];
  ports: NetworkPort[];
  segments: CableSegment[];
  circuits: CircuitPath[];
}

export interface Point {
  x: number;
  y: number;
}

export interface PortCoordinate {
  portNumber: number;
  x: number;
  y: number;
}

export interface PortDetails {
  /** UI key (unique per device + port). */
  id: string;
  /** Schematic port id used on edge handles — may match other devices if catalog ids collide. */
  schematicPortId: string;
  deviceNodeId: string;
  portNumber: number;
  label?: string;
  category?: string;
  panelId?: string;
  serviceType?: ServiceType;
}

export interface PatchActionRecord {
  type: "ADD_CABLE" | "REMOVE_CABLE";
  segment: CableSegment;
  timestamp: number;
}
