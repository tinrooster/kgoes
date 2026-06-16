/**
 * Floating viewport controls for tower elevation canvas (mirrors drawing canvas toolbar).
 */

import { memo } from "react";
import { isPersistedTowerViewport } from "../towerViewportUtils";
import { dispatchOpenTowerViewportEditor } from "../towerViewportEvents";
import { useTowerViewportActions } from "../hooks/useTowerViewportActions";
import { TiIcon } from "./ti/TiBase";

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
  maxWidth: 160,
};

function TowerCanvasToolbar() {
  const {
    towerPage,
    viewportOptions,
    viewportId,
    setViewportId,
    applyViewportPreset,
    saveViewport,
    renameViewport,
    redefineViewport,
    deleteViewport,
  } = useTowerViewportActions();

  if (!towerPage) return null;

  const pageId = towerPage.id;

  const onViewportChange = (value: string) => {
    const preset = viewportOptions.find((v) => v.id === value);
    if (preset) applyViewportPreset(preset);
    else setViewportId(value);
  };

  return (
    <div
      data-print-hide
      style={{
        position: "absolute",
        left: 14,
        top: 14,
        zIndex: 10,
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        value={viewportId}
        onChange={(e) => onViewportChange(e.target.value)}
        title="Jump to a saved tower viewport"
        style={selectStyle}
      >
        {viewportOptions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        title="Viewport map — preview saved pan/zoom bands on the tower"
        onClick={() => dispatchOpenTowerViewportEditor()}
        style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
      >
        <TiIcon name="layers" size={14} color="var(--ti-muted)" />
      </button>
      <button
        type="button"
        title="Save viewport — named pan/zoom on this tower view"
        onClick={saveViewport}
        style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
      >
        <TiIcon name="plus" size={14} color="var(--ti-muted)" />
      </button>
      {viewportOptions.some((v) => isPersistedTowerViewport(v) && v.id === viewportId) && (
        <>
          <button
            type="button"
            title="Redefine viewport — update to current pan/zoom"
            onClick={() => redefineViewport(pageId, viewportId)}
            style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
          >
            <TiIcon name="refresh" size={14} color="var(--ti-muted)" />
          </button>
          <button
            type="button"
            title="Rename viewport"
            onClick={() => {
              const vp = viewportOptions.find((v) => v.id === viewportId);
              if (vp) renameViewport(pageId, viewportId, vp.label);
            }}
            style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
          >
            <TiIcon name="edit" size={14} color="var(--ti-muted)" />
          </button>
          <button
            type="button"
            title="Delete viewport"
            onClick={() => {
              const vp = viewportOptions.find((v) => v.id === viewportId);
              if (vp) deleteViewport(pageId, viewportId, vp.label);
            }}
            style={{ ...selectStyle, width: 30, padding: 0, display: "grid", placeItems: "center", maxWidth: 30 }}
          >
            <TiIcon name="trash" size={14} color="var(--ti-muted)" />
          </button>
        </>
      )}
    </div>
  );
}

export default memo(TowerCanvasToolbar);
