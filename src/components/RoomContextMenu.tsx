import { useEffect, useCallback } from "react";
import { useSchematicStore } from "../store";
import type { RoomData } from "../types";
import { useContextMenuPosition } from "../hooks/useContextMenuPosition";

export default function RoomContextMenu() {
  const menu = useSchematicStore((s) => s.roomContextMenu);
  const { ref: menuRef, pos: menuPos } = useContextMenuPosition(
    menu?.screenX ?? 0,
    menu?.screenY ?? 0,
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => useSchematicStore.setState({ roomContextMenu: null });
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

  const editProperties = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().setEditingNodeId(menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const toggleLock = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().toggleRoomLock(menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const isolateRoom = useCallback(() => {
    if (!menu) return;
    const state = useSchematicStore.getState();
    state.setRoomSolo(state.roomSolo === menu.nodeId ? "" : menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const hideRoom = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().toggleRoomLayerVisibility(menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const focusRoom = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().requestSchematicFocus(menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const autoFitRoom = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().autoFitUnlockedRooms();
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const toggleEquipmentRack = useCallback(() => {
    if (!menu) return;
    useSchematicStore.getState().toggleEquipmentRack(menu.nodeId);
    useSchematicStore.setState({ roomContextMenu: null });
  }, [menu]);

  const deleteRoom = useCallback(() => {
    if (!menu) return;
    useSchematicStore.setState({ roomContextMenu: null });
    useSchematicStore.getState().deleteNode(menu.nodeId);
  }, [menu]);

  const deleteRoomAndContents = useCallback(() => {
    if (!menu) return;
    useSchematicStore.setState({ roomContextMenu: null });
    useSchematicStore.getState().deleteNodeAndChildren(menu.nodeId);
  }, [menu]);

  if (!menu) return null;

  const node = useSchematicStore.getState().nodes.find((n) => n.id === menu.nodeId);
  const roomData = node?.data as RoomData | undefined;
  const isLocked = !!roomData?.locked;
  const isEquipmentRack = !!roomData?.isEquipmentRack;
  const roomSolo = useSchematicStore.getState().roomSolo;
  const hiddenRoomIds = useSchematicStore.getState().hiddenRoomIds;
  const isHidden = hiddenRoomIds.split(",").filter(Boolean).includes(menu.nodeId);
  const isSolo = roomSolo === menu.nodeId;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: menuPos.x,
        top: menuPos.y,
        maxHeight: menuPos.maxHeight,
        overflowY: menuPos.maxHeight ? "auto" : undefined,
        visibility: menuPos.ready ? "visible" : "hidden",
        zIndex: 50,
        minWidth: 188,
        padding: "4px 0",
        borderRadius: 10,
        border: "1px solid var(--ti-border)",
        background: "var(--ti-surface)",
        boxShadow: "var(--ti-shadow-md)",
        fontFamily: "var(--ti-font-sans)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem label="Edit properties…" onClick={editProperties} />
      <MenuItem label="Focus viewport" onClick={focusRoom} />
      <MenuItem label={isSolo ? "Clear room solo" : "Isolate room"} onClick={isolateRoom} />
      <MenuItem label={isHidden ? "Show room" : "Hide room"} onClick={hideRoom} />
      <MenuItem label={isLocked ? "Unlock frame" : "Lock frame"} onClick={toggleLock} />
      {!isLocked && <MenuItem label="Auto-fit frame" onClick={autoFitRoom} />}
      <MenuItem
        label={isEquipmentRack ? "Remove equipment rack" : "Mark as equipment rack"}
        onClick={toggleEquipmentRack}
      />
      <div style={{ height: 1, background: "var(--ti-divider)", margin: "4px 0" }} />
      <MenuItem label="Delete room" onClick={deleteRoom} danger />
      <MenuItem label="Delete room & contents" onClick={deleteRoomAndContents} danger />
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "7px 12px",
        border: 0,
        background: "transparent",
        textAlign: "left",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        color: danger ? "var(--ti-danger)" : "var(--ti-ink-2)",
        fontFamily: "var(--ti-font-sans)",
      }}
      className={danger ? undefined : "ti-row-hover"}
    >
      {label}
    </button>
  );
}
