import { rackDeviceDefinitionKey } from "./rackMount";
import type { ConnectorType, DeviceData, FacePlateLayout, Port } from "./types";

export { rackDeviceDefinitionKey };

export type FacePlatePanel = "front" | "rear";

export const FACE_PLATE_KEY_SEP = "::";

/** Stable layout key for a port on a given rack face panel. */
export function facePlateItemKey(portId: string, panel: FacePlatePanel): string {
  return `${portId}${FACE_PLATE_KEY_SEP}${panel}`;
}

export function parseFacePlateItemKey(key: string): { portId: string; panel: FacePlatePanel | null } {
  if (key.endsWith(`${FACE_PLATE_KEY_SEP}front`)) {
    return { portId: key.slice(0, -(FACE_PLATE_KEY_SEP.length + 5)), panel: "front" };
  }
  if (key.endsWith(`${FACE_PLATE_KEY_SEP}rear`)) {
    return { portId: key.slice(0, -(FACE_PLATE_KEY_SEP.length + 4)), panel: "rear" };
  }
  return { portId: key, panel: null };
}

export interface FacePlateItem {
  key: string;
  portId: string;
  panel: FacePlatePanel;
  label: string;
  connectorType?: ConnectorType;
  signalType: string;
  direction: string;
  section?: string;
  /** Short badge on passthrough split (F / R). */
  sideTag?: string;
}

/** Which rack face panel a port belongs on (or both for passthrough). */
export function portRackPanels(port: Port, deviceType: string): FacePlatePanel[] {
  if (port.direction === "passthrough") return ["front", "rear"];
  if (deviceType === "patch-panel" || deviceType === "wall-plate") {
    if (port.direction === "input") return ["rear"];
    if (port.direction === "output") return ["front"];
  }
  return ["front"];
}

export function resolvePortPanels(
  port: Port,
  deviceType: string,
  panelAssignments?: Record<string, FacePlatePanel>,
): FacePlatePanel[] {
  if (port.direction === "passthrough") return ["front", "rear"];
  const override = panelAssignments?.[port.id];
  if (override) return [override];
  return portRackPanels(port, deviceType);
}

export function enumerateFacePlateItems(
  ports: Port[],
  deviceType: string,
  panelAssignments?: Record<string, FacePlatePanel>,
): FacePlateItem[] {
  const items: FacePlateItem[] = [];
  for (const p of ports) {
    const panels = resolvePortPanels(p, deviceType, panelAssignments);
    for (const panel of panels) {
      const isPassthrough = p.direction === "passthrough";
      items.push({
        key: facePlateItemKey(p.id, panel),
        portId: p.id,
        panel,
        label: p.label,
        connectorType:
          panel === "rear"
            ? p.rearConnectorType ?? p.connectorType
            : p.frontConnectorType ?? p.connectorType,
        signalType: p.signalType,
        direction: p.direction,
        section: p.section,
        sideTag: isPassthrough ? (panel === "front" ? "F" : "R") : undefined,
      });
    }
  }
  return items;
}

export function itemsForPanel(items: FacePlateItem[], panel: FacePlatePanel): FacePlateItem[] {
  return items.filter((i) => i.panel === panel);
}

export const FACE_PLATE_SNAP_PCT = 4;

export function snapFacePlateCoord(val: number, snapPct = FACE_PLATE_SNAP_PCT): number {
  return Math.max(2, Math.min(98, Math.round(val / snapPct) * snapPct));
}

/**
 * Grid-aligned default layout for one face panel.
 * Rows of ports, evenly spaced on the snap grid (fast, predictable placement).
 */
export function autoLayoutPanelItems(
  items: FacePlateItem[],
  panel: FacePlatePanel,
): Record<string, { x: number; y: number }> {
  const panelItems = itemsForPanel(items, panel);
  if (panelItems.length === 0) return {};

  const isPower = (it: FacePlateItem) => it.signalType.startsWith("power");
  const signalItems = panelItems.filter((it) => !isPower(it));
  const powerItems = panelItems.filter(isPower);

  const positions: Record<string, { x: number; y: number }> = {};
  const snap = FACE_PLATE_SNAP_PCT;

  const layoutRow = (rowItems: FacePlateItem[], rowIndex: number, rowCount: number) => {
    const cy = snapFacePlateCoord(((rowIndex + 1) / (rowCount + 1)) * 100, snap);
    const n = rowItems.length;
    rowItems.forEach((it, i) => {
      const rawX = ((i + 1) / (n + 1)) * 100;
      positions[it.key] = { x: snapFacePlateCoord(rawX, snap), y: cy };
    });
  };

  // Group signal items by section for multi-row patch panels
  const sections = new Map<string, FacePlateItem[]>();
  for (const it of signalItems) {
    const sectionKey = it.section ?? "_default";
    if (!sections.has(sectionKey)) sections.set(sectionKey, []);
    sections.get(sectionKey)!.push(it);
  }

  const sectionKeys = [...sections.keys()];
  sectionKeys.forEach((key, idx) => layoutRow(sections.get(key)!, idx, sectionKeys.length));

  if (powerItems.length > 0) {
    powerItems.forEach((it, i) => {
      positions[it.key] = {
        x: snapFacePlateCoord(100 - snap, snap),
        y: snapFacePlateCoord(((i + 1) / (powerItems.length + 1)) * 100, snap),
      };
    });
  }

  return positions;
}

