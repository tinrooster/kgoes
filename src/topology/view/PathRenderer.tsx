import type { Point } from "../domain/types";
import { pointsToSvgPath } from "../routing/busTrunk";

interface PathRendererProps {
  points: Point[];
  isActive: boolean;
  color?: string;
  strokeWidth?: number;
}

export function PathRenderer({
  points,
  isActive,
  color = "#94a3b8",
  strokeWidth,
}: PathRendererProps) {
  const pathData = pointsToSvgPath(points);
  if (!pathData) return null;

  return (
    <path
      d={pathData}
      fill="none"
      stroke={isActive ? "#3b82f6" : color}
      strokeWidth={strokeWidth ?? (isActive ? 3 : 1.5)}
      strokeLinejoin="round"
      className="transition-all duration-200"
    />
  );
}
