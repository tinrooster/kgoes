import type { DeviceData, TowerDraftPage, TowerDraftPlacement, TrackItTowerSiteContext } from "./types";
import type { Edge } from "@xyflow/react";
import { resolvePlacementAzimuthDeg, resolvePlacementTowerFace, type TowerFace } from "./towerDraftFaces";
import { resolveDeviceLabel } from "./displayName";

export type SitePlanRemoteCard = {
  key: string;
  label: string;
  az: number;
  dist: string;
  band: string;
  linked: boolean;
};

const FACE_AZIMUTH: Record<TowerFace, number> = { N: 0, E: 90, S: 180, W: 270 };

const MW_TYPES = new Set(["microwave-dish", "microwave-horn", "microwave-odu"]);

export function resolveSitePlanAzimuth(
  placement: TowerDraftPlacement,
  data: DeviceData | undefined,
  context?: TrackItTowerSiteContext | null,
): number | null {
  const az = resolvePlacementAzimuthDeg(placement, data, context);
  if (az != null) return ((az % 360) + 360) % 360;
  const face = resolvePlacementTowerFace(placement, data, context);
  if (face) return FACE_AZIMUTH[face];
  return null;
}

export function isOmniSiteDevice(data: DeviceData | undefined): boolean {
  const t = data?.deviceType ?? "";
  if (t.includes("repeater") || t.includes("collinear") || t === "rf-yagi") return true;
  if ((t === "rf-antenna" || t === "rf-slot-panel") && data?.rfInstallation?.azimuthDeg == null) {
    return true;
  }
  return false;
}

function bandFromDevice(data: DeviceData | undefined): string {
  const port = data?.ports?.find((p) => p.rf?.band);
  return port?.rf?.band ?? "";
}

/** De-collide remote-site cards vertically per hemisphere (design SitePlan). */
export function layoutRemoteSiteCards(
  cards: SitePlanRemoteCard[],
  cx: number,
  cy: number,
  plotH: number,
  cardH: number,
  gap: number,
): (SitePlanRemoteCard & { e: { x: number; y: number }; right: boolean; cardY: number })[] {
  const R = 178;
  const ringPoint = (az: number) => ({
    x: cx + R * Math.sin((az * Math.PI) / 180),
    y: cy - R * Math.cos((az * Math.PI) / 180),
  });

  const placed = cards.map((st) => {
    const e = ringPoint(st.az);
    return { ...st, e, right: e.x >= cx, cardY: e.y };
  });

  ["right", "left"].forEach((side) => {
    const grp = placed
      .filter((p) => (side === "right") === p.right)
      .sort((a, b) => a.e.y - b.e.y);
    let prev = -Infinity;
    grp.forEach((p) => {
      p.cardY = Math.max(p.e.y, prev + cardH + gap);
      prev = p.cardY;
    });
    const overflow = (grp.length ? grp[grp.length - 1].cardY + cardH / 2 : 0) - (plotH - 16);
    if (overflow > 0) grp.forEach((p) => { p.cardY -= overflow; });
  });

  return placed as (SitePlanRemoteCard & {
    e: { x: number; y: number };
    right: boolean;
    cardY: number;
  })[];
}

