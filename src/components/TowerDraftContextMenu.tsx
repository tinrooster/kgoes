import { useCallback, useEffect } from "react";
import { useContextMenuPosition } from "../hooks/useContextMenuPosition";
import { useSchematicStore } from "../store";
import { type TowerFace } from "../towerDraftFaces";

export type TowerDraftContextMenuState =
  | {
      kind: "device";
      nodeId: string;
      screenX: number;
      screenY: number;
    }
  | {
      kind: "placement";
      pageId: string;
      placementId: string;
      deviceNodeId: string;
      plantLocationId?: string;
      towerFace?: TowerFace;
      screenX: number;
      screenY: number;
    };

interface TowerDraftContextMenuProps {
  menu: TowerDraftContextMenuState | null;
  onClose: () => void;
  onRemovePlacement?: (placementId: string) => void;
  onSetPlacementFace?: (placementId: string, face: TowerFace | undefined) => void;
}

export default function TowerDraftContextMenu({
  menu,
  onClose,
  onRemovePlacement,
  onSetPlacementFace,
}: TowerDraftContextMenuProps) {
  const { ref: menuRef, pos: menuPos } = useContextMenuPosition(
    menu?.screenX ?? 0,
    menu?.screenY ?? 0,
    [menu?.kind, menu?.kind === "device" ? menu.nodeId : menu?.placementId],
  );

  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);
  const requestSchematicFocus = useSchematicStore((s) => s.requestSchematicFocus);

  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("click", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  const run = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );

  if (!menu) return null;

  const focusInTrackIt = (plantLocationId?: string) => {
    if (!plantLocationId) return;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "KGO_ES_FOCUS_TOWER_LEVEL", payload: { plantLocationId } },
          "*",
        );
      }
    } catch {
      /* ignore */
    }
  };

  const currentFace = menu.kind === "placement" ? menu.towerFace : undefined;

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] min-w-[180px] rounded py-1 text-xs shadow-lg"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        maxHeight: menuPos.maxHeight,
        overflowY: menuPos.maxHeight ? "auto" : undefined,
        visibility: menuPos.ready ? "visible" : "hidden",
        background: "var(--ti-surface)",
        border: "1px solid var(--ti-border)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        label="Edit Properties…"
        onClick={() => run(() => setEditingNodeId(menu.kind === "device" ? menu.nodeId : menu.deviceNodeId))}
      />
      {menu.kind === "device" && (
        <MenuItem
          label="Show in Drawing"
          onClick={() => run(() => requestSchematicFocus(menu.nodeId))}
        />
      )}
      {menu.kind === "placement" && menu.plantLocationId && (
        <MenuItem label="Open in trackIT…" onClick={() => run(() => focusInTrackIt(menu.plantLocationId))} />
      )}
      {menu.kind === "placement" && onSetPlacementFace && (
        <>
          <div style={{ margin: "4px 0", borderTop: "1px solid var(--ti-border)" }} />
          <div
            style={{
              padding: "4px 10px 2px",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ti-muted)",
            }}
          >
            Face
          </div>
          <div style={{ display: "flex", gap: 4, padding: "2px 10px 4px" }}>
            {(["N", "E", "S", "W"] as TowerFace[]).map((f) => (
              <button
                key={f}
                type="button"
                style={{
                  width: 28,
                  height: 26,
                  borderRadius: 6,
                  border: `1px solid ${currentFace === f ? "var(--ti-accent)" : "var(--ti-border)"}`,
                  background: currentFace === f ? "var(--ti-accent-soft)" : "var(--ti-surface-2)",
                  color: currentFace === f ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--ti-font-sans)",
                }}
                onClick={() => run(() => onSetPlacementFace!(menu.placementId, f))}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              style={{
                height: 26,
                padding: "0 8px",
                borderRadius: 6,
                border: `1px solid ${currentFace == null ? "var(--ti-accent)" : "var(--ti-border)"}`,
                background: currentFace == null ? "var(--ti-accent-soft)" : "var(--ti-surface-2)",
                color: currentFace == null ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
                fontSize: 10.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--ti-font-sans)",
              }}
              onClick={() => run(() => onSetPlacementFace!(menu.placementId, undefined))}
            >
              Auto
            </button>
          </div>
        </>
      )}
      {menu.kind === "placement" && onRemovePlacement && (
        <>
          <div style={{ margin: "4px 0", borderTop: "1px solid var(--ti-border)" }} />
          <MenuItem
            label="Remove from elevation"
            danger
            onClick={() => run(() => onRemovePlacement(menu.placementId))}
          />
        </>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className="ti-row-hover w-full px-3 py-1.5 text-left cursor-pointer"
      style={{ color: danger ? "var(--ti-error, #dc2626)" : "var(--ti-ink)", fontFamily: "var(--ti-font-sans)" }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
