import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * When `enabled`, compares a hidden full-width measure row to the visible container
 * and returns true when labeled controls would overflow (icon-only mode needed).
 */
export function useCanvasToolbarOverflow(
  containerRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [needsCompact, setNeedsCompact] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      setNeedsCompact(false);
      return;
    }

    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      const available = container.clientWidth;
      const required = measure.scrollWidth;
      setNeedsCompact(required > available + 2);
    };

    const observer = new ResizeObserver(check);
    observer.observe(container);
    observer.observe(measure);
    check();

    return () => observer.disconnect();
  }, [containerRef, measureRef, enabled]);

  return needsCompact;
}
