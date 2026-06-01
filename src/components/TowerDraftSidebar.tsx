import { useMemo, useState } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, DeviceTemplate, TowerDraftPage } from "../types";
import { isTowerDraftEligibleDeviceType, placementSyncStatus, towerDraftLibraryTemplates } from "../towerDraftUtils";
import type { MeasurementSystem } from "../measurementUnits";
import { resolveDeviceLabel } from "../displayName";
import type { TowerDraftContextMenuState } from "./TowerDraftContextMenu";
import TowerDraftTrackItPanel from "./TowerDraftTrackItPanel";
import { TiIcon, TiIconButton, TiInput } from "./ti/TiBase";

export let draggedTowerDeviceNodeId: string | null = null;
export let draggedTowerTemplateId: string | null = null;

interface TowerDraftSidebarProps {
  page: TowerDraftPage;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  measurementSystem: MeasurementSystem;
  selectedPlacementId: string | null;
  selectedPolylineId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onSelectPolyline: (id: string | null) => void;
  onSelectLevel: (plantLocationId: string) => void;
  onOpenContextMenu: (menu: TowerDraftContextMenuState) => void;
}

function matchesSearch(label: string, deviceType: string | undefined, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q) || (deviceType ?? "").includes(q);
}

export default function TowerDraftSidebar({
  page,
  leftOpen,
  onLeftOpenChange,
  measurementSystem: _measurementSystem,
  selectedPlacementId,
  selectedPolylineId,
  onSelectPlacement,
  onSelectPolyline,
  onSelectLevel,
  onOpenContextMenu,
}: TowerDraftSidebarProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const removeTowerDraftPolyline = useSchematicStore((s) => s.removeTowerDraftPolyline);
  const [search, setSearch] = useState("");
  const siteLabel = trackItTowerContext?.siteName?.trim() || page.label;

  const placedNodeIds = new Set(page.placements.map((p) => p.deviceNodeId));

  const libraryTemplates = useMemo(
    () => towerDraftLibraryTemplates([...DEVICE_TEMPLATES, ...customTemplates]),
    [customTemplates],
  );

  const eligibleOnDrawing = nodes.filter((n) => {
    if (n.type !== "device") return false;
    const data = n.data as DeviceData;
    return isTowerDraftEligibleDeviceType(data.deviceType);
  });

  const unplacedDevices = eligibleOnDrawing.filter((n) => !placedNodeIds.has(n.id));

  const filteredLibrary = useMemo(
    () => libraryTemplates.filter((t) => matchesSearch(t.label, t.deviceType, search)),
    [libraryTemplates, search],
  );

  const filteredUnplaced = useMemo(
    () =>
      unplacedDevices.filter((n) => {
        const data = n.data as DeviceData;
        const label = resolveDeviceLabel(data, { useShortNames }).text;
        return matchesSearch(label, data.deviceType, search);
      }),
    [unplacedDevices, search, useShortNames],
  );

  type AvailableItem =
    | { kind: "template"; template: DeviceTemplate }
    | { kind: "node"; node: (typeof unplacedDevices)[number] };

  const availableItems = useMemo((): AvailableItem[] => {
    const items: AvailableItem[] = filteredLibrary.map((template) => ({ kind: "template", template }));
    for (const n of filteredUnplaced) {
      items.push({ kind: "node", node: n });
    }
    return items;
  }, [filteredLibrary, filteredUnplaced]);

  const syncBadge = (pl: (typeof page.placements)[number]) => {
    const status = placementSyncStatus(pl, trackItTowerContext?.antennaLevels);
    if (status === "linked") return "✓";
    if (status === "mismatch") return "⚠";
    return "○";
  };

  const renderDraggableTemplate = (template: DeviceTemplate) => (
    <div
      key={template.id}
      draggable
      onDragStart={(e) => {
        if (!template.id) return;
        draggedTowerTemplateId = template.id;
        e.dataTransfer.setData("application/x-tower-template-id", template.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={() => {
        draggedTowerTemplateId = null;
      }}
      className="ti-row-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 8px",
        borderRadius: 8,
        cursor: "grab",
        border: "1px solid var(--ti-divider)",
        marginBottom: 6,
        background: "var(--ti-surface)",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ti-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {template.shortName ?? template.label}
      </div>
      <div style={{ fontSize: 10, fontFamily: "var(--ti-font-mono)", color: "var(--ti-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
        {template.deviceType}
      </div>
    </div>
  );

  const renderDraggableNode = (n: (typeof unplacedDevices)[number]) => {
    const data = n.data as DeviceData;
    const label = resolveDeviceLabel(data, { useShortNames }).text;
    return (
      <div
        key={n.id}
        draggable
        onDragStart={(e) => {
          draggedTowerDeviceNodeId = n.id;
          e.dataTransfer.setData("application/x-tower-device-id", n.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          draggedTowerDeviceNodeId = null;
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenContextMenu({ kind: "device", nodeId: n.id, screenX: e.clientX, screenY: e.clientY });
        }}
        className="ti-row-hover"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "8px 8px",
          borderRadius: 8,
          cursor: "grab",
          border: "1px solid var(--ti-divider)",
          marginBottom: 6,
          background: "var(--ti-surface)",
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ti-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ fontSize: 10, fontFamily: "var(--ti-font-mono)", color: "var(--ti-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.deviceType}
        </div>
      </div>
    );
  };

  if (!leftOpen) {
    return (
      <div
        style={{
          width: 44,
          flexShrink: 0,
          borderRight: "1px solid var(--ti-border)",
          background: "var(--ti-sunken)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 8,
        }}
        data-print-hide
      >
        <TiIconButton icon="chevR" variant="ghost" size="sm" onClick={() => onLeftOpenChange(true)} title="Show equipment" />
        <div
          style={{
            writingMode: "vertical-rl",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
            marginTop: 8,
          }}
        >
          Equipment
        </div>
      </div>
    );
  }

  return (
    <aside
      data-print-hide
      style={{
        width: 268,
        flexShrink: 0,
        borderRight: "1px solid var(--ti-border)",
        background: "var(--ti-sunken)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <div
        style={{
          padding: "11px 14px",
          borderBottom: "1px solid var(--ti-divider)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
        }}
      >
        <TiIcon name="pin" size={14} color="var(--ti-accent)" />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ti-accent-ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {siteLabel}
        </span>
        <TiIconButton icon="chevL" variant="ghost" size="sm" onClick={() => onLeftOpenChange(false)} title="Dock library" />
      </div>

      <TowerDraftTrackItPanel page={page} onSelectLevel={onSelectLevel} />

      <div style={{ padding: "11px 14px 9px", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ti-muted)",
            marginBottom: 8,
          }}
        >
          Antennas, MW &amp; cameras
        </div>
        <TiInput icon="search" placeholder="Filter…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ height: 32, width: "100%" }} />
        <div style={{ fontSize: 11, color: "var(--ti-muted)", marginTop: 8, lineHeight: 1.4 }}>
          Drag onto the elevation or site plan. Right-click a placed device for the edit menu.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px", minHeight: 0 }}>
        {availableItems.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--ti-muted)", padding: "0 6px" }}>No matches.</p>
        ) : (
          availableItems.map((item) =>
            item.kind === "template"
              ? renderDraggableTemplate(item.template)
              : renderDraggableNode(item.node),
          )
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--ti-divider)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: "42%",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "9px 14px 5px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ti-muted)" }}>
            On this tower
          </span>
          <span style={{ fontSize: 11, fontFamily: "var(--ti-font-mono)", color: "var(--ti-faint)" }}>{page.placements.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
          {page.placements.length === 0 && page.polylines.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ti-muted)", lineHeight: 1.45, padding: "0 6px" }}>
              Nothing placed yet — drag from the library or sync from the schematic.
            </p>
          ) : (
            <>
              {[...page.placements]
                .sort((a, b) => b.mountHeightFtAgl - a.mountHeightFtAgl)
                .map((pl) => {
                  const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data as DeviceData | undefined;
                  const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
                  const isSelected = pl.id === selectedPlacementId;
                  return (
                    <div
                      key={pl.id}
                      className="ti-row-hover"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectPlacement(pl.id);
                        onSelectPolyline(null);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onSelectPlacement(pl.id);
                        onSelectPolyline(null);
                        onOpenContextMenu({
                          kind: "placement",
                          pageId: page.id,
                          placementId: pl.id,
                          deviceNodeId: pl.deviceNodeId,
                          plantLocationId: pl.plantLocationId,
                          screenX: e.clientX,
                          screenY: e.clientY,
                        });
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "6px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: isSelected ? "var(--ti-surface)" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 10, width: 14, flexShrink: 0 }}>{syncBadge(pl)}</span>
                      <span style={{ fontSize: 10.5, fontFamily: "var(--ti-font-mono)", color: "var(--ti-muted)", width: 38, flexShrink: 0 }}>
                        {Math.round(pl.mountHeightFtAgl)} ft
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ti-ink)" }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              {page.polylines.map((pl) => {
                const isSelected = pl.id === selectedPolylineId;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    className="ti-row-hover"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "none",
                      background: isSelected ? "var(--ti-surface)" : "transparent",
                      fontSize: 12,
                      color: "var(--ti-muted)",
                      cursor: "pointer",
                    }}
                    onClick={() => onSelectPolyline(isSelected ? null : pl.id)}
                  >
                    <span>Line · {pl.points.length} pts</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      style={{ color: "var(--ti-danger)", padding: "0 4px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTowerDraftPolyline(page.id, pl.id);
                        if (selectedPolylineId === pl.id) onSelectPolyline(null);
                      }}
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
