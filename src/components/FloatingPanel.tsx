import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

export interface FloatingPanelProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional strip below the title bar (e.g. preferences tabs). */
  toolbar?: ReactNode;
  /** Width before user resize (px). */
  defaultWidth?: number;
  minWidth?: number;
  minHeight?: number;
  /** Max height when the user has not resized (CSS length). */
  maxHeight?: string;
  onClose: () => void;
  onBackdropClick?: () => void;
  onKeyDownCapture?: (e: KeyboardEvent<HTMLDivElement>) => void;
  panelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}

function ResizeGrip({ onPointerDown }: { onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }) {
  return (
    <div
      className="absolute bottom-0 right-0 z-20 flex h-5 w-5 cursor-se-resize select-none touch-none items-end justify-end p-0.5"
      onPointerDown={onPointerDown}
      aria-hidden
    >
      <svg
        viewBox="0 0 10 10"
        className="h-3 w-3 text-[var(--color-text-muted)] opacity-40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="9" y1="1" x2="1" y2="9" />
        <line x1="9" y1="5" x2="5" y2="9" />
      </svg>
    </div>
  );
}

function DragGripIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className="shrink-0 text-[var(--color-text-muted)] opacity-60"
      aria-hidden
    >
      <circle cx="3" cy="3" r="1" fill="currentColor" />
      <circle cx="9" cy="3" r="1" fill="currentColor" />
      <circle cx="3" cy="9" r="1" fill="currentColor" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Standard floating module window: centered default size/position on each open.
 * Move (title bar) and resize (bottom-right grip) apply for the current open only.
 * Top edge stays fixed when content height changes until the user moves the panel.
 */
export default function FloatingPanel({
  title,
  subtitle,
  children,
  footer,
  toolbar,
  defaultWidth = 560,
  minWidth = 400,
  minHeight = 280,
  maxHeight = "85vh",
  onClose,
  onBackdropClick,
  onKeyDownCapture,
  panelRef: externalPanelRef,
  className = "",
}: FloatingPanelProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? innerRef;

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [userAdjusted, setUserAdjusted] = useState(false);

  // Centre once per mount (each reopen = fresh default placement).
  useLayoutEffect(() => {
    if (pos !== null) return;
    const el = panelRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.round(Math.max(8, (window.innerWidth - width) / 2)),
      y: Math.round(Math.max(8, (window.innerHeight - height) / 2)),
    });
  }, [pos, panelRef]);

  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, startPos: { x: number; y: number }) => {
      setUserAdjusted(true);
      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (me: globalThis.PointerEvent) => {
        const el = panelRef.current;
        const w = el?.offsetWidth ?? defaultWidth;
        const h = el?.offsetHeight ?? 400;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - w, startPos.x + me.clientX - startX)),
          y: Math.max(0, Math.min(window.innerHeight - Math.min(h, 60), startPos.y + me.clientY - startY)),
        });
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [defaultWidth, panelRef],
  );

  const handleHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest("button, a, input, select, textarea")) return;
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    startDrag(e, pos ?? { x: rect?.left ?? 0, y: rect?.top ?? 0 });
  };

  const handleResizePointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUserAdjusted(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const el = panelRef.current;
    const startW = el?.offsetWidth ?? defaultWidth;
    const startH = el?.offsetHeight ?? 500;

    const onMove = (me: globalThis.PointerEvent) => {
      setSize({
        w: Math.max(minWidth, startW + me.clientX - startX),
        h: Math.max(minHeight, startH + me.clientY - startY),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [panelRef]);

  const panelStyle: CSSProperties = {
    position: "fixed",
    left: pos?.x ?? -9999,
    top: pos?.y ?? 8,
    width: size?.w ?? defaultWidth,
    height: size?.h,
    maxHeight: size?.h ? undefined : maxHeight,
    visibility: pos ? "visible" : "hidden",
  };

  const bodyMaxClass = size?.h
    ? "flex-1 min-h-0 overflow-y-auto"
    : userAdjusted
      ? "overflow-y-auto"
      : "flex-1 min-h-0 overflow-y-auto";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      data-allow-scroll
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
      onKeyDownCapture={onKeyDownCapture}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        data-allow-scroll
        style={panelStyle}
        className={`bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl flex flex-col outline-none ${size?.h ? "min-h-0" : ""} ${className}`}
      >
        <div
          className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2 shrink-0 cursor-move select-none bg-[var(--color-surface)] rounded-t-xl"
          onPointerDown={handleHeaderPointerDown}
        >
          <DragGripIcon />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] truncate">{title}</h2>
            {subtitle ? (
              <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] text-lg leading-none cursor-pointer shrink-0 rounded p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {toolbar ? <div className="shrink-0 border-b border-[var(--color-border)]">{toolbar}</div> : null}

        <div className={bodyMaxClass}>{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--color-border)] rounded-b-xl overflow-hidden">{footer}</div>
        ) : null}

        <ResizeGrip onPointerDown={handleResizePointerDown} />
      </div>
    </div>
  );
}
