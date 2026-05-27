/** Floating zoom / fit controls shared by drawing, rack, and print views. */
export interface ViewNavBarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onFitSelection?: () => void;
  selectionDisabled?: boolean;
  /** Extra Tailwind classes for positioning (default: bottom-left). */
  className?: string;
}

export default function ViewNavBar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onFitSelection,
  selectionDisabled = false,
  className = "bottom-4 left-4",
}: ViewNavBarProps) {
  const btn =
    "px-2 py-0.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  const iconBtn =
    "w-7 h-7 flex items-center justify-center text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer transition-colors";

  return (
    <div
      className={`absolute z-20 flex flex-wrap items-center gap-1 bg-white/95 border border-neutral-300 rounded-md shadow-md px-1.5 py-1 text-xs select-none ${className}`}
      data-print-hide
      role="toolbar"
      aria-label="View navigation"
    >
      <button type="button" className={btn} onClick={onFitAll} title="Fit entire view in window">
        Fit all
      </button>
      {onFitSelection && (
        <button
          type="button"
          className={btn}
          onClick={onFitSelection}
          disabled={selectionDisabled}
          title="Zoom to selected items"
        >
          Selection
        </button>
      )}
      <div className="w-px h-5 bg-neutral-200 mx-0.5" aria-hidden />
      <button type="button" className={iconBtn} onClick={onZoomOut} title="Zoom out">
        −
      </button>
      <span className="w-11 text-center text-neutral-600 tabular-nums" title="Current zoom">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" className={iconBtn} onClick={onZoomIn} title="Zoom in">
        +
      </button>
    </div>
  );
}
