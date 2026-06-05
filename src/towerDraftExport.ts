import type { DeviceData, TowerDraftPage, TrackItTowerSiteContext } from "./types";
import { resolveDeviceLabel } from "./displayName";
import { feedlineForDevice } from "./towerDraftFeedlines";
import { towerFeedTypeShortLabel } from "./towerDraftFeedType";

export type TowerDraftScheduleRow = {
  designation: string;
  deviceType: string;
  mountHeightFtAgl: number;
  azimuthDeg: string;
  band: string;
  locationCode: string;
  nodeId: string;
  feedlineEstFt: string;
  feedlineType: string;
  feedlineTo: string;
};

function bandFromDevice(data: DeviceData | undefined): string {
  const port = data?.ports?.find((p) => p.rf?.band || p.rf?.centerFrequencyMhz);
  if (port?.rf?.band) return port.rf.band;
  if (port?.rf?.centerFrequencyMhz) return `${port.rf.centerFrequencyMhz} MHz`;
  return "";
}

export function buildTowerDraftScheduleRows(
  page: TowerDraftPage,
  nodes: { id: string; data?: DeviceData }[],
  context?: TrackItTowerSiteContext | null,
  useShortNames = false,
): TowerDraftScheduleRow[] {
  const levelById = new Map(context?.antennaLevels.map((l) => [l.id, l]) ?? []);

  return [...page.placements]
    .sort((a, b) => b.mountHeightFtAgl - a.mountHeightFtAgl)
    .map((pl) => {
      const node = nodes.find((n) => n.id === pl.deviceNodeId);
      const data = node?.data as DeviceData | undefined;
      const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
      const level = pl.plantLocationId ? levelById.get(pl.plantLocationId) : undefined;
      const az =
        data?.rfInstallation?.azimuthDeg ?? level?.azimuthDeg;
      const feedline = feedlineForDevice(page, pl.deviceNodeId);
      return {
        designation: label,
        deviceType: data?.deviceType ?? "",
        mountHeightFtAgl: pl.mountHeightFtAgl,
        azimuthDeg: az != null ? String(az) : "",
        band: bandFromDevice(data),
        locationCode: level?.code ?? "",
        nodeId: pl.deviceNodeId,
        feedlineEstFt: feedline?.feedlineEstFt != null ? String(feedline.feedlineEstFt) : "",
        feedlineType: towerFeedTypeShortLabel(feedline?.feedType, data?.deviceType),
        feedlineTo: feedline?.feedlineToLabel ?? "",
      };
    });
}

export function towerDraftScheduleToCsv(rows: TowerDraftScheduleRow[]): string {
  const header = [
    "Designation",
    "Device type",
    "Ft AGL",
    "Azimuth",
    "Band",
    "Location code",
    "Node ID",
    "Feedline ft est",
    "Feedline type",
    "Feedline to",
  ];
  const lines = rows.map((r) =>
    [
      r.designation,
      r.deviceType,
      r.mountHeightFtAgl,
      r.azimuthDeg,
      r.band,
      r.locationCode,
      r.nodeId,
      r.feedlineEstFt,
      r.feedlineType,
      r.feedlineTo,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadTowerDraftCsv(page: TowerDraftPage, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${page.label.replace(/\s+/g, "-").toLowerCase()}-equipment-schedule.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
