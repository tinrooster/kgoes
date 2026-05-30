/** Shared rack elevation metadata helpers for device templates. */

export function fullRackMeta(rackHeightU: number) {
  return {
    rackHeightU,
    mountingClass: "rack-full" as const,
    rackForm: "full" as const,
    rackMetadataSource: "library" as const,
  };
}

/** Full-width rack panel metadata from physical height (dims stay on the template). */
export function fullRackFromHeightMm(heightMm: number, _widthMm?: number, _depthMm?: number) {
  const rackHeightU = Math.max(1, Math.min(12, Math.round(heightMm / 44.45)));
  return fullRackMeta(rackHeightU);
}

/** Patch panel / VJF-style bays: 1U ≤24 circuits, 2U ≤48, 3U above. */
export function patchPanelRackMeta(circuitCount: number) {
  const rackHeightU = circuitCount <= 24 ? 1 : circuitCount <= 48 ? 2 : 3;
  return {
    ...fullRackMeta(rackHeightU),
    heightMm: Math.round(rackHeightU * 44.45),
    widthMm: 482.6,
    depthMm: 120,
  };
}

/** Managed Ethernet switches: 1U for ≤24 ports, 2U above. */
export function networkSwitchRackMeta(portCount: number) {
  const rackHeightU = portCount <= 24 ? 1 : 2;
  return {
    ...fullRackMeta(rackHeightU),
    heightMm: Math.round(rackHeightU * 44.45),
    widthMm: 482.6,
    depthMm: 280,
  };
}

export const THROWDOWN_SHELF_1U = {
  rackHeightU: 1,
  mountingClass: "shelf" as const,
  rackForm: "shelf-only" as const,
  rackMetadataSource: "library" as const,
} as const;