/** Build full layout positions for all panels (snapped auto-layout baseline). */
export function autoLayoutAllFacePlateItems(
  ports: Port[],
  deviceType: string,
  panelAssignments?: Record<string, FacePlatePanel>,
): Record<string, { x: number; y: number }> {
  const items = enumerateFacePlateItems(ports, deviceType, panelAssignments);
  return {
    ...autoLayoutPanelItems(items, "front"),
    ...autoLayoutPanelItems(items, "rear"),
  };
}

/** Merge saved layout with legacy port-id-only keys. */
export function normalizeFacePlatePositions(
  ports: Port[],
  deviceType: string,
  saved?: Record<string, { x: number; y: number }>,
  panelAssignments?: Record<string, FacePlatePanel>,
): Record<string, { x: number; y: number }> {
  const items = enumerateFacePlateItems(ports, deviceType, panelAssignments);
  const auto = autoLayoutAllFacePlateItems(ports, deviceType, panelAssignments);
  const out: Record<string, { x: number; y: number }> = { ...auto };

  if (!saved) return out;

  for (const item of items) {
    const keyed = saved[item.key];
    if (keyed) {
      out[item.key] = {
        x: snapFacePlateCoord(keyed.x),
        y: snapFacePlateCoord(keyed.y),
      };
      continue;
    }
    const legacy = saved[item.portId];
    if (legacy) {
      out[item.key] = {
        x: snapFacePlateCoord(legacy.x),
        y: snapFacePlateCoord(legacy.y),
      };
    }
  }

  return out;
}

export interface ResolvedFacePlatePort {
  key: string;
  portId: string;
  panel: FacePlatePanel;
  label: string;
  connectorType?: ConnectorType;
  signalType: string;
  direction: string;
  sideTag?: string;
  x: number;
  y: number;
}

/** Ports to draw on a rack face (front or rear elevation). */
export function resolveFacePlatePorts(
  deviceData: DeviceData,
  rackFace: FacePlatePanel,
): ResolvedFacePlatePort[] {
  const ports = deviceData.ports ?? [];
  const panelAssignments = deviceData.facePlateLayout?.panelAssignments;
  const items = enumerateFacePlateItems(ports, deviceData.deviceType, panelAssignments);
  const positions = normalizeFacePlatePositions(
    ports,
    deviceData.deviceType,
    deviceData.facePlateLayout?.positions,
    panelAssignments,
  );

  return itemsForPanel(items, rackFace).map((item) => {
    const pos = positions[item.key] ?? { x: 50, y: 50 };
    return { ...item, x: pos.x, y: pos.y };
  });
}

export function countMatchingDeviceInstances(
  nodes: { id: string; type?: string; data: DeviceData }[],
  nodeId: string,
  defKey: string | null,
): { others: string[]; modelName: string } {
  if (!defKey) return { others: [], modelName: "" };
  const self = nodes.find((n) => n.id === nodeId);
  const data = self?.data;
  const modelName = (data?.model ?? data?.baseLabel ?? data?.label ?? "this device") as string;
  const others = nodes
    .filter(
      (n) =>
        n.type === "device" &&
        n.id !== nodeId &&
        rackDeviceDefinitionKey(n.data) === defKey,
    )
    .map((n) => n.id);
  return { others, modelName };
}

export function buildFacePlateLayoutPatch(
  positions: Record<string, { x: number; y: number }>,
  labels: FacePlateLayout["labels"],
  deviceLabel: FacePlateLayout["deviceLabel"],
  panelAssignments?: Record<string, FacePlatePanel>,
): FacePlateLayout {
  const assignments =
    panelAssignments && Object.keys(panelAssignments).length > 0 ? panelAssignments : undefined;
  return {
    positions,
    ...(labels && labels.length > 0 ? { labels } : {}),
    ...(deviceLabel ? { deviceLabel } : {}),
    ...(assignments ? { panelAssignments: assignments } : {}),
  };
}

/** Human-readable snap spacing from grid step (% of face-plate width). */
export function snapGridSpacingPx(gridPct: number, faceWidthPx: number): number {
  return Math.round((gridPct / 100) * faceWidthPx);
}
