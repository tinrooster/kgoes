import { useMemo, useState } from "react";
import { DEVICE_TEMPLATES } from "../deviceLibraryRuntime";
import { useSchematicStore } from "../store";
import type { DeviceData, DeviceTemplate, TowerDraftPage } from "../types";
import { isTowerDraftEligibleDeviceType, placementSyncStatus, towerDraftLibraryTemplates } from "../towerDraftUtils";
import { resolveDeviceLabel } from "../displayName";
import TowerDraftTrackItPanel from "./TowerDraftTrackItPanel";

export let draggedTowerDeviceNodeId: string | null = null;
export let draggedTowerTemplateId: string | null = null;

interface TowerDraftSidebarProps {
  page: TowerDraftPage;
  selectedPlacementId: string | null;
  selectedPolylineId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onSelectPolyline: (id: string | null) => void;
  onSelectLevel: (plantLocationId: string) => void;
}

function matchesSearch(label: string, deviceType: string | undefined, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q) || (deviceType ?? "").includes(q);
}

export default function TowerDraftSidebar({
  page,
  selectedPlacementId,
  selectedPolylineId,
  onSelectPlacement,
  onSelectPolyline,
  onSelectLevel,
}: TowerDraftSidebarProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const removeTowerDraftPlacement = useSchematicStore((s) => s.removeTowerDraftPlacement);
  const removeTowerDraftPolyline = useSchematicStore((s) => s.removeTowerDraftPolyline);
  const updateTowerDraftPlacement = useSchematicStore((s) => s.updateTowerDraftPlacement);
  const [search, setSearch] = useState("");

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

  const selectedPlacement = page.placements.find((p) => p.id === selectedPlacementId);

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
      className="px-2 py-1.5 rounded border border-emerald-600/40 bg-emerald-950/20 text-xs cursor-grab hover:border-emerald-500/70 hover:bg-emerald-950/35"
    >
      <div className="font-medium truncate text-[var(--color-text)]">{template.shortName ?? template.label}</div>
      <div className="text-[10px] text-[var(--color-text-muted)] truncate">{template.deviceType}</div>
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
        className="px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-xs cursor-grab hover:border-blue-400/70 hover:bg-[var(--color-surface-hover)]"
      >
        <div className="font-medium truncate text-[var(--color-text)]">{label}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] truncate">{data.deviceType}</div>
      </div>
    );
  };

  return (
    <aside
      className="w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col min-h-0 overflow-hidden"
      data-print-hide
    >
      <TowerDraftTrackItPanel page={page} onSelectLevel={onSelectLevel} />

      {selectedPlacement && (
        <div className="px-2 py-2 border-b border-blue-200 bg-blue-50/80 dark:bg-blue-950/30">
          <div className="text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
            Edit placement
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-text)] mb-1">
            Height (ft AGL)
            <input
              type="number"
              min={0}
              max={page.towerHeightFtAgl}
              step={1}
              value={selectedPlacement.mountHeightFtAgl}
              onChange={(e) =>
                updateTowerDraftPlacement(page.id, selectedPlacement.id, {
                  mountHeightFtAgl: Math.max(
                    0,
                    Math.min(page.towerHeightFtAgl, Number(e.target.value) || 0),
                  ),
                })
              }
              className="w-16 px-1 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)]"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-text)]">
            Offset (px)
            <input
              type="number"
              step={5}
              value={Math.round(selectedPlacement.offsetX ?? 0)}
              onChange={(e) =>
                updateTowerDraftPlacement(page.id, selectedPlacement.id, {
                  offsetX: Number(e.target.value) || 0,
                })
              }
              className="w-16 px-1 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)]"
            />
          </label>
          <button
            type="button"
            className="mt-1.5 text-[11px] text-red-600 hover:text-red-800"
            onClick={() => {
              removeTowerDraftPlacement(page.id, selectedPlacement.id);
              onSelectPlacement(null);
            }}
          >
            Remove from elevation
          </button>
        </div>
      )}

      <div className="px-2 py-2 border-b border-[var(--color-border)]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
          Antennas &amp; MW gear
        </div>
        <input
          type="search"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
          Drag onto the elevation. Click a guide-band label to snap a selected placement to that height.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 min-h-0 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 px-0.5">
            Available ({availableItems.length})
          </div>
          <div className="space-y-1">
            {availableItems.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-muted)] px-1">No matches.</p>
            ) : (
              availableItems.map((item) =>
                item.kind === "template"
                  ? renderDraggableTemplate(item.template)
                  : renderDraggableNode(item.node),
              )
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] p-2 max-h-[38%] overflow-y-auto shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
          On this tower ({page.placements.length})
        </div>
        {page.placements.length === 0 && page.polylines.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">Nothing placed yet — drag from list above or refresh from trackIT.</p>
        ) : (
          <>
            {page.placements.map((pl) => {
              const data = nodes.find((n) => n.id === pl.deviceNodeId)?.data as DeviceData | undefined;
              const label = data ? resolveDeviceLabel(data, { useShortNames }).text : pl.deviceNodeId;
              const isSelected = pl.id === selectedPlacementId;
              return (
                <button
                  key={pl.id}
                  type="button"
                  className={`w-full flex items-center justify-between gap-1 text-[11px] py-1 px-1 rounded text-left ${
                    isSelected ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-[var(--color-surface-hover)]"
                  }`}
                  onClick={() => onSelectPlacement(isSelected ? null : pl.id)}
                >
                  <span className="truncate" title={label}>
                    <span className="text-[10px] mr-1">{syncBadge(pl)}</span>
                    {pl.mountHeightFtAgl}′ · {label}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    className="text-red-500 hover:text-red-700 shrink-0 px-1"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTowerDraftPlacement(page.id, pl.id);
                      if (selectedPlacementId === pl.id) onSelectPlacement(null);
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
            {page.polylines.map((pl) => {
              const isSelected = pl.id === selectedPolylineId;
              return (
                <button
                  key={pl.id}
                  type="button"
                  className={`w-full flex items-center justify-between text-[11px] py-1 px-1 rounded ${
                    isSelected ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-[var(--color-surface-hover)]"
                  }`}
                  onClick={() => onSelectPolyline(isSelected ? null : pl.id)}
                >
                  <span className="text-[var(--color-text-muted)]">
                    Line · {pl.lineStyle ?? "solid"} · {pl.points.length} pts
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    className="text-red-500 hover:text-red-700 px-1"
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
    </aside>
  );
}