export function collectSitePlanRemoteCards(args: {
  page: TowerDraftPage;
  nodes: { id: string; data: DeviceData }[];
  edges: Edge[];
  trackItTowerContext?: TrackItTowerSiteContext | null;
  selectedPlacementId: string | null;
  useShortNames: boolean;
}): SitePlanRemoteCard[] {
  const { page, nodes, edges, trackItTowerContext, selectedPlacementId, useShortNames } = args;
  const placedNodeIds = new Set(page.placements.map((p) => p.deviceNodeId));
  const byKey = new Map<string, SitePlanRemoteCard>();

  const add = (key: string, card: Omit<SitePlanRemoteCard, "key" | "linked">, linkNodeId?: string) => {
    if (byKey.has(key)) return;
    const linked =
      selectedPlacementId != null &&
      page.placements.some((pl) => {
        if (pl.id !== selectedPlacementId) return false;
        if (linkNodeId && pl.deviceNodeId === linkNodeId) return true;
        const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data;
        const az = resolveSitePlanAzimuth(pl, data, trackItTowerContext);
        return az != null && Math.abs(az - card.az) < 12;
      });
    byKey.set(key, { key, ...card, linked });
  };

  // rfLinks from context — catalog-seeded remote sites with real dist + band (preferred)
  for (const link of trackItTowerContext?.rfLinks ?? []) {
    add(`rflink-${link.id}`, {
      label: link.label,
      az: link.azimuthDeg,
      dist: link.distanceMi != null ? `${link.distanceMi.toFixed(1)} mi` : "—",
      band: link.band ?? "—",
    });
  }

  // antenna levels — sector azimuth markers (used when no rfLinks are configured)
  for (const level of trackItTowerContext?.antennaLevels ?? []) {
    if (level.azimuthDeg == null) continue;
    const label = level.sectorLabel?.trim() || level.name || level.code;
    add(`level-${level.id}`, {
      label,
      az: level.azimuthDeg,
      dist: level.mountHeightM != null ? `${Math.round(level.mountHeightM * 3.28084)} ft AGL` : "—",
      band: level.sectorLabel?.trim() ? "Sector" : "—",
    });
  }

  for (const pl of page.placements) {
    const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data;
    const az = resolveSitePlanAzimuth(pl, data, trackItTowerContext);
    if (az == null) continue;

    for (const edge of edges) {
      let otherId: string | null = null;
      if (edge.source === pl.deviceNodeId) otherId = edge.target as string;
      else if (edge.target === pl.deviceNodeId) otherId = edge.source as string;
      if (!otherId || placedNodeIds.has(otherId)) continue;

      const other = nodes.find((n) => n.id === otherId);
      if (!other) continue;
      const otherData = other.data;
      const label = resolveDeviceLabel(otherData, { useShortNames }).text;
      const sig = (edge.data as { signalType?: string })?.signalType ?? "";
      add(
        `edge-${otherId}`,
        {
          label,
          az,
          dist: "—",
          band: sig ? String(sig).toUpperCase() : bandFromDevice(data) || "—",
        },
        pl.deviceNodeId,
      );
    }

    if (data?.deviceType && MW_TYPES.has(data.deviceType)) {
      const desig = data.designation?.trim();
      if (desig && !byKey.has(`mw-${desig}`)) {
        add(`mw-${desig}`, {
          label: desig,
          az,
          dist: "—",
          band: bandFromDevice(data) || "MW",
        });
      }
    }
  }

  if (byKey.size === 0) {
    const azBuckets = new Map<number, string[]>();
    for (const pl of page.placements) {
      const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data;
      const az = resolveSitePlanAzimuth(pl, data, trackItTowerContext);
      if (az == null) continue;
      const bucket = Math.round(az / 15) * 15;
      const label = data
        ? resolveDeviceLabel(data, { useShortNames }).text
        : pl.deviceNodeId;
      const list = azBuckets.get(bucket) ?? [];
      list.push(label);
      azBuckets.set(bucket, list);
    }
    azBuckets.forEach((labels, bucket) => {
      add(`bucket-${bucket}`, {
        label: labels[0] ?? `Sector ${bucket}°`,
        az: bucket,
        dist: "—",
        band: labels.length > 1 ? `${labels.length} paths` : "—",
      });
    });
  }

  return Array.from(byKey.values());
}

export function deviceSiteTone(deviceType?: string): string {
  if (!deviceType) return "accent";
  if (deviceType.includes("camera")) return "info";
  if (MW_TYPES.has(deviceType) || deviceType.includes("microwave")) return "warning";
  if (deviceType.includes("repeater") || deviceType.includes("rf-")) return "accent";
  return "accent";
}
