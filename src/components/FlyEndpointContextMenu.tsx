import { useEffect, useCallback } from "react";
import { useSchematicStore } from "../store";
import type { FlyEndpointData } from "../types";
import { useContextMenuPosition } from "../hooks/useContextMenuPosition";
import { isTrackItPopupSession, requestOpenTrackItDrawing } from "../trackitIntegration";

export default function FlyEndpointContextMenu() {
  const menu = useSchematicStore((s) => s.flyEndpointContextMenu);
  const { ref: menuRef, pos: menuPos } = useContextMenuPosition(
    menu?.screenX ?? 0,
    menu?.screenY ?? 0,
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => useSchematicStore.setState({ flyEndpointContextMenu: null });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = setTimeout(() => {
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
  }, [menu]);

  const edit = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().setEditingFlyEndpointId(menu.nodeId);
    useSchematicStore.setState({ flyEndpointContextMenu: null });
  }, [menu]);

  const openRemote = useCallback(() => {
    if (!menu) return;
    const node = useSchematicStore.getState().nodes.find((n) => n.id === menu.nodeId);
    const data = node?.data as FlyEndpointData | undefined;
    if (data?.remoteDwgNumber.trim()) {
      requestOpenTrackItDrawing({
        dwgNumber: data.remoteDwgNumber.trim(),
        remoteDrawingId: data.remoteDrawingId,
      });
    }
    useSchematicStore.setState({ flyEndpointContextMenu: null });
  }, [menu]);

  const remove = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().deleteFlyEndpoint(menu.nodeId);
    useSchematicStore.setState({ flyEndpointContextMenu: null });
  }, [menu]);

  if (!menu) return null;

  const node = useSchematicStore.getState().nodes.find((n) => n.id === menu.nodeId);
  const data = node?.data as FlyEndpointData | undefined;
  const canOpen = isTrackItPopupSession() && !!data?.remoteDwgNumber.trim();

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded border border-gray-300 bg-white py-1 shadow-lg"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        maxHeight: menuPos.maxHeight,
        overflowY: menuPos.maxHeight ? "auto" : undefined,
        visibility: menuPos.ready ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem label="Edit fly endpoint…" onClick={edit} />
      {canOpen && <MenuItem label={`Open DWG ${data!.remoteDwgNumber.trim()}`} onClick={openRemote} />}
      <div className="my-1 border-t border-gray-200" />
      <MenuItem label="Delete" onClick={remove} danger />
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
      className={`w-full cursor-pointer px-3 py-1.5 text-left text-xs ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
