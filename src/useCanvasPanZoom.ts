import { useCallback, useEffect, useRef, useState } from "react";
import { computeFitViewport, type ContentBounds } from "./viewNavUtils";
import { stepViewZoom } from "./viewZoomUtils";

export interface CanvasPanZoomState {
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  viewOffset: { x: number; y: number };
  isPanning: boolean;
  zoomInView: () => void;
  zoomOutView: () => void;
  fitAllView: (bounds: ContentBounds | null) => void;
  applyViewport: (zoom: number, pan: { x: number; y: number }) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  transform: string;
}

export function useCanvasPanZoom(options?: {
  initialZoom?: number;
  initialOffset?: { x: number; y: number };
  /** Fit these bounds when the container mounts or deps change. */
  fitBounds?: ContentBounds | null;
  fitDeps?: unknown[];
  /** When false, skip auto-fit on mount (tall-tower profile sets viewport manually). */
  autoFit?: boolean;
}): CanvasPanZoomState {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewOffset, setViewOffset] = useState(options?.initialOffset ?? { x: 40, y: 40 });
  const [zoom, setZoom] = useState(options?.initialZoom ?? 1);
  const [isPanning, setIsPanning] = useState(false);
  const vpRef = useRef({ zoom: options?.initialZoom ?? 1, pan: options?.initialOffset ?? { x: 40, y: 40 } });
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const setViewport = useCallback((z: number, pan: { x: number; y: number }) => {
    vpRef.current = { zoom: z, pan };
    setZoom(z);
    setViewOffset(pan);
  }, []);

  const fitAllView = useCallback(
    (bounds: ContentBounds | null) => {
      const el = containerRef.current;
      if (!el || !bounds) return;
      const { zoom: z, pan } = computeFitViewport(el.clientWidth, el.clientHeight, bounds, {
        maxZoom: 2,
        minZoom: 0.2,
        padding: 32,
      });
      setViewport(z, pan);
    },
    [setViewport],
  );

  const zoomInView = useCallback(() => {
    const el = containerRef.current;
    const { zoom: z, pan: p } = vpRef.current;
    const newZ = stepViewZoom(z, "in");
    if (!el) {
      setViewport(newZ, p);
      return;
    }
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    const ratio = newZ / z;
    setViewport(newZ, { x: cx * (1 - ratio) + p.x * ratio, y: cy * (1 - ratio) + p.y * ratio });
  }, [setViewport]);

  const zoomOutView = useCallback(() => {
    const el = containerRef.current;
    const { zoom: z, pan: p } = vpRef.current;
    const newZ = stepViewZoom(z, "out");
    if (!el) {
      setViewport(newZ, p);
      return;
    }
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    const ratio = newZ / z;
    setViewport(newZ, { x: cx * (1 - ratio) + p.x * ratio, y: cy * (1 - ratio) + p.y * ratio });
  }, [setViewport]);

  useEffect(() => {
    if (options?.autoFit === false) return;
    if (!options?.fitBounds) return;
    const timer = window.setTimeout(() => fitAllView(options.fitBounds ?? null), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitDeps is intentional external trigger
  }, [fitAllView, options?.autoFit, options?.fitBounds, ...(options?.fitDeps ?? [])]);

  const applyViewport = useCallback(
    (z: number, pan: { x: number; y: number }) => {
      setViewport(z, pan);
    },
    [setViewport],
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, ox: viewOffset.x, oy: viewOffset.y };
    }
  }, [viewOffset.x, viewOffset.y]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setViewOffset({
        x: panStart.current.ox + (e.clientX - panStart.current.x),
        y: panStart.current.oy + (e.clientY - panStart.current.y),
      });
    },
    [isPanning],
  );

  const onMouseUp = useCallback(() => {
    if (isPanning) {
      vpRef.current = { zoom: vpRef.current.zoom, pan: viewOffset };
    }
    setIsPanning(false);
  }, [isPanning, viewOffset]);

  useEffect(() => {
    vpRef.current = { zoom, pan: viewOffset };
  }, [zoom, viewOffset]);

  const transform = `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`;

  return {
    containerRef,
    zoom,
    viewOffset,
    isPanning,
    zoomInView,
    zoomOutView,
    fitAllView,
    applyViewport,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    transform,
  };
}
