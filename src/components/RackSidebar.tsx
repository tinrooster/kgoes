import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import { confirmDialog, promptDialog } from "../appDialogStore";
import type { DeviceData, RackElevationPage, RackType, RackData, RoomData, RackCrossLink } from "../types";
import { RACK_TYPE_LABELS } from "../types";
import { getRackMountSummary, shelfThrowdownDimensionsMissing } from "../rackMount";
import { aggregateRackStats, computeRackStats, formatStatsLine } from "../rackStats";
import { getDevicesInRoom } from "../rackLink";
import { resolveDeviceLabel } from "../displayName";
import { nextRackPosition, sortRacksByLabel } from "../rackLayout";
import { TiIcon } from "./ti/TiBase";
import RackDistributionPresetDialog from "./RackDistributionPresetDialog";
import { formatFillOrderPlainText, normalizeFillOrderSummary } from "../rackFillCatalog";
import { RACK_DISTRIBUTION_PRESETS } from "../rackDistributionPresets";

/** Shared drag state — set by sidebar, read by RackRenderer during dragOver.
 *  (dataTransfer.getData is blocked during dragover for security; this fallback
 *  lets the renderer preview drop targets without reading the payload.) */
export let draggedDeviceHeightU = 1;
export let draggedDeviceNodeId: string | null = null;

interface RackSidebarProps {
  page: RackElevationPage;
}

