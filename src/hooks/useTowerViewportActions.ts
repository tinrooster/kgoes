import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import {
  TOWER_VIEWPORT_APPLY_EVENT,
  TOWER_VIEWPORT_REDEFINE_EVENT,
  TOWER_VIEWPORT_SAVE_EVENT,
} from "../towerViewportEvents";
import { getTowerViewportHandle } from "../towerViewportController";
import { isPersistedTowerViewport, mergeTowerViewportOptions } from "../towerViewportUtils";
import type { TowerDraftPage, TowerDraftViewportPreset } from "../types";
import { confirmDialog, promptDialog } from "../appDialogStore";

function activeTowerPage(
  activePage: string,
  pages: { id: string; type: string }[],
): TowerDraftPage | undefined {
  const page = pages.find((p) => p.id === activePage);
  return page?.type === "tower-draft" ? (page as TowerDraftPage) : undefined;
}

export function useTowerViewportActions() {
  const [viewportId, setViewportId] = useState("overview");
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const addTowerDraftViewport = useSchematicStore((s) => s.addTowerDraftViewport);
  const updateTowerDraftViewport = useSchematicStore((s) => s.updateTowerDraftViewport);
  const removeTowerDraftViewport = useSchematicStore((s) => s.removeTowerDraftViewport);
  const addToast = useSchematicStore((s) => s.addToast);

  const towerPage = useMemo(
    () => activeTowerPage(activePage, pages),
    [activePage, pages],
  );

  const viewportOptions = useMemo(
    () => mergeTowerViewportOptions(towerPage?.viewports),
    [towerPage?.viewports],
  );

  const applyViewportPreset = useCallback(
    (preset: TowerDraftViewportPreset) => {
      if (!towerPage) return;
      setViewportId(preset.id);
      const handle = getTowerViewportHandle(towerPage.id);
      if (!handle) return;
      if (preset.fit === "all" || !preset.viewport) {
        handle.fitOverview();
        return;
      }
      handle.applyViewport({
        zoom: preset.viewport.zoom,
        pan: { x: preset.viewport.x, y: preset.viewport.y },
      });
    },
    [towerPage],
  );

  const applyViewportById = useCallback(
    (pageId: string, id: string) => {
      if (!towerPage || towerPage.id !== pageId) return;
      const preset = viewportOptions.find((v) => v.id === id);
      if (preset) applyViewportPreset(preset);
    },
    [applyViewportPreset, towerPage, viewportOptions],
  );

  const saveViewport = useCallback(async () => {
    const pageId = towerPage?.id;
    const handle = getTowerViewportHandle(pageId);
    if (!pageId || !handle) {
      addToast("Open a tower elevation tab to save a viewport", "info");
      return;
    }
    const label = await promptDialog({
      title: "Save viewport",
      label: "Name",
      defaultValue: "Saved view",
      confirmLabel: "Save",
    });
    if (!label) return;
    const vp = handle.getViewport();
    const elevationView = handle.getElevationView();
    const newId = addTowerDraftViewport(pageId, {
      label,
      fit: "custom",
      elevationView:
        elevationView === "profile" || elevationView === "all-faces" || elevationView === "site"
          ? elevationView
          : "profile",
      viewport: { x: vp.pan.x, y: vp.pan.y, zoom: vp.zoom },
    });
    setViewportId(newId);
    addToast(`Saved viewport “${label}”`, "success");
  }, [addTowerDraftViewport, addToast, towerPage?.id]);

  useEffect(() => {
    setViewportId("overview");
  }, [towerPage?.id]);

  const renameViewport = useCallback(
    async (pageId: string, id: string, currentLabel: string) => {
      if (!isPersistedTowerViewport({ id, fit: "custom" })) return;
      const label = await promptDialog({
        title: "Rename viewport",
        label: "Name",
        defaultValue: currentLabel,
        confirmLabel: "Rename",
      });
      if (!label || label === currentLabel) return;
      updateTowerDraftViewport(pageId, id, { label });
      addToast(`Renamed viewport to “${label}”`, "success");
    },
    [addToast, updateTowerDraftViewport],
  );

  const redefineViewport = useCallback(
    (pageId: string, id: string) => {
      if (!isPersistedTowerViewport({ id, fit: "custom" })) return;
      const handle = getTowerViewportHandle(pageId);
      if (!handle) return;
      const vp = handle.getViewport();
      const elevationView = handle.getElevationView();
      const normalizedElevationView:
        | "profile"
        | "all-faces"
        | "site" =
        elevationView === "profile" || elevationView === "all-faces" || elevationView === "site"
          ? elevationView
          : "profile";
      updateTowerDraftViewport(pageId, id, {
        fit: "custom",
        elevationView: normalizedElevationView,
        viewport: { x: vp.pan.x, y: vp.pan.y, zoom: vp.zoom },
      });
      setViewportId(id);
      addToast("Viewport updated to the current pan and zoom", "success");
    },
    [addToast, updateTowerDraftViewport],
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
      removeTowerDraftViewport(pageId, id);
      if (viewportId === id) setViewportId("overview");
      addToast(`Deleted viewport “${label}”`, "info");
    },
    [addToast, removeTowerDraftViewport, viewportId],
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
    window.addEventListener(TOWER_VIEWPORT_SAVE_EVENT, onSave);
    window.addEventListener(TOWER_VIEWPORT_APPLY_EVENT, onApply);
    window.addEventListener(TOWER_VIEWPORT_REDEFINE_EVENT, onRedefine);
    return () => {
      window.removeEventListener(TOWER_VIEWPORT_SAVE_EVENT, onSave);
      window.removeEventListener(TOWER_VIEWPORT_APPLY_EVENT, onApply);
      window.removeEventListener(TOWER_VIEWPORT_REDEFINE_EVENT, onRedefine);
    };
  }, [applyViewportById, redefineViewport, saveViewport]);

  return {
    towerPage,
    viewportOptions,
    viewportId,
    setViewportId,
    applyViewportPreset,
    applyViewportById,
    saveViewport,
    renameViewport,
    redefineViewport,
    deleteViewport,
    isPersistedViewport: isPersistedTowerViewport,
  };
}
