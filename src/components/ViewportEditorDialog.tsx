/**
 * Large minimap-style viewport editor — shaded viewport rectangles on the sheet,
 * drag to move and resize (custom viewports), click to preview on the main canvas.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useSchematicStore } from "../store";
import {
  isPersistedDrawingViewport,
  mergeDrawingViewportOptions,
  resolveActiveDrawingPage,
} from "../drawingPageUtils";
import {
  boundsToEditorRect,
  buildEditorLayout,
  clampBoundsToWorld,
  editorToFlow,
  editorMapWorldBounds,
  editorWorldPixelRect,
  flowBoundsFromViewport,
  presetFlowBounds,
  resizeBoundsSE,
  schematicNodeRects,
  translateBounds,
  VIEWPORT_EDITOR_COLORS,
  getSchematicCanvasSize,
  viewportFromFlowBounds,
  type EditorLayout,
} from "../drawingViewportBounds";
import { useDrawingViewportActions } from "../hooks/useDrawingViewportActions";
import type { ContentBounds } from "../viewNavUtils";
import type { DrawingViewportPreset } from "../types";
import { TiIcon } from "./ti/TiBase";
import { promptDialog } from "../appDialogStore";

interface ViewportEditorDialogProps {
  open: boolean;
  onClose: () => void;
}

type DragMode = "move" | "resize-se";

interface DragState {
  id: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startBounds: ContentBounds;
}

export default function ViewportEditorDialog({ open, onClose }: ViewportEditorDialogProps) {
  const rf = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(() => getSchematicCanvasSize());
  const [editorSize, setEditorSize] = useState({ w: 800, h: 500 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boundsOverrides, setBoundsOverrides] = useState<Record<string, ContentBounds>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [liveBounds, setLiveBounds] = useState<ContentBounds | null>(null);
  /** Unioned into map fit once per open — avoids jitter from live polling. */
  const [mapFitLiveBounds, setMapFitLiveBounds] = useState<ContentBounds | null>(null);

  const nodes = useSchematicStore((s) => s.nodes);
  const pages = useSchematicStore((s) => s.pages);
  const activePage = useSchematicStore((s) => s.activePage);
  const updateDrawingViewport = useSchematicStore((s) => s.updateDrawingViewport);
  const addDrawingViewport = useSchematicStore((s) => s.addDrawingViewport);
  const addToast = useSchematicStore((s) => s.addToast);

  const drawingPage = useMemo(
    () => resolveActiveDrawingPage(activePage, pages),
    [activePage, pages],
  );

  const viewportOptions = useMemo(
    () =>
      drawingPage
        ? mergeDrawingViewportOptions(drawingPage.viewports ?? [], nodes)
        : [],
    [drawingPage, nodes],
  );

  const { applyViewportPreset, viewportId, setViewportId } = useDrawingViewportActions();

  const world = useMemo(
    () => editorMapWorldBounds(nodes, viewportOptions, canvasSize, boundsOverrides, mapFitLiveBounds),
    [nodes, viewportOptions, canvasSize, boundsOverrides, mapFitLiveBounds],
  );
  const nodeRects = useMemo(() => schematicNodeRects(nodes), [nodes]);
  const aspect = canvasSize.w / Math.max(canvasSize.h, 1);

  const layout: EditorLayout | null = useMemo(() => {
    if (editorSize.w < 40 || editorSize.h < 40) return null;
    return buildEditorLayout(world, editorSize.w, editorSize.h);
  }, [world, editorSize]);

  const worldFrame = layout ? editorWorldPixelRect(layout) : null;

  const getBoundsForPreset = useCallback(
    (preset: DrawingViewportPreset): ContentBounds | null => {
      if (boundsOverrides[preset.id]) return boundsOverrides[preset.id];
      return presetFlowBounds(preset, nodes, canvasSize.w, canvasSize.h);
    },
    [boundsOverrides, canvasSize.h, canvasSize.w, nodes],
  );

  const commitBounds = useCallback(
    (id: string, bounds: ContentBounds, size: { w: number; h: number }) => {
      const pageId = drawingPage?.id;
      if (!pageId) return;
      const vp = viewportFromFlowBounds(bounds, size.w, size.h, {
        exact: true,
        maxZoom: 2,
        minZoom: 0.05,
      });
      updateDrawingViewport(pageId, id, {
        fit: "custom",
        viewport: vp,
      });
      return flowBoundsFromViewport(vp, size.w, size.h);
    },
    [drawingPage?.id, updateDrawingViewport],
  );

  const finishDrag = useCallback(
    (state: DragState, finalBounds: ContentBounds) => {
      const size = getSchematicCanvasSize();
      setCanvasSize(size);
      const clamped = clampBoundsToWorld(finalBounds, world);
      if (isPersistedDrawingViewport({ id: state.id })) {
        const verified = commitBounds(state.id, clamped, size);
        setBoundsOverrides((prev) => ({
          ...prev,
          [state.id]: verified ?? clamped,
        }));
      } else {
        setBoundsOverrides((prev) => ({ ...prev, [state.id]: clamped }));
      }
      setDrag(null);
    },
    [commitBounds, world],
  );

  useLayoutEffect(() => {
    if (!open) return;
    setCanvasSize(getSchematicCanvasSize());
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setEditorSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setEditorSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBoundsOverrides({});
    setSelectedId(viewportId);
    const size = getSchematicCanvasSize();
    setCanvasSize(size);
    const vp = rf.getViewport();
    setMapFitLiveBounds(flowBoundsFromViewport(vp, size.w, size.h));
  }, [open, drawingPage?.id, viewportId, rf]);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const vp = rf.getViewport();
      setLiveBounds(flowBoundsFromViewport(vp, canvasSize.w, canvasSize.h));
    };
    tick();
    const id = window.setInterval(tick, 120);
    return () => clearInterval(id);
  }, [open, rf, canvasSize.w, canvasSize.h]);

  useEffect(() => {
    if (!drag || !layout) return;
    const onMove = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const flow = editorToFlow(e.clientX - rect.left, e.clientY - rect.top, layout);
      const startFlow = editorToFlow(
        drag.startClientX - rect.left,
        drag.startClientY - rect.top,
        layout,
      );
      const dx = flow.x - startFlow.x;
      const dy = flow.y - startFlow.y;

      let next: ContentBounds;
      if (drag.mode === "move") {
        next = translateBounds(drag.startBounds, dx, dy);
      } else {
        next = resizeBoundsSE(drag.startBounds, flow.x, flow.y, aspect);
      }
      setBoundsOverrides((prev) => ({ ...prev, [drag.id]: next }));
    };
    const onUp = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const flow = editorToFlow(e.clientX - rect.left, e.clientY - rect.top, layout);
      const startFlow = editorToFlow(
        drag.startClientX - rect.left,
        drag.startClientY - rect.top,
        layout,
      );
      const dx = flow.x - startFlow.x;
      const dy = flow.y - startFlow.y;
      let final =
        drag.mode === "move"
          ? translateBounds(drag.startBounds, dx, dy)
          : resizeBoundsSE(drag.startBounds, flow.x, flow.y, aspect);
      finishDrag(drag, final);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [aspect, drag, finishDrag, layout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onAddFromCurrent = async () => {
    const pageId = drawingPage?.id;
    if (!pageId || !liveBounds) return;
    const label = await promptDialog({
      title: "Save viewport",
      label: "Name",
      defaultValue: "Saved view",
      confirmLabel: "Save",
    });
    if (!label) return;
    const size = getSchematicCanvasSize();
    const vp = viewportFromFlowBounds(liveBounds, size.w, size.h, { exact: true });
    const newId = addDrawingViewport(pageId, {
      label,
      fit: "custom",
      viewport: vp,
    });
    setSelectedId(newId);
    setViewportId(newId);
    addToast(`Saved viewport “${label}”`, "success");
  };

  if (!open || !drawingPage || !layout) return null;

  const panel = (
    <div
      role="dialog"
      aria-modal
      aria-label="Viewport editor"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "color-mix(in oklab, var(--ti-ink) 45%, transparent)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(96vw, 1100px)",
          height: "min(88vh, 720px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--ti-surface)",
          border: "1px solid var(--ti-border)",
          borderRadius: 12,
          boxShadow: "var(--ti-shadow-lg)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--ti-divider)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ti-ink)" }}>Viewport map</div>
            <div style={{ fontSize: 12, color: "var(--ti-muted)", marginTop: 2 }}>
              {drawingPage.label} — drag boxes to move; drag corner to resize. Double-click to go to a view.
            </div>
          </div>
          <button
            type="button"
            onClick={onAddFromCurrent}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              color: "var(--ti-ink-2)",
            }}
          >
            + From current view
          </button>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: 0,
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <TiIcon name="x" size={18} color="var(--ti-muted)" />
          </button>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <aside
            style={{
              width: 200,
              flexShrink: 0,
              borderRight: "1px solid var(--ti-divider)",
              overflow: "auto",
              padding: "8px 0",
            }}
          >
            {viewportOptions.map((vp, i) => {
              const colors = VIEWPORT_EDITOR_COLORS[i % VIEWPORT_EDITOR_COLORS.length];
              const editable = isPersistedDrawingViewport(vp);
              const active = selectedId === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setSelectedId(vp.id)}
                  onDoubleClick={() => {
                    setViewportId(vp.id);
                    applyViewportPreset(vp);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    border: 0,
                    background: active ? "var(--ti-accent-soft)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      border: `2px solid ${colors.stroke}`,
                      background: colors.fill,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--ti-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {vp.label}
                  </span>
                  {!editable && (
                    <span style={{ fontSize: 9, color: "var(--ti-faint)", textTransform: "uppercase" }}>auto</span>
                  )}
                </button>
              );
            })}
          </aside>

          <div
            ref={canvasRef}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              position: "relative",
              background: "var(--ti-bg)",
              cursor: drag ? "grabbing" : "default",
              overflow: "hidden",
            }}
          >
            {worldFrame && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: worldFrame.left,
                  top: worldFrame.top,
                  width: worldFrame.width,
                  height: worldFrame.height,
                  border: "1px solid var(--ti-border)",
                  borderRadius: 4,
                  boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--ti-surface) 60%, transparent)",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                zIndex: 2,
              }}
            >
            {/* Sheet grid */}
            <div
              style={{
                position: "absolute",
                ...(worldFrame
                  ? {
                      left: worldFrame.left,
                      top: worldFrame.top,
                      width: worldFrame.width,
                      height: worldFrame.height,
                    }
                  : { inset: 0 }),
                opacity: 0.35,
                backgroundImage:
                  "linear-gradient(var(--ti-divider) 1px, transparent 1px), linear-gradient(90deg, var(--ti-divider) 1px, transparent 1px)",
                backgroundSize: `${24 * layout.scale}px ${24 * layout.scale}px`,
                backgroundPosition: `${layout.offsetX % (24 * layout.scale)}px ${layout.offsetY % (24 * layout.scale)}px`,
                pointerEvents: "none",
              }}
            />

            {/* Node thumbnails */}
            {nodeRects.map((nr) => {
              const r = boundsToEditorRect(
                { minX: nr.x, minY: nr.y, maxX: nr.x + nr.w, maxY: nr.y + nr.h },
                layout,
              );
              return (
                <div
                  key={nr.id}
                  title={nr.label}
                  style={{
                    position: "absolute",
                    left: r.left,
                    top: r.top,
                    width: r.width,
                    height: r.height,
                    background:
                      nr.kind === "room"
                        ? "color-mix(in oklab, var(--ti-ink-2) 12%, transparent)"
                        : "color-mix(in oklab, var(--ti-accent) 18%, transparent)",
                    border: `1px solid ${nr.kind === "room" ? "var(--ti-border)" : "color-mix(in oklab, var(--ti-accent) 35%, transparent)"}`,
                    borderRadius: nr.kind === "room" ? 4 : 2,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {/* Saved viewports */}
            {viewportOptions.map((vp, i) => {
              const bounds = getBoundsForPreset(vp);
              if (!bounds) return null;
              const colors = VIEWPORT_EDITOR_COLORS[i % VIEWPORT_EDITOR_COLORS.length];
              const r = boundsToEditorRect(bounds, layout);
              const editable = isPersistedDrawingViewport(vp);
              const active = selectedId === vp.id;

              const startDrag = (mode: DragMode, e: React.PointerEvent) => {
                if (!editable) return;
                e.stopPropagation();
                e.preventDefault();
                const size = getSchematicCanvasSize();
                setCanvasSize(size);
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setSelectedId(vp.id);
                setDrag({
                  id: vp.id,
                  mode,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startBounds: bounds,
                });
              };

              return (
                <div
                  key={vp.id}
                  role="button"
                  tabIndex={0}
                  title={vp.label}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).dataset.handle === "resize") return;
                    startDrag("move", e);
                  }}
                  onClick={() => setSelectedId(vp.id)}
                  onDoubleClick={() => {
                    setViewportId(vp.id);
                    applyViewportPreset(vp);
                  }}
                  style={{
                    position: "absolute",
                    left: r.left,
                    top: r.top,
                    width: r.width,
                    height: r.height,
                    border: `${active ? 2.5 : 1.5}px solid ${colors.stroke}`,
                    background: colors.fill,
                    borderRadius: 3,
                    boxSizing: "border-box",
                    cursor: editable ? "grab" : "pointer",
                    zIndex: active ? 20 : 10 + i,
                    pointerEvents: "auto",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: colors.stroke,
                      textShadow: "0 0 4px var(--ti-surface)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {vp.label}
                  </span>
                  {editable && active && (
                    <span
                      data-handle="resize"
                      onPointerDown={(e) => startDrag("resize-se", e)}
                      style={{
                        position: "absolute",
                        right: 3,
                        bottom: 3,
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: colors.stroke,
                        border: "2px solid var(--ti-surface)",
                        cursor: "nwse-resize",
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Live main-canvas view (dashed) */}
            {liveBounds && (
              <div
                style={{
                  position: "absolute",
                  ...boundsToEditorRect(liveBounds, layout),
                  border: "2px dashed var(--ti-ink-2)",
                  background: "color-mix(in oklab, var(--ti-ink-2) 8%, transparent)",
                  borderRadius: 3,
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 4,
                    fontSize: 9,
                    fontWeight: 600,
                    color: "var(--ti-muted)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Live
                </span>
              </div>
            )}
            </div>
          </div>
        </div>

        <footer
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--ti-divider)",
            fontSize: 11.5,
            color: "var(--ti-muted)",
            flexShrink: 0,
          }}
        >
          Custom viewports keep the same aspect as your drawing window ({canvasSize.w}×{canvasSize.h}). Room and overview frames are read-only; save a new viewport to edit freely.
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
