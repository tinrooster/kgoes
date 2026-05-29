/** Floating zoom / fit controls shared by drawing, rack, and print views. */

import { viewZoomPercent } from "../viewZoomUtils";

const ICON = 18;

function FitViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ICON}
      height={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M21 16v5h-5" />
      <path d="M3 16v5h5" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ICON}
      height={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ICON}
      height={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface ViewNavBarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
}

export default function ViewNavBar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitAll,
}: ViewNavBarProps) {
  const iconBtn =
    "w-[21px] h-[21px] flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-sm cursor-pointer transition-colors shrink-0";

  return (
    <div
      className="view-nav-bar absolute z-20 flex items-center gap-0 bg-[var(--color-surface)]/92 border border-[var(--color-border)] rounded-sm shadow-sm select-none"
      data-print-hide
      role="toolbar"
      aria-label="View navigation"
    >
      <button type="button" className={iconBtn} onClick={onFitAll} title="Fit entire view in window">
        <FitViewIcon />
      </button>
      <div className="w-px h-3.5 bg-[var(--color-border)] shrink-0" aria-hidden />
      <button type="button" className={iconBtn} onClick={onZoomOut} title="Zoom out">
        <ZoomOutIcon />
      </button>
      <span
        className="w-7 text-center text-[9px] leading-none text-[var(--color-text-muted)] tabular-nums shrink-0"
        title="Current zoom"
      >
        {viewZoomPercent(zoom)}%
      </span>
      <button type="button" className={iconBtn} onClick={onZoomIn} title="Zoom in">
        <ZoomInIcon />
      </button>
    </div>
  );
}
