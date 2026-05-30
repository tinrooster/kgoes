import { useCallback, useEffect } from "react";
import { useContextMenuPosition } from "../hooks/useContextMenuPosition";
import { useSchematicStore } from "../store";

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
      screenX: number;
      screenY: number;
    };

interface TowerDraftContextMenuProps {
  menu: TowerDraftContextMenuState | null;
  onClose: () => void;
  onRemovePlacement?: (placementId: string) => void;
}

export default function TowerDraftContextMenu({
  menu,
  onClose,
  onRemovePlacement,
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

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] min-w-[180px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-xs shadow-lg"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        maxHeight: menuPos.maxHeight,
        overflowY: menuPos.maxHeight ? "auto" : undefined,
        visibility: menuPos.ready ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        label="Edit Properties..."
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
      {menu.kind === "placement" && onRemovePlacement && (
        <>
          <div className="my-1 border-t border-[var(--color-border)]" />
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
      className={`w-full px-3 py-1.5 text-left cursor-pointer hover:bg-[var(--color-surface-hover)] ${
        danger ? "text-red-600 dark:text-red-400" : "text-[var(--color-text)]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
