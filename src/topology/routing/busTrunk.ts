import type { Point } from "../domain/types";

export interface BusConnection {
  id: string;
  source: Point;
  destination: Point;
}

/**
 * Orthogonal bus-trunk routing: horizontal → assigned vertical track → horizontal.
 * Guarantees non-overlapping lanes when each connection gets a unique track index.
 */
export function routeBusTrunk(
  conn: BusConnection,
  trackIndex: number,
  trunkX: number,
  trackSpacing = 8,
): Point[] {
  const assignedTrackX = trunkX + trackIndex * trackSpacing;
  const { source, destination } = conn;
  return [
    { x: source.x, y: source.y },
    { x: assignedTrackX, y: source.y },
    { x: assignedTrackX, y: destination.y },
    { x: destination.x, y: destination.y },
  ];
}

/** SVG path `d` attribute from orthogonal points. */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length < 2) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}
