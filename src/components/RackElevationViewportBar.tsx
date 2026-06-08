/**
 * Rack elevation viewport picker — saved pan/zoom presets (overview, rows, racks).
 */

import { memo, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import type { RackElevationPage, RackElevationViewportPreset } from "../types";
import {
  boundsForRackElevationViewport,
  isPersistedRackElevationViewport,
  mergeRackElevationViewportOptions,
} from "../rackElevationViewportUtils";
import { computeFitViewport } from "../viewNavUtils";
import { TiIcon } from "./ti/TiBase";
import { confirmDialog, promptDialog } from "../appDialogStore";

interface Props {
  page: RackElevationPage;
  maxHeightU: number;
  getContainerSize: () => { width: number; height: number } | null;
  getViewport: () => { x: number; y: number; zoom: number };
  applyViewport: (zoom: number, pan: { x: number; y: number }) => void;
}

function RackElevationViewportBar({
  page,
  maxHeightU,
  getContainerSize,
  getViewport,
  applyViewport,
}: Props) {
  const [viewportId, setViewportId] = useState("overview");
  const addRackElevationViewport = useSchematicStore((s) => s.addRackElevationViewport);
  const updateRackElevationViewport = useSchematicStore((s) => s.updateRackElevationViewport);
  const removeRackElevationViewport = useSchematicStore((s) => s.removeRackElevationViewport);
  const addToast = useSchematicStore((s) => s.addToast);

  const viewportOptions = useMemo(
    () => mergeRackElevationViewportOptions(page.viewports ?? [], page.racks),
    [page.viewports, page.racks],
  );

  const applyPreset = (preset: RackElevationViewportPreset) => {
    setViewportId(preset.id);
    if (preset.fit === "custom" && preset.viewport) {
      applyViewport(preset.viewport.zoom, { x: preset.viewport.x, y: preset.viewport.y });
      return;
    }
    const host = getContainerSize();
    const bounds = boundsForRackElevationViewport(preset, page.racks, maxHeightU);
    if (!host || !bounds) return;
    const { zoom, pan } = computeFitViewport(host.width, host.height, bounds, {
      padding: 48,
      maxZoom: 1.5,
      minZoom: 0.25,
    });
    applyViewport(zoom, pan);
  };

  const saveViewport = async () => {
    const label = await promptDialog({
      title: "Save rack viewport",
      label: "Name",
      defaultValue: "Saved view",
      confirmLabel: "Save",
    });
    if (!label) return;
    const vp = getViewport();
    const newId = addRackElevationViewport(page.id, {
      label,
      fit: "custom",
      viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
    });
    setViewportId(newId);
    addToast(`Viewport “${label}” saved`, "success");
  };

  const selectStyle: React.CSSProperties = {
    height: 30,
    padding: "0 10px",
    borderRadius: 9,
    border: "1px solid var(--ti-border)",
    background: "color-mix(in oklab, var(--ti-surface) 92%, transparent)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    boxShadow: "var(--ti-shadow-sm)",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ti-ink-2)",
    fontFamily: "var(--ti-font-sans)",
    cursor: "pointer",
    maxWidth: 168,
  };

  const iconBtnStyle: React.CSSProperties = {
    ...selectStyle,
    width: 30,
    padding: 0,
    display: "grid",
    placeItems: "center",
    maxWidth: 30,
  };

  if (page.racks.length === 0) return null;

  return (
    <div
      data-print-hide
      style={{
        position: "absolute",
        left: 14,
        top: 14,
        display: "flex",
        gap: 6,
        alignItems: "center",
        zIndex: 20,
      }}
    >
      <select
        value={viewportId}
        onChange={(e) => {
          const preset = viewportOptions.find((v) => v.id === e.target.value);
          if (preset) applyPreset(preset);
        }}
        title="Jump to a saved rack view (overview, row, rack, or custom)"
        style={selectStyle}
      >
        {viewportOptions.map((v) => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>
      <button
        type="button"
        title="Save current pan/zoom as a viewport"
        onClick={() => void saveViewport()}
        style={iconBtnStyle}
      >
        <TiIcon name="plus" size={14} color="var(--ti-muted)" />
      </button>
      {isPersistedRackElevationViewport(
        viewportOptions.find((v) => v.id === viewportId) ?? { id: viewportId, fit: "all" },
      ) && (
        <>
          <button
            type="button"
            title="Update viewport to current pan/zoom"
            onClick={() => {
              const vp = getViewport();
              updateRackElevationViewport(page.id, viewportId, {
                viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
              });
              addToast("Viewport updated", "success");
            }}
            style={iconBtnStyle}
          >
            <TiIcon name="refresh" size={14} color="var(--ti-muted)" />
          </button>
          <button
            type="button"
            title="Delete viewport"
            onClick={async () => {
              const preset = viewportOptions.find((v) => v.id === viewportId);
              if (!preset) return;
              const ok = await confirmDialog({
                title: "Delete viewport",
                message: `Remove “${preset.label}”?`,
                tone: "danger",
                confirmLabel: "Delete",
              });
              if (!ok) return;
              removeRackElevationViewport(page.id, viewportId);
              setViewportId("overview");
              applyPreset(viewportOptions.find((v) => v.id === "overview") ?? viewportOptions[0]);
            }}
            style={iconBtnStyle}
          >
            <TiIcon name="trash" size={14} color="var(--ti-muted)" />
          </button>
        </>
      )}
    </div>
  );
}

export default memo(RackElevationViewportBar);