export default function RackSidebar({ page }: RackSidebarProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const removeRack = useSchematicStore((s) => s.removeRack);
  const updateRack = useSchematicStore((s) => s.updateRack);
  const moveRackToPage = useSchematicStore((s) => s.moveRackToPage);
  const layoutRacksOnPage = useSchematicStore((s) => s.layoutRacksOnPage);
  const requestRackFocus = useSchematicStore((s) => s.requestRackFocus);
  const selectedRackId = useSchematicStore((s) => s.selectedRackId);
  const setSelectedRackId = useSchematicStore((s) => s.setSelectedRackId);
  const selectedCrossLinkId = useSchematicStore((s) => s.selectedCrossLinkId);
  const setSelectedCrossLinkId = useSchematicStore((s) => s.setSelectedCrossLinkId);
  const removeRackCrossLink = useSchematicStore((s) => s.removeRackCrossLink);
  const updateRackCrossLink = useSchematicStore((s) => s.updateRackCrossLink);
  const addToast = useSchematicStore((s) => s.addToast);
  const updateRackElevationPage = useSchematicStore((s) => s.updateRackElevationPage);
  const allPagesForMove = useSchematicStore((s) => s.pages);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const otherElevationPages = useMemo(() =>
    allPagesForMove.filter((p): p is RackElevationPage => p.type === "rack-elevation" && p.id !== page.id),
    [allPagesForMove, page.id],
  );
  const [showAddRack, setShowAddRack] = useState(false);
  const [showDistributionPreset, setShowDistributionPreset] = useState(false);
  const [editRack, setEditRack] = useState<RackData | null>(null);
  const [search, setSearch] = useState("");
  const [editingRackId, setEditingRackId] = useState<string | null>(null);
  const [editingRackLabel, setEditingRackLabel] = useState("");
  const [moveMenuRackId, setMoveMenuRackId] = useState<string | null>(null);
  const [deviceContextMenu, setDeviceContextMenu] = useState<{
    screenX: number;
    screenY: number;
    nodeId: string;
    deviceData: DeviceData;
  } | null>(null);

  const fillBom = useMemo(
    () => normalizeFillOrderSummary(page.fillOrderSummary),
    [page.fillOrderSummary],
  );

  const racksByLabel = useMemo(() => sortRacksByLabel(page.racks), [page.racks]);

  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);
  const setFacePlateEditNodeId = useSchematicStore((s) => s.setFacePlateEditNodeId);
  const requestSchematicFocus = useSchematicStore((s) => s.requestSchematicFocus);

  useEffect(() => {
    if (!deviceContextMenu) return;
    const close = () => setDeviceContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [deviceContextMenu]);

  // Find devices that haven't been placed in ANY rack on ANY page
  const allPages = useSchematicStore((s) => s.pages);
  const placedNodeIds = new Set(
    allPages.flatMap((p) => p.type === "rack-elevation" ? p.placements.map((pl) => pl.deviceNodeId) : [])
  );

  const unrackedDevices = nodes.filter((n) => {
    if (n.type !== "device" || placedNodeIds.has(n.id)) return false;
    const data = n.data as DeviceData;
    if (data.deviceType === "adapter") return false;
    return getRackMountSummary(data).showInRackSidebar;
  });

  const deviceDataMap = useMemo(() => {
    const map = new Map<string, DeviceData>();
    for (const n of nodes) {
      if (n.type === "device") map.set(n.id, n.data as DeviceData);
    }
    return map;
  }, [nodes]);

  const pageStats = useMemo(() => {
    if (page.racks.length === 0) return null;
    const per = page.racks.map((r) => computeRackStats(r, page.placements, page.accessories, deviceDataMap));
    return aggregateRackStats(per);
  }, [page, deviceDataMap]);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string, rackHeightU: number) => {
    e.dataTransfer.setData("application/x-rack-device-id", nodeId);
    e.dataTransfer.effectAllowed = "move";
    draggedDeviceHeightU = rackHeightU;
    draggedDeviceNodeId = nodeId;
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedDeviceNodeId = null;
  }, []);

  const totalHeightU = pageStats?.uTotal ?? page.racks.reduce((sum, r) => sum + r.heightU, 0);
  const usedU = pageStats?.uUsed ?? 0;
  const freeU = Math.max(0, totalHeightU - usedU);

  return (
    <div
      className="flex flex-col text-xs overflow-hidden shrink-0"
      style={{
        width: 264,
        background: "var(--ti-sunken)",
        borderRight: "1px solid var(--ti-border)",
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <div style={{ padding: 14, borderBottom: "1px solid var(--ti-divider)" }}>
        <button
          type="button"
          onClick={() => setShowAddRack(true)}
          style={{
            width: "100%",
            height: 38,
            borderRadius: 9,
            border: 0,
            background: "var(--ti-ink)",
            color: "var(--ti-bg)",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            cursor: "pointer",
            fontFamily: "var(--ti-font-sans)",
          }}
        >
          <TiIcon name="plus" size={15} color="var(--ti-bg)" />
          Add rack
        </button>
      </div>

      {pageStats && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ti-divider)" }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ti-muted)",
              marginBottom: 10,
            }}
          >
            Page totals
          </div>
          <div
            style={{
              borderRadius: 9,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface)",
              padding: "9px 11px",
              marginBottom: 7,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--ti-muted)", fontWeight: 600 }}>CAPACITY</span>
              {totalHeightU > 0 && (
                <span
                  data-mono
                  style={{ fontSize: 11, color: "var(--ti-success)", fontWeight: 600, fontFamily: "var(--ti-font-mono)" }}
                >
                  {freeU}U free
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
              <span data-mono style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, fontFamily: "var(--ti-font-mono)" }}>
                {usedU}U
              </span>
              <span data-mono style={{ fontSize: 11, color: "var(--ti-faint)", fontFamily: "var(--ti-font-mono)" }}>
                of {totalHeightU}U
              </span>
            </div>
            {totalHeightU > 0 && (
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "var(--ti-sunken)",
                  marginTop: 7,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (usedU / totalHeightU) * 100)}%`,
                    height: "100%",
                    background: "var(--ti-accent)",
                  }}
                />
              </div>
            )}
          </div>
          <div
            style={{
              borderRadius: 9,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface)",
              padding: "9px 11px",
            }}
          >
            <div style={{ fontSize: 10, color: "var(--ti-muted)", fontWeight: 600, marginBottom: 4 }}>POWER DRAW</div>
            <div data-mono style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink)", fontFamily: "var(--ti-font-mono)" }}>
              {formatStatsLine(pageStats)}
            </div>
            {(pageStats.unknownDepthCount > 0 || pageStats.unknownWeightCount > 0 || pageStats.unknownPowerCount > 0) && (
              <div style={{ fontSize: 10, color: "var(--ti-warning)", marginTop: 6 }}>
                {[
                  pageStats.unknownDepthCount > 0 ? `${pageStats.unknownDepthCount} unknown depth` : null,
                  pageStats.unknownWeightCount > 0 ? `${pageStats.unknownWeightCount} unknown weight` : null,
                  pageStats.unknownPowerCount > 0 ? `${pageStats.unknownPowerCount} unknown power` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distribution presets */}
      {page.racks.length >= RACK_DISTRIBUTION_PRESETS[0]!.minRacks && (
        <div className="px-2 pt-2 pb-0">
          <button
            type="button"
            className="w-full px-2 py-1.5 text-[11px] rounded border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 font-medium"
            onClick={() => setShowDistributionPreset(true)}
            title="Apply MDF/datacom hub jack fields and trunk callouts"
          >
            Apply distribution preset…
          </button>
        </div>
      )}

      {fillBom ? (
        <div className="mx-2 mt-2 p-2 rounded border border-neutral-200 bg-neutral-50 text-[11px]">
          <div className="font-semibold text-neutral-600 mb-1">Procurement BOM</div>
          <table className="w-full text-[10px] mb-1.5">
            <thead>
              <tr className="text-neutral-500 text-left">
                <th className="pr-1">Qty</th>
                <th className="pr-1">RU</th>
                <th className="pr-1">P/N</th>
                <th className="text-right">$</th>
              </tr>
            </thead>
            <tbody>
              {fillBom.lines.map((line) => (
                <tr key={`${line.kind}-${line.heightU}-${line.partNumber}`}>
                  <td className="tabular-nums pr-1">{line.qty}</td>
                  <td className="pr-1">{line.heightU}</td>
                  <td className="pr-1 font-mono truncate max-w-[88px]" title={line.description}>
                    {line.partNumber}
                  </td>
                  <td className="text-right tabular-nums">{line.lineCostUsd.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-neutral-600 tabular-nums leading-snug">
            {fillBom.totalPanels} panels · {fillBom.totalU}U · {fillBom.totalScrews} screws ·{" "}
            {fillBom.totalCageNuts} cage nuts ·{" "}
            <span className="font-medium">~${fillBom.estimatedCostUsd.toFixed(2)}</span>
          </p>
          <button
            type="button"
            className="mt-1.5 text-[10px] text-blue-700 hover:underline"
            onClick={() => {
              const text = formatFillOrderPlainText(fillBom);
              void navigator.clipboard.writeText(text).then(
                () => addToast("BOM copied (TSV)", "success"),
                () => addToast("Could not copy to clipboard", "error"),
              );
            }}
          >
            Copy BOM for ordering
          </button>
        </div>
      ) : null}

      {/* Rack layout */}
      {page.racks.length > 1 && (
        <div className="px-2 pt-2 pb-0 flex flex-col gap-1">
          <div
            className="font-semibold text-neutral-500 uppercase tracking-wider px-0.5"
            style={{ fontSize: 9 }}
          >
            Layout
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="flex-1 px-2 py-1 text-[11px] rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
              onClick={() => layoutRacksOnPage(page.id, { mode: "row" })}
              title="Single horizontal row, aligned U tops"
            >
              1 row
            </button>
            <button
              type="button"
              className="flex-1 px-2 py-1 text-[11px] rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
              onClick={() => layoutRacksOnPage(page.id, { mode: "grid", columns: 6 })}
              title="Two or more rows, 6 racks per row (e.g. Sutro 12-rack site)"
            >
              2×6 grid
            </button>
          </div>
          {page.racks.length > 6 && page.racks.length % 6 !== 0 && (
            <button
              type="button"
              className="w-full px-2 py-1 text-[10px] rounded border border-dashed border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              onClick={() =>
                layoutRacksOnPage(page.id, {
                  mode: "grid",
                  columns: Math.min(6, Math.ceil(page.racks.length / 2)),
                })
              }
              title="Wrap racks into rows with up to 6 columns"
            >
              Grid ({Math.ceil(page.racks.length / Math.min(6, Math.ceil(page.racks.length / 2)))} rows)
            </button>
          )}
        </div>
      )}

      {(page.crossLinks?.length ?? 0) > 0 && (
        <div className="p-2 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-neutral-500 uppercase tracking-wider" style={{ fontSize: 9 }}>
              Cross-links ({page.crossLinks!.length})
            </div>
            <label className="flex items-center gap-1 text-[10px] text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={page.showTrunkCallouts !== false}
                onChange={(e) =>
                  updateRackElevationPage(page.id, { showTrunkCallouts: e.target.checked })
                }
              />
              Show trunks
            </label>
          </div>
          {page.crossLinks!.map((link) => {
            const from = page.racks.find((r) => r.id === link.fromRackId);
            const to = page.racks.find((r) => r.id === link.toRackId);
            const isSelected = selectedCrossLinkId === link.id;
            return (
              <CrossLinkSidebarRow
                key={link.id}
                link={link}
                fromLabel={from?.label ?? "?"}
                toLabel={to?.label ?? "?"}
                isSelected={isSelected}
                onSelect={() => setSelectedCrossLinkId(link.id)}
                onEdit={async () => {
                  const next = await promptDialog({
                    title: "Edit cross-link label",
                    label: "Callout label",
                    defaultValue: link.label,
                    confirmLabel: "Save",
                  });
                  if (next == null) return;
                  const trimmed = next.trim();
                  if (!trimmed) {
                    addToast("Label cannot be empty", "error");
                    return;
                  }
                  updateRackCrossLink(page.id, link.id, { label: trimmed });
                }}
                onDelete={async () => {
                  const ok = await confirmDialog({
                    title: "Delete cross-link",
                    message: `Remove “${link.label}”?`,
                    tone: "danger",
                    confirmLabel: "Delete",
                  });
                  if (ok) {
                    removeRackCrossLink(page.id, link.id);
                    if (selectedCrossLinkId === link.id) setSelectedCrossLinkId(null);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {page.racks.length > 0 && (
        <div className="p-2 border-b border-neutral-200">
          <div className="font-semibold text-neutral-500 mb-1 uppercase tracking-wider" style={{ fontSize: 9 }}>
            Racks ({page.racks.length})
          </div>
          {racksByLabel.map((rack) => {
            const placementCount = page.placements.filter((p) => p.rackId === rack.id).length;
            const isEditing = editingRackId === rack.id;
            const isSelected = selectedRackId === rack.id;
            return (
              <div
                key={rack.id}
                className={`flex items-center justify-between py-0.5 px-1 -mx-1 rounded cursor-pointer group ${
                  isSelected ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200" : "text-neutral-700 hover:bg-neutral-50"
                }`}
                onClick={() => {
                  setSelectedRackId(rack.id);
                  requestRackFocus(page.id, rack.id);
                }}
                title="Click to focus this rack on the canvas"
              >
                {isEditing ? (
                  <input
                    className="flex-1 min-w-0 bg-white border border-blue-400 rounded px-1 py-0 text-xs outline-none"
                    value={editingRackLabel}
                    autoFocus
                    onChange={(e) => setEditingRackLabel(e.target.value)}
                    onBlur={() => {
                      if (editingRackLabel.trim()) updateRack(page.id, rack.id, { label: editingRackLabel.trim() });
                      setEditingRackId(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") { if (editingRackLabel.trim()) updateRack(page.id, rack.id, { label: editingRackLabel.trim() }); setEditingRackId(null); }
                      if (e.key === "Escape") setEditingRackId(null);
                    }}
                  />
                ) : (
                  <span
                    className="truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingRackId(rack.id);
                      setEditingRackLabel(rack.label);
                    }}
                    title="Double-click to rename"
                  >
                    {rack.label} ({rack.heightU}U)
                  </span>
                )}
                <span className="text-neutral-400 text-[10px] shrink-0 ml-1 flex items-center gap-1">
                  {placementCount > 0 && <span>{placementCount} dev</span>}
                  {otherElevationPages.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        className="text-neutral-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move to page"
                        onClick={(e) => { e.stopPropagation(); setMoveMenuRackId(moveMenuRackId === rack.id ? null : rack.id); }}
                      >
                        →
                      </button>
                      {moveMenuRackId === rack.id && (
                        <div className="absolute right-0 top-5 z-50 bg-white border border-neutral-200 rounded shadow-lg py-1 min-w-[120px]">
                          {otherElevationPages.map((p) => (
                            <button
                              key={p.id}
                              className="w-full text-left px-3 py-1 text-xs text-neutral-700 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => { moveRackToPage(page.id, rack.id, p.id); setMoveMenuRackId(null); }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-neutral-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Edit ${rack.label}`}
                    onClick={(e) => { e.stopPropagation(); setEditRack(rack); }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Delete ${rack.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        const ok = await confirmDialog({
                          title: "Delete rack",
                          message: `Delete “${rack.label}”? This removes all devices placed in it.`,
                          tone: "danger",
                          confirmLabel: "Delete",
                        });
                        if (ok) removeRack(page.id, rack.id);
                      })();
                    }}
                  >
                    ×
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Unracked devices — grouped by linked room */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {unrackedDevices.length > 0 && (
          <input
            className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400"
            placeholder="Search devices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        )}
        {unrackedDevices.length === 0 ? (
          <div className="text-neutral-400 py-2">All devices placed</div>
        ) : (() => {
          const q = search.trim().toLowerCase();
          const matchesSearch = (node: typeof unrackedDevices[number]) => {
            if (!q) return true;
            const data = node.data as DeviceData;
            return data.label.toLowerCase().includes(q)
              || (data.shortName?.toLowerCase().includes(q) ?? false)
              || (data.manufacturer?.toLowerCase().includes(q) ?? false)
              || (data.modelNumber?.toLowerCase().includes(q) ?? false)
              || data.deviceType.toLowerCase().includes(q);
          };
          const renderDevice = (node: typeof unrackedDevices[number]) => {
            const data = node.data as DeviceData;
            const resolved = resolveDeviceLabel(data, { useShortNames, wrapDeviceLabels: false });
            const summary = getRackMountSummary(data);
            const shelfHint = summary.mountingClass === "shelf";
            const dimsMissing = shelfThrowdownDimensionsMissing(data);
            const badge = `${summary.heightU}U · ${summary.mountingClass === "rack-half" ? "½" : summary.mountingClass === "shelf" ? "shelf" : "full"}${summary.source === "estimated" ? "*" : ""}${dimsMissing ? " ⚠" : ""}`;
            return (
              <div
                key={node.id}
                className="flex items-center justify-between px-2 py-1 rounded bg-neutral-50 border border-neutral-200 cursor-grab hover:bg-blue-50 hover:border-blue-300"
                draggable
                onDragStart={(e) => handleDragStart(e, node.id, summary.heightU)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeviceContextMenu({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    nodeId: node.id,
                    deviceData: data,
                  });
                }}
                title={
                  dimsMissing
                    ? `Shelf / throwdown — set height and width (mm) in Device Properties · ${data.label}`
                    : shelfHint
                      ? `Shelf / throwdown — auto-shelf on drop · ${data.label}`
                      : `${data.label} — right-click for actions`
                }
              >
                <span className="truncate">{resolved.text}</span>
                <span className={`ml-1 shrink-0 text-[10px] ${summary.source === "estimated" ? "text-amber-600" : "text-neutral-400"}`}>
                  {badge}
                </span>
              </div>
            );
          };

          const unrackedIds = new Set(unrackedDevices.map((n) => n.id));
          const linkedRacks = page.racks.filter((r) => r.linkedRoomId);
          const claimedByGroup = new Set<string>();
          const groups = linkedRacks.map((rack) => {
            const roomNode = nodes.find((n) => n.id === rack.linkedRoomId);
            const roomLabel = (roomNode?.data as RoomData | undefined)?.label ?? "Room";
            const roomDevices = getDevicesInRoom(rack.linkedRoomId!, nodes)
              .filter((n) => unrackedIds.has(n.id) && matchesSearch(n));
            roomDevices.forEach((n) => claimedByGroup.add(n.id));
            return { rack, roomLabel, devices: roomDevices };
          }).filter((g) => g.devices.length > 0);

          const otherUnracked = unrackedDevices
            .filter((n) => !claimedByGroup.has(n.id) && matchesSearch(n))
            .sort((a, b) => ((a.data as DeviceData).label).localeCompare((b.data as DeviceData).label));

          return (
            <>
              {groups.map(({ rack, roomLabel, devices }) => (
                <div key={rack.id}>
                  <div className="font-semibold text-blue-600 mb-0.5 uppercase tracking-wider" style={{ fontSize: 8 }}>
                    From {roomLabel} → {rack.label} ({devices.length})
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {devices.sort((a, b) => ((a.data as DeviceData).label).localeCompare((b.data as DeviceData).label)).map(renderDevice)}
                  </div>
                </div>
              ))}
              {otherUnracked.length > 0 && (
                <div>
                  <div className="font-semibold text-neutral-500 mb-0.5 uppercase tracking-wider" style={{ fontSize: 8 }}>
                    {groups.length > 0 ? `Other Unracked (${otherUnracked.length})` : `Unracked Devices (${otherUnracked.length})`}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {otherUnracked.map(renderDevice)}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Add Rack Dialog */}
      {showAddRack && (
        <AddRackDialog
          pageId={page.id}
          rackCount={page.racks.length}
          onClose={() => setShowAddRack(false)}
        />
      )}

      {showDistributionPreset && (
        <RackDistributionPresetDialog
          page={page}
          onClose={() => setShowDistributionPreset(false)}
        />
      )}

      {/* Edit Rack Dialog */}
      {editRack && (
        <EditRackDialog
          pageId={page.id}
          rack={editRack}
          onClose={() => setEditRack(null)}
        />
      )}

      {/* Unracked device context menu */}
      {deviceContextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 text-xs min-w-[180px]"
          style={{ left: deviceContextMenu.screenX, top: deviceContextMenu.screenY }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
            onClick={() => {
              setEditingNodeId(deviceContextMenu.nodeId);
              setDeviceContextMenu(null);
            }}
          >
            Edit device properties…
          </button>
          {(deviceContextMenu.deviceData.ports?.length ?? 0) > 0 && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
              onClick={() => {
                setFacePlateEditNodeId(deviceContextMenu.nodeId);
                setDeviceContextMenu(null);
              }}
            >
              Edit face-plate layout
            </button>
          )}
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
            onClick={() => {
              requestSchematicFocus(deviceContextMenu.nodeId);
              setDeviceContextMenu(null);
            }}
          >
            Show in Drawing
          </button>
        </div>
      )}
    </div>
  );
}

function CrossLinkSidebarRow({
  link,
  fromLabel,
  toLabel,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  link: RackCrossLink;
  fromLabel: string;
  toLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-1 py-1 px-1 -mx-1 rounded cursor-pointer group ${
        isSelected ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-neutral-50"
      }`}
      onClick={onSelect}
      title={`${fromLabel} → ${toLabel}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-neutral-800">{link.label}</div>
        <div className="truncate text-[10px] text-neutral-400">
          {fromLabel} → {toLabel}
        </div>
      </div>
      <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          className="text-neutral-300 hover:text-blue-600 px-0.5"
          title="Edit label"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          ✎
        </button>
        <button
          type="button"
          className="text-neutral-300 hover:text-red-500 px-0.5"
          title="Delete cross-link"
          onClick={(e) => { e.stopPropagation(); void onDelete(); }}
        >
          ×
        </button>
      </span>
    </div>
  );
}

function EditRackDialog({ pageId, rack, onClose }: { pageId: string; rack: RackData; onClose: () => void }) {
  const updateRack = useSchematicStore((s) => s.updateRack);
  const [label, setLabel] = useState(rack.label);
  const [rackType, setRackType] = useState<RackType>(rack.rackType);
  const [heightU, setHeightU] = useState(rack.heightU);
  const [depthMm, setDepthMm] = useState(rack.depthMm);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const cleanH = Math.max(2, Math.min(60, Math.round(heightU)));
    const cleanD = Math.max(100, Math.min(2000, Math.round(depthMm)));
    updateRack(pageId, rack.id, {
      label: label.trim() || rack.label,
      rackType,
      heightU: cleanH,
      depthMm: cleanD,
    });
    onClose();
  }, [pageId, rack.id, rack.label, label, rackType, heightU, depthMm, updateRack, onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form className="bg-white rounded-lg shadow-xl p-4 w-80 text-xs" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="font-semibold text-sm mb-3">Edit Rack</h3>

        <label className="block mb-2">
          <span className="text-neutral-600">Label</span>
          <input
            className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
          />
        </label>

        <label className="block mb-2">
          <span className="text-neutral-600">Type</span>
          <select
            className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
            value={rackType}
            onChange={(e) => setRackType(e.target.value as RackType)}
          >
            {(Object.entries(RACK_TYPE_LABELS) as [RackType, string][]).map(([value, lbl]) => (
              <option key={value} value={value}>{lbl}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 mb-3">
          <label className="block flex-1">
            <span className="text-neutral-600">Height (U)</span>
            <input
              type="number"
              className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
              value={heightU}
              onChange={(e) => setHeightU(Number(e.target.value))}
              onKeyDown={(e) => e.stopPropagation()}
              min={2}
              max={60}
            />
          </label>
          <label className="block flex-1">
            <span className="text-neutral-600">Depth (mm)</span>
            <input
              type="number"
              className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
              value={depthMm}
              onChange={(e) => setDepthMm(Number(e.target.value))}
              onKeyDown={(e) => e.stopPropagation()}
              min={100}
              max={2000}
              step={50}
            />
          </label>
        </div>

        <p className="text-neutral-400 text-[10px] mb-3">
          Reducing the U height does not delete devices already placed at higher U positions —
          they'll just sit outside the visible frame until you move or remove them.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-50" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </form>
    </div>
  );
}

interface RackPreset {
  label: string;
  rackType: RackType;
  heightU: number;
  depthMm: number;
  description: string;
}

const RACK_PRESETS: RackPreset[] = [
  { label: "42U Floor Rack", rackType: "floor-19", heightU: 42, depthMm: 600, description: "Standard full-height AV rack" },
  { label: "25U Floor Rack", rackType: "floor-19", heightU: 25, depthMm: 600, description: "Half-height floor standing" },
  { label: "16U Floor Rack", rackType: "floor-19", heightU: 16, depthMm: 600, description: "Short floor standing" },
  { label: "12U Wall Mount", rackType: "wall-mount", heightU: 12, depthMm: 600, description: "Wall-mounted enclosure" },
  { label: "6U Wall Mount", rackType: "wall-mount", heightU: 6, depthMm: 600, description: "Small wall-mount" },
  { label: "4U Desktop", rackType: "desktop", heightU: 4, depthMm: 600, description: "Tabletop / portable" },
  { label: "8U Desktop", rackType: "desktop", heightU: 8, depthMm: 600, description: "Larger tabletop rack" },
  { label: "45U Open 2-Post", rackType: "open-2post", heightU: 45, depthMm: 600, description: "2-post relay rack" },
  { label: "12U Open 2-Post", rackType: "open-2post", heightU: 12, depthMm: 600, description: "Small 2-post relay rack" },
  { label: "42U Open 4-Post", rackType: "open-4post", heightU: 42, depthMm: 800, description: "4-post open frame" },
];

function AddRackDialog({ pageId, rackCount, onClose }: { pageId: string; rackCount: number; onClose: () => void }) {
  const addRack = useSchematicStore((s) => s.addRack);
  const existingRacks = useSchematicStore((s) => {
    const page = s.pages.find((p) => p.id === pageId && p.type === "rack-elevation");
    return page?.type === "rack-elevation" ? page.racks : [];
  });
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [label, setLabel] = useState(`Rack ${rackCount + 1}`);
  const [rackType, setRackType] = useState<RackType>("floor-19");
  const [heightU, setHeightU] = useState(42);
  const [depthMm, setDepthMm] = useState(600);

  const defaultPosition = useMemo(() => {
    const maxHeightU = existingRacks.reduce((m, r) => Math.max(m, r.heightU), 42);
    const columns = existingRacks.length >= 6 ? 6 : Math.max(1, existingRacks.length);
    return nextRackPosition(existingRacks, { columns, maxHeightU });
  }, [existingRacks]);

  const applyPreset = useCallback((preset: RackPreset) => {
    addRack(pageId, {
      label: `Rack ${rackCount + 1}`,
      rackType: preset.rackType,
      heightU: preset.heightU,
      depthMm: preset.depthMm,
      widthClass: "19in",
      position: defaultPosition,
    });
    onClose();
  }, [pageId, rackCount, addRack, onClose, defaultPosition]);

  const handleCustomSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    addRack(pageId, {
      label: label.trim() || `Rack ${rackCount + 1}`,
      rackType,
      heightU: Math.max(2, Math.min(60, Math.round(heightU))),
      depthMm: Math.max(100, Math.min(2000, Math.round(depthMm))),
      widthClass: "19in",
      position: defaultPosition,
    });
    onClose();
  }, [pageId, label, rackType, heightU, depthMm, rackCount, addRack, onClose, defaultPosition]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-4 w-80 text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Add Rack</h3>
          <div className="flex rounded overflow-hidden border border-neutral-300">
            <button
              className={`px-2 py-0.5 ${mode === "presets" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"}`}
              onClick={() => setMode("presets")}
            >
              Presets
            </button>
            <button
              className={`px-2 py-0.5 ${mode === "custom" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"}`}
              onClick={() => setMode("custom")}
            >
              Custom
            </button>
          </div>
        </div>

        {mode === "presets" ? (
          <div className="flex flex-col gap-1">
            {RACK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="flex items-center justify-between px-3 py-2 rounded border border-neutral-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-colors"
                onClick={() => applyPreset(preset)}
              >
                <div>
                  <div className="font-medium text-neutral-800">{preset.label}</div>
                  <div className="text-neutral-400 text-[10px]">{preset.description}</div>
                </div>
                <span className="text-neutral-400 shrink-0 ml-2">{preset.heightU}U</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit}>
            <label className="block mb-2">
              <span className="text-neutral-600">Label</span>
              <input
                className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
            </label>

            <label className="block mb-2">
              <span className="text-neutral-600">Type</span>
              <select
                className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                value={rackType}
                onChange={(e) => setRackType(e.target.value as RackType)}
              >
                {(Object.entries(RACK_TYPE_LABELS) as [RackType, string][]).map(([value, lbl]) => (
                  <option key={value} value={value}>{lbl}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 mb-3">
              <label className="block flex-1">
                <span className="text-neutral-600">Height (U)</span>
                <input
                  type="number"
                  className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                  value={heightU}
                  onChange={(e) => setHeightU(Number(e.target.value))}
                  min={2}
                  max={60}
                />
              </label>
              <label className="block flex-1">
                <span className="text-neutral-600">Depth (mm)</span>
                <input
                  type="number"
                  className="mt-0.5 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                  value={depthMm}
                  onChange={(e) => setDepthMm(Number(e.target.value))}
                  min={100}
                  max={2000}
                  step={50}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-50" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                Add
              </button>
            </div>
          </form>
        )}

        {mode === "presets" && (
          <div className="flex justify-end mt-2">
            <button className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-50" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
