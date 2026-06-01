/**
 * KgoLayersPanel — Signal layers + Container (room/rack) layers panel.
 * Implements the design v2 Layers tab from layers-panel.jsx.
 */

import { useEffect, useRef, useState } from "react";
import { useSchematicStore } from "../store";
import { EMPTY_SIGNAL_COLOR_OVERRIDES } from "../signalColors";
import { SIGNAL_LABELS, SIGNAL_COLORS } from "../types";
import type { RoomData, SchematicNode, SignalType } from "../types";
import { TiIcon } from "./ti/TiBase";

const ROOM_COLORS = [
  "oklch(56% 0.10 235)",
  "oklch(58% 0.12 300)",
  "oklch(56% 0.11 150)",
  "oklch(64% 0.13 65)",
  "oklch(56% 0.13 20)",
];

function EyeOn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.9 4.6A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a13.4 13.4 0 0 1-3 3.5M6 6.3A13.3 13.3 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 3-.4" />
    </svg>
  );
}

function SoloDot() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

function LockClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LockOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

function Grip() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function LayerIconBtn({
  on, tone = "accent", title, children, onClick,
}: {
  on?: boolean;
  tone?: string;
  title: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: 24, height: 24,
        display: "grid", placeItems: "center",
        border: 0,
        background: on
          ? `color-mix(in oklab, var(--ti-${tone}) 16%, transparent)`
          : "transparent",
        borderRadius: 6,
        cursor: "pointer",
        color: on
          ? `var(--ti-${tone}-ink, var(--ti-accent))`
          : "var(--ti-faint)",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Group({
  title, hint, onClear, children,
}: {
  title: string;
  hint?: string;
  onClear?: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 7px" }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--ti-muted)",
          fontFamily: "var(--ti-font-sans)",
        }}>{title}</span>
        {onClear
          ? <button type="button" onClick={onClear} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ti-warning)", border: 0, background: "transparent", cursor: "pointer", fontFamily: "var(--ti-font-sans)" }}>clear solo</button>
          : hint ? <span style={{ fontSize: 10.5, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>{hint}</span> : null
        }
      </div>
      {children}
    </div>
  );
}

function isDescendantOfRoom(node: SchematicNode, roomId: string, nodes: SchematicNode[]): boolean {
  let pid = node.parentId;
  while (pid) {
    if (pid === roomId) return true;
    const parent = nodes.find((n) => n.id === pid);
    if (!parent) break;
    pid = parent.parentId;
  }
  return false;
}

function countNodesInRoom(roomId: string, nodes: SchematicNode[]): number {
  return nodes.filter((n) => n.type === "device" && isDescendantOfRoom(n, roomId, nodes)).length;
}

export function KgoLayersPanel() {
  const edges = useSchematicStore((s) => s.edges);
  const nodes = useSchematicStore((s) => s.nodes);
  const signalColorOverrides = useSchematicStore((s) => s.signalColors ?? EMPTY_SIGNAL_COLOR_OVERRIDES);
  const hiddenSignalTypes = useSchematicStore((s) => s.hiddenSignalTypes);
  const toggleSignalTypeVisibility = useSchematicStore((s) => s.toggleSignalTypeVisibility);
  const showContainers = useSchematicStore((s) => s.showContainers);
  const setShowContainers = useSchematicStore((s) => s.setShowContainers);
  const sigSolo = useSchematicStore((s) => s.sigSolo);
  const setSigSolo = useSchematicStore((s) => s.setSigSolo);
  const roomSolo = useSchematicStore((s) => s.roomSolo);
  const setRoomSolo = useSchematicStore((s) => s.setRoomSolo);
  const hiddenRoomIds = useSchematicStore((s) => s.hiddenRoomIds);
  const toggleRoomLayerVisibility = useSchematicStore((s) => s.toggleRoomLayerVisibility);
  const roomLayerOrder = useSchematicStore((s) => s.roomLayerOrder);
  const setRoomLayerOrder = useSchematicStore((s) => s.setRoomLayerOrder);
  const roomLayerOpacity = useSchematicStore((s) => s.roomLayerOpacity);
  const setRoomLayerOpacity = useSchematicStore((s) => s.setRoomLayerOpacity);
  const toggleRoomLock = useSchematicStore((s) => s.toggleRoomLock);
  const updateRoom = useSchematicStore((s) => s.updateRoom);

  const hiddenSignals = hiddenSignalTypes ? new Set(hiddenSignalTypes.split(",").filter(Boolean)) : new Set<string>();
  const hiddenRooms = hiddenRoomIds ? new Set(hiddenRoomIds.split(",").filter(Boolean)) : new Set<string>();

  const usedSignals = Array.from(
    new Set(edges.map((e) => e.data?.signalType as SignalType | undefined).filter(Boolean) as SignalType[])
  );

  const rooms = nodes
    .filter((n) => n.type === "room" && !(n.data as RoomData).isEquipmentRack)
    .map((n) => {
      const data = n.data as RoomData;
      return {
        id: n.id,
        label: data.label ?? "Room",
        color: data.borderColor ?? data.color ?? ROOM_COLORS[0],
        locked: !!data.locked,
      };
    });

  const storedOrder = roomLayerOrder ? roomLayerOrder.split(",").filter(Boolean) : [];
  const roomOrder = (() => {
    const ids = rooms.map((r) => r.id);
    const existing = storedOrder.filter((id) => ids.includes(id));
    const added = ids.filter((id) => !existing.includes(id));
    return [...existing, ...added];
  })();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const latestRoomIds = rooms.map((r) => r.id).join(",");
  useEffect(() => {
    const newIds = latestRoomIds ? latestRoomIds.split(",") : [];
    const currentOrder = useSchematicStore.getState().roomLayerOrder.split(",").filter(Boolean);
    const existing = currentOrder.filter((id) => newIds.includes(id));
    const added = newIds.filter((id) => !currentOrder.includes(id));
    const next = [...existing, ...added];
    if (next.join(",") === currentOrder.join(",")) return;
    setRoomLayerOrder(next);
  }, [latestRoomIds, setRoomLayerOrder]);

  const dragRef = useRef<string | null>(null);
  const onDragOver = (e: React.DragEvent, toId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current === toId) return;
    const arr = [...roomOrder];
    const fi = arr.indexOf(dragRef.current);
    const ti = arr.indexOf(toId);
    if (fi < 0 || ti < 0) return;
    arr.splice(fi, 1);
    arr.splice(ti, 0, dragRef.current);
    setRoomLayerOrder(arr);
  };

  const sigEdgeCount = (sig: string) =>
    edges.filter((e) => e.data?.signalType === sig).length;

  const childRacksForRoom = (roomId: string) =>
    nodes.filter(
      (n) =>
        n.type === "room" &&
        n.parentId === roomId &&
        (n.data as RoomData).isEquipmentRack,
    );

  const cycleRoomColor = (roomId: string, current: string) => {
    const idx = ROOM_COLORS.indexOf(current);
    const next = ROOM_COLORS[(idx + 1) % ROOM_COLORS.length];
    const existing = nodes.find((n) => n.id === roomId && n.type === "room");
    if (!existing) return;
    updateRoom(roomId, { ...(existing.data as RoomData), borderColor: next });
  };

  if (usedSignals.length === 0 && rooms.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center", color: "var(--ti-muted)" }}>
        <TiIcon name="layers" size={28} color="var(--ti-faint)" />
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink-2)", fontFamily: "var(--ti-font-sans)" }}>No layers yet</div>
        <div style={{ fontSize: 12, fontFamily: "var(--ti-font-sans)" }}>Add devices and connections to see signal and room layers here.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <label
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderBottom: "1px solid var(--ti-divider)",
          fontSize: 12, color: "var(--ti-ink-2)", cursor: "pointer",
          fontFamily: "var(--ti-font-sans)", flexShrink: 0,
        }}
      >
        <input
          type="checkbox"
          checked={showContainers}
          onChange={(e) => setShowContainers(e.target.checked)}
          style={{ accentColor: "var(--ti-accent)" }}
        />
        Show containers
      </label>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px", opacity: showContainers ? 1 : 0.55 }}>

      {usedSignals.length > 0 && (
        <Group
          title="Signal layers"
          hint={sigSolo ? "solo" : String(usedSignals.length)}
          onClear={sigSolo ? () => setSigSolo("") : null}
        >
          {usedSignals.map((sig) => {
            const isVisible = !hiddenSignals.has(sig);
            const isSolo = sigSolo === sig;
            const isDim = sigSolo !== "" && !isSolo;
            const color = signalColorOverrides[sig] ?? SIGNAL_COLORS[sig] ?? "var(--ti-muted)";
            const label = SIGNAL_LABELS[sig] ?? sig;

            return (
              <div key={sig} className="ti-row-hover" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 6px", borderRadius: 7,
                opacity: isDim ? 0.5 : 1,
                fontFamily: "var(--ti-font-sans)",
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--ti-ink)" }}>{label}</span>
                <span style={{ fontSize: 10.5, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>{sigEdgeCount(sig)}</span>
                <LayerIconBtn on={isSolo} tone="warning" title="Solo" onClick={() => setSigSolo(isSolo ? "" : sig)}>
                  <SoloDot />
                </LayerIconBtn>
                <LayerIconBtn on={!isVisible} tone="neutral" title={isVisible ? "Hide" : "Show"} onClick={() => toggleSignalTypeVisibility(sig)}>
                  {isVisible ? <EyeOn /> : <EyeOff />}
                </LayerIconBtn>
              </div>
            );
          })}
        </Group>
      )}

      {rooms.length > 0 && (
        <Group
          title="Container layers"
          hint={roomSolo ? "solo" : "rooms"}
          onClear={roomSolo ? () => setRoomSolo("") : null}
        >
          {roomOrder.map((rid) => {
            const room = rooms.find((r) => r.id === rid);
            if (!room) return null;
            const isVisible = !hiddenRooms.has(rid);
            const opacity = roomLayerOpacity[rid] ?? 1;
            const isSolo = roomSolo === rid;
            const isDim = roomSolo !== "" && !isSolo;
            const col = room.color;
            const isOpen = expanded[rid] ?? false;
            const childRacks = childRacksForRoom(rid);

            return (
              <div
                key={rid}
                draggable
                onDragStart={() => { dragRef.current = rid; }}
                onDragOver={(e) => onDragOver(e, rid)}
                onDragEnd={() => { dragRef.current = null; }}
                style={{
                  borderRadius: 9, border: "1px solid var(--ti-divider)",
                  marginBottom: 6, background: "var(--ti-surface)",
                  opacity: isDim ? 0.55 : 1,
                }}
              >
                <div className="ti-row-hover" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 7px", borderRadius: 9, cursor: "grab" }}>
                  <span style={{ color: "var(--ti-faint)", display: "grid", placeItems: "center", cursor: "grab" }}><Grip /></span>
                  <button
                    type="button"
                    onClick={() => cycleRoomColor(rid, col)}
                    title="Cycle room color"
                    style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      background: col, border: "1px solid color-mix(in oklab, #000 12%, transparent)",
                      cursor: "pointer",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => ({ ...x, [rid]: !x[rid] }))}
                    style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "var(--ti-font-sans)" }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ti-ink)" }}>{room.label}</span>
                    <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 120ms", color: "var(--ti-faint)", fontSize: 10 }}>▶</span>
                  </button>
                  <span style={{ fontSize: 10.5, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>{countNodesInRoom(rid, nodes)}</span>
                  <LayerIconBtn on={isSolo} tone="warning" title="Solo room" onClick={() => setRoomSolo(isSolo ? "" : rid)}>
                    <SoloDot />
                  </LayerIconBtn>
                  <LayerIconBtn on={room.locked} tone="accent" title={room.locked ? "Frame locked" : "Lock frame"} onClick={() => toggleRoomLock(rid)}>
                    {room.locked ? <LockClosed /> : <LockOpen />}
                  </LayerIconBtn>
                  <LayerIconBtn on={!isVisible} tone="neutral" title={isVisible ? "Hide" : "Show"} onClick={() => toggleRoomLayerVisibility(rid)}>
                    {isVisible ? <EyeOn /> : <EyeOff />}
                  </LayerIconBtn>
                </div>

                {isOpen && (
                  <div style={{ padding: "2px 10px 9px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 8px" }}>
                      <span style={{ fontSize: 11, color: "var(--ti-muted)", width: 46, fontFamily: "var(--ti-font-sans)" }}>Opacity</span>
                      <input
                        type="range" min={20} max={100}
                        value={Math.round(opacity * 100)}
                        onChange={(e) => setRoomLayerOpacity(rid, +e.target.value / 100)}
                        style={{ flex: 1, accentColor: col }}
                      />
                      <span style={{ fontSize: 10.5, color: "var(--ti-faint)", width: 30, textAlign: "right", fontFamily: "var(--ti-font-mono)" }}>
                        {Math.round(opacity * 100)}%
                      </span>
                    </div>
                    {childRacks.map((rk) => {
                      const rkData = rk.data as RoomData;
                      return (
                        <div key={rk.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
                          <span style={{ width: 6, height: 6, borderRadius: 2, background: `color-mix(in oklab, ${col} 55%, var(--ti-faint))` }} />
                          <span style={{ flex: 1, fontSize: 11.5, color: "var(--ti-ink-2)" }}>{rkData.label ?? "Rack"}</span>
                          <span style={{ fontSize: 10, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>
                            {countNodesInRoom(rk.id, nodes)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </Group>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ti-faint)", lineHeight: 1.5, padding: "4px 4px 0", fontFamily: "var(--ti-font-sans)" }}>
        Drag rooms to reorder. <strong>Lock</strong> fixes a room frame in place. <strong>Solo</strong> dims everything else.
      </div>
      </div>
    </div>
  );
}
