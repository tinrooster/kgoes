import { useCallback, useEffect, useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSchematicStore } from "../store";
import {
  boundsForDrawingViewport,
  isPersistedDrawingViewport,
  mergeDrawingViewportOptions,
  resolveActiveDrawingPage,
} from "../drawingPageUtils";
import {
  DRAWING_VIEWPORT_APPLY_EVENT,
  DRAWING_VIEWPORT_REDEFINE_EVENT,
  DRAWING_VIEWPORT_SAVE_EVENT,
} from "../drawingViewportEvents";
import { computeFitViewport } from "../viewNavUtils";
import type { DrawingViewportPreset } from "../types";
import { confirmDialog, promptDialog } from "../appDialogStore";

export function useDrawingViewportActions() {
  const rf = useReactFlow();
  const { fitView, setViewport: setFlowViewport } = rf;
  const [viewportId, setViewportId] = useState("overview");

  const nodes = useSchematicStore((s) => s.nodes);
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const requestSchematicFocus = useSchematicStore((s) => s.requestSchematicFocus);
  const addDrawingViewport = useSchematicStore((s) => s.addDrawingViewport);
  const updateDrawingViewport = useSchematicStore((s) => s.updateDrawingViewport);
  const removeDrawingViewport = useSchematicStore((s) => s.removeDrawingViewport);
  const addToast = useSchematicStore((s) => s.addToast);

  const drawingPage = useMemo(
    () => resolveActiveDrawingPage(activePage, pages),
    [activePage, pages],
  );

  const viewportOptions = useMemo(
    () =>
      drawingPage
        ? mergeDrawingViewportOptions(drawingPage.viewports, nodes)
        : [{ id: "overview", label: "Overview", fit: "all" as const }],
    [drawingPage, nodes],
  );

  const applyViewportPreset = useCallback(
    (preset: DrawingViewportPreset) => {
      setViewportId(preset.id);
      if (preset.fit === "room" && preset.roomNodeId) {
        requestSchematicFocus(preset.roomNodeId);
        return;
      }
      if (preset.fit === "custom" && preset.viewport) {
        setFlowViewport(preset.viewport, { duration: 250 });
        return;
      }
      const host = document.querySelector(".react-flow__viewport")?.parentElement;
      const bounds = boundsForDrawingViewport(preset, nodes);
      if (host && bounds) {
        const { zoom: z, pan } = computeFitViewport(host.clientWidth, host.clientHeight, bounds, {
          padding: 48,
          maxZoom: 1.5,
        });
        setFlowViewport({ x: pan.x, y: pan.y, zoom: z }, { duration: 250 });
        return;
      }
      fitView({ duration: 250, padding: 0.1 });
    },
    [fitView, nodes, requestSchematicFocus, setFlowViewport],
  );

  const applyViewportById = useCallback(
    (pageId: string, id: string) => {
      if (!drawingPage || drawingPage.id !== pageId) return;
      const preset = viewportOptions.find((v) => v.id === id);
      if (preset) applyViewportPreset(preset);
    },
    [applyViewportPreset, drawingPage, viewportOptions],
  );

  const saveViewport = useCallback(async () => {
    const pageId = drawingPage?.id;
    if (!pageId) {
      addToast("Open a drawing tab to save a viewport", "info");
      return;
    }
    const label = await promptDialog({
      title: "Save viewport",
      label: "Name",
      defaultValue: "Saved view",
      confirmLabel: "Save",
    });
    if (!label) return;
    const vp = rf.getViewport();
    const newId = addDrawingViewport(pageId, {
      label,
      fit: "custom",
      viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
    });
    setViewportId(newId);
    addToast(`Saved viewport “${label}”`, "success");
  }, [addDrawingViewport, addToast, drawingPage, rf]);

  useEffect(() => {
    setViewportId("overview");
  }, [drawingPage?.id]);

  const renameViewport = useCallback(
    async (pageId: string, id: string, currentLabel: string) => {
      if (!isPersistedDrawingViewport({ id })) return;
      const label = await promptDialog({
        title: "Rename viewport",
        label: "Name",
        defaultValue: currentLabel,
        confirmLabel: "Rename",
      });
      if (!label || label === currentLabel) return;
      updateDrawingViewport(pageId, id, { label });
      addToast(`Renamed viewport to “${label}”`, "success");
    },
    [addToast, updateDrawingViewport],
  );

  const redefineViewport = useCallback(
    (pageId: string, id: string) => {
      if (!isPersistedDrawingViewport({ id })) return;
      const vp = rf.getViewport();
      updateDrawingViewport(pageId, id, {
        fit: "custom",
        viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
      });
      setViewportId(id);
      addToast("Viewport updated to the current pan and zoom", "success");
    },
    [addToast, rf, updateDrawingViewport],
  );

  const deleteViewport = useCallback(
    async (pageId: string, id: string, label: string) => {
      if (id === "overview") return;
      const ok = await confirmDialog({
        title: "Delete viewport",
        message: `Delete viewport “${label}”?`,
        tone: "danger",
        confirmLabel: "Delete",
      });
      if (!ok) return;
      removeDrawingViewport(pageId, id);
      if (viewportId === id) setViewportId("overview");
      addToast(`Deleted viewport “${label}”`, "info");
    },
    [addToast, removeDrawingViewport, viewportId],
  );

  useEffect(() => {
    const onSave = () => saveViewport();
    const onApply = (e: Event) => {
      const { pageId, viewportId: vpId } = (e as CustomEvent<{ pageId: string; viewportId: string }>).detail;
      applyViewportById(pageId, vpId);
    };
    const onRedefine = (e: Event) => {
      const { pageId, viewportId: vpId } = (e as CustomEvent<{ pageId: string; viewportId: string }>).detail;
      redefineViewport(pageId, vpId);
    };
    window.addEventListener(DRAWING_VIEWPORT_SAVE_EVENT, onSave);
    window.addEventListener(DRAWING_VIEWPORT_APPLY_EVENT, onApply);
    window.addEventListener(DRAWING_VIEWPORT_REDEFINE_EVENT, onRedefine);
    return () => {
      window.removeEventListener(DRAWING_VIEWPORT_SAVE_EVENT, onSave);
      window.removeEventListener(DRAWING_VIEWPORT_APPLY_EVENT, onApply);
      window.removeEventListener(DRAWING_VIEWPORT_REDEFINE_EVENT, onRedefine);
    };
  }, [applyViewportById, redefineViewport, saveViewport]);

  return {
    drawingPage,
    viewportOptions,
    viewportId,
    setViewportId,
    applyViewportPreset,
    applyViewportById,
    saveViewport,
    renameViewport,
    redefineViewport,
    deleteViewport,
    isPersistedViewport: isPersistedDrawingViewport,
  };
}
