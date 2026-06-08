import { useCallback, useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { computeFitViewport, type ContentBounds } from "./viewNavUtils";
import { clampViewZoom, clampViewZoomContinuous, stepViewZoom } from "./viewZoomUtils";

/** Eng topology map — double-click zoom-in factor (viewBox width multiplier). */
const DOUBLE_CLICK_ZOOM_FACTOR = 0.42;
const ZOOM_WHEEL_SENSITIVITY = 0.0026;
const ZOOM_WHEEL_CLAMP_MIN = 0.984;
const ZOOM_WHEEL_CLAMP_MAX = 1.016;
/** Tower elevation — ~8–10% per wheel notch, cursor-anchored. */
const ZOOM_WHEEL_FINE_SENSITIVITY = 0.0011;
const ZOOM_WHEEL_FINE_CLAMP_MIN = 0.91;
const ZOOM_WHEEL_FINE_CLAMP_MAX = 1.1;

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
  onWheel?: (e: ReactWheelEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  /** Attach to canvas root + SVG (passive: false). Call from parent useEffect. */
  onWheelNative: (e: globalThis.WheelEvent) => void;
  onPointerInside: () => void;
  onPointerOutside: () => void;
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
  /** Eng-map style: wheel zoom, left-drag pan, double-click zoom toggle. */
  profileMapNav?: boolean;
  /** Disable map nav interactions (e.g. draw-line mode). */
  mapNavDisabled?: boolean;
  /** Map screen coords to content coords for cursor-anchored zoom. */
  clientToContent?: (clientX: number, clientY: number) => { x: number; y: number };
  /** 1 = PC scroll (default), -1 = natural. */
  wheelDeltaSign?: number;
  /**
   * `step` — one 25% preset per wheel notch (avoid on tower — too coarse).
   * `fine` — ~8–10% per notch, cursor-anchored (tower elevation).
   * `smooth` — topology map style (very fine per tick).
   */
  wheelZoomMode?: "step" | "fine" | "smooth";
  /** Called after pan/zoom changes (debounced by caller if needed). */
  onViewportChange?: (zoom: number, pan: { x: number; y: number }) => void;
}): CanvasPanZoomState {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewOffset, setViewOffset] = useState(options?.initialOffset ?? { x: 40, y: 40 });
  const [zoom, setZoom] = useState(options?.initialZoom ?? 1);
  const [isPanning, setIsPanning] = useState(false);
  const vpRef = useRef({ zoom: options?.initialZoom ?? 1, pan: options?.initialOffset ?? { x: 40, y: 40 } });
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const preDetailViewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const profileMapNav = options?.profileMapNav === true;
  const mapNavDisabled = options?.mapNavDisabled === true;
  const wheelDeltaSign = options?.wheelDeltaSign ?? 1;
  const wheelZoomMode = options?.wheelZoomMode ?? "smooth";
  const wheelZoomModeRef = useRef(wheelZoomMode);
  wheelZoomModeRef.current = wheelZoomMode;
  const pointerInsideRef = useRef(false);
  const mapNavDisabledRef = useRef(mapNavDisabled);
  mapNavDisabledRef.current = mapNavDisabled;
  const profileMapNavRef = useRef(profileMapNav);
  profileMapNavRef.current = profileMapNav;
  const onViewportChangeRef = useRef(options?.onViewportChange);
  onViewportChangeRef.current = options?.onViewportChange;

  const setViewport = useCallback(
    (z: number, pan: { x: number; y: number }, opts?: { snap?: boolean }) => {
      const clamped =
        opts?.snap === false ? clampViewZoomContinuous(z) : clampViewZoom(z);
      vpRef.current = { zoom: clamped, pan };
      setZoom(clamped);
      setViewOffset(pan);
      onViewportChangeRef.current?.(clamped, pan);
    },
    [],
  );

  const zoomAtScreen = useCallback(
    (factor: number, clientX: number, clientY: number, snap = true) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const { zoom: z, pan: p } = vpRef.current;
      const contentX = (localX - p.x) / z;
      const contentY = (localY - p.y) / z;
      const newZ = snap ? clampViewZoom(z / factor) : clampViewZoomContinuous(z / factor);
      setViewport(
        newZ,
        {
          x: localX - contentX * newZ,
          y: localY - contentY * newZ,
        },
        { snap },
      );
    },
    [setViewport],
  );

  const fitAllView = useCallback(
    (bounds: ContentBounds | null) => {
      const el = containerRef.current;
      if (!el || !bounds) return;
      preDetailViewportRef.current = null;
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

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      setIsPanning(true);
      panStart.current = { x: clientX, y: clientY, ox: viewOffset.x, oy: viewOffset.y };
    },
    [viewOffset.x, viewOffset.y],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const mapPan = profileMapNav && !mapNavDisabled && e.button === 0 && !e.altKey;
      if (e.button === 1 || (e.button === 0 && e.altKey) || mapPan) {
        startPan(e.clientX, e.clientY);
      }
    },
    [profileMapNav, mapNavDisabled, startPan],
  );

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

  const wheelDeltaY = useCallback((e: globalThis.WheelEvent): number => {
    if (e.deltaMode === globalThis.WheelEvent.DOM_DELTA_LINE) return e.deltaY * 16;
    if (e.deltaMode === globalThis.WheelEvent.DOM_DELTA_PAGE) return e.deltaY * 120;
    return e.deltaY;
  }, []);

  const onWheelNative = useCallback(
    (e: globalThis.WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-allow-scroll]")) return;

      if (!profileMapNavRef.current || mapNavDisabledRef.current) return;
      const el = containerRef.current;
      if (!el) return;

      // Ignore wheel when the event target is outside this canvas (e.g. modal overlay).
      if (target && !el.contains(target)) return;

      const rect = el.getBoundingClientRect();
      const insideBox =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!insideBox && !pointerInsideRef.current) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const dy = wheelDeltaY(e);
      if (dy === 0) return;

      if (wheelZoomModeRef.current === "step") {
        if (dy < 0) zoomInView();
        else zoomOutView();
        return;
      }

      const sensitivity =
        wheelZoomModeRef.current === "fine"
          ? ZOOM_WHEEL_FINE_SENSITIVITY
          : ZOOM_WHEEL_SENSITIVITY;
      const clampMin =
        wheelZoomModeRef.current === "fine" ? ZOOM_WHEEL_FINE_CLAMP_MIN : ZOOM_WHEEL_CLAMP_MIN;
      const clampMax =
        wheelZoomModeRef.current === "fine" ? ZOOM_WHEEL_FINE_CLAMP_MAX : ZOOM_WHEEL_CLAMP_MAX;
      const factor = Math.exp(wheelDeltaSign * dy * sensitivity);
      const clamped = Math.min(Math.max(factor, clampMin), clampMax);
      zoomAtScreen(clamped, e.clientX, e.clientY, false);
    },
    [wheelDeltaSign, wheelDeltaY, zoomAtScreen, zoomInView, zoomOutView],
  );

  useEffect(() => {
    if (!profileMapNav) return;
    const onWindowWheel = (e: WheelEvent) => {
      onWheelNative(e);
    };
    window.addEventListener("wheel", onWindowWheel, { passive: false, capture: true });
    document.documentElement.addEventListener("wheel", onWindowWheel, {
      passive: false,
      capture: true,
    });
    return () => {
      window.removeEventListener("wheel", onWindowWheel, { capture: true });
      document.documentElement.removeEventListener("wheel", onWindowWheel, { capture: true });
    };
  }, [profileMapNav, onWheelNative]);

  const bindPointerInside = useCallback(() => {
    pointerInsideRef.current = true;
  }, []);

  const bindPointerOutside = useCallback(() => {
    pointerInsideRef.current = false;
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      onWheelNative(e.nativeEvent);
    },
    [onWheelNative],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!profileMapNav || mapNavDisabled) return;
      e.preventDefault();
      if (preDetailViewportRef.current) {
        const saved = preDetailViewportRef.current;
        preDetailViewportRef.current = null;
        setViewport(saved.zoom, saved.pan);
        return;
      }
      preDetailViewportRef.current = { ...vpRef.current };
      zoomAtScreen(DOUBLE_CLICK_ZOOM_FACTOR, e.clientX, e.clientY);
    },
    [profileMapNav, mapNavDisabled, setViewport, zoomAtScreen],
  );

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
    onWheel: profileMapNav ? onWheel : undefined,
    onDoubleClick: profileMapNav ? onDoubleClick : undefined,
    onWheelNative,
    onPointerInside: bindPointerInside,
    onPointerOutside: bindPointerOutside,
    transform,
  };
}
