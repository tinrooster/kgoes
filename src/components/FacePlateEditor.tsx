import { useState, useCallback, useRef, useMemo, useEffect, type WheelEvent } from "react";
import type { DeviceData, FacePlateLayout, FacePlateLabel } from "../types";
import { inferRackHeightU, PX_PER_U, DEVICE_WIDTH_PX, PX_PER_MM } from "../rackUtils";
import {
  autoLayoutAllFacePlateItems,
  buildFacePlateLayoutPatch,
  countMatchingDeviceInstances,
  enumerateFacePlateItems,
  facePlateItemKey,
  FACE_PLATE_SNAP_PCT,
  itemsForPanel,
  normalizeFacePlatePositions,
  parseFacePlateItemKey,
  rackDeviceDefinitionKey,
  snapFacePlateCoord,
  snapGridSpacingPx,
  type FacePlatePanel,
} from "../facePlateUtils";
import { useSchematicStore } from "../store";
import { ConnectorIcon, getConnectorSpec } from "./connectorIcons";
import { SIGNAL_COLORS } from "../types";
import ApplyFacePlateLayoutDialog from "./ApplyFacePlateLayoutDialog";
import {
  hitTestItemRect,
  hitTestPoint,
  MARQUEE_BOX_STYLES,
  MARQUEE_FACE_PLATE_HALO_PX,
  MARQUEE_SCREEN_STROKE_PX,
  marqueeModeFromDrag,
  normalizeRect,
  type NormalizedRect,
} from "../selectionBoxUtils";
import {
  arrowDirectionFromKey,
  axisDelta,
  nudgeStepFacePlatePct,
  type ArrowDirection,
} from "../nudgeUtils";
import {
  IconAlignBottom,
  IconAlignHorizontalCentre,
  IconAlignTop,
  IconAlignVerticalCenter,
  IconDistributeSpacingHorizontal,
  IconDistributeSpacingVertical,
  LayoutToolbarButton,
} from "./LayoutToolbarIcons";

interface FacePlateEditorProps {
  nodeId: string;
  deviceData: DeviceData;
  onSave: (layout: FacePlateLayout) => void;
  onClose: () => void;
}

// Canonical padding around face plate (in rack-pixel units)
const PAD = 6;
const PANEL_GAP = 10;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const DEVICE_LABEL_ID = "__device_label__";
type PanelLayoutMode = "stacked" | "sideBySide";

/** Compute device label font size — same formula as rack view */
function computeDeviceLabelFont(fontSize: number, h: number) {
  return Math.max(4, fontSize * (h / 140));
}

/** viewBox width = svgW/zoom — zoom 1 shows the full plate; values > 1 magnify. */
function fitZoomToCanvas(canvasW: number, canvasH: number, svgW: number, svgH: number): number {
  if (canvasW <= 0 || canvasH <= 0 || svgW <= 0 || svgH <= 0) return 1;
  return Math.max(MIN_ZOOM, Math.min(1, (canvasW / svgW) * 0.92, (canvasH / svgH) * 0.92));
}

export default function FacePlateEditor({ nodeId, deviceData, onSave, onClose }: FacePlateEditorProps) {
  const heightU = inferRackHeightU(deviceData);
  const [activePanel, setActivePanel] = useState<FacePlatePanel>("front");
  const [panelLayout, setPanelLayout] = useState<PanelLayoutMode>("stacked");
  const [applyPrompt, setApplyPrompt] = useState<{ modelName: string; otherCount: number } | null>(null);
  const pendingLayoutRef = useRef<FacePlateLayout | null>(null);
  const [panelAssignments, setPanelAssignments] = useState<Record<string, FacePlatePanel>>(
    () => ({ ...(deviceData.facePlateLayout?.panelAssignments ?? {}) }),
  );
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  const allItems = useMemo(
    () => enumerateFacePlateItems(deviceData.ports ?? [], deviceData.deviceType, panelAssignments),
    [deviceData.ports, deviceData.deviceType, panelAssignments],
  );
  const frontCount = useMemo(() => itemsForPanel(allItems, "front").length, [allItems]);
  const rearCount = useMemo(() => itemsForPanel(allItems, "rear").length, [allItems]);
  const panelItems = useMemo(
    () => itemsForPanel(allItems, activePanel),
    [allItems, activePanel],
  );
  const dualPanels = rearCount > 0;

  // Canonical dimensions — exactly match the rack view
  const canonW = DEVICE_WIDTH_PX;
  const canonH = heightU * PX_PER_U - 1;
  const innerW =
    dualPanels && panelLayout === "sideBySide" ? canonW * 2 + PANEL_GAP : canonW;
  const innerH =
    dualPanels && panelLayout === "stacked" ? canonH * 2 + PANEL_GAP : canonH;
  const svgW = innerW + PAD * 2;
  const svgH = innerH + PAD * 2;

  const panelOrigin = useCallback(
    (panel: FacePlatePanel) => {
      if (!dualPanels) return { x: PAD, y: PAD };
      if (panelLayout === "sideBySide") {
        return panel === "rear"
          ? { x: PAD + canonW + PANEL_GAP, y: PAD }
          : { x: PAD, y: PAD };
      }
      return panel === "rear"
        ? { x: PAD, y: PAD + canonH + PANEL_GAP }
        : { x: PAD, y: PAD };
    },
    [dualPanels, panelLayout, canonW, canonH],
  );

  const panelAtPointer = useCallback(
    (svgX: number, svgY: number): FacePlatePanel => {
      if (!dualPanels) return activePanel;
      if (panelLayout === "sideBySide") {
        const rearStart = PAD + canonW + PANEL_GAP / 2;
        return svgX >= rearStart ? "rear" : "front";
      }
      const rearStart = PAD + canonH + PANEL_GAP / 2;
      return svgY >= rearStart ? "rear" : "front";
    },
    [dualPanels, panelLayout, canonW, canonH, activePanel],
  );

  // Face-plate rendering sizes
  const availableHeight = canonH - 14;
  const showPortLabels = availableHeight >= 30;
  const deviceColor = deviceData.headerColor ?? deviceData.color ?? "#4a90d9";

  // Zoom & pan state — start zoomed to fit
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    normalizeFacePlatePositions(
      deviceData.ports ?? [],
      deviceData.deviceType,
      deviceData.facePlateLayout?.positions,
      deviceData.facePlateLayout?.panelAssignments,
    ),
  );

  const [labels, setLabels] = useState<FacePlateLabel[]>(
    () => (deviceData.facePlateLayout?.labels ? [...deviceData.facePlateLayout.labels] : []),
  );

  // Device label position and size (fontSize is "design intent" — gets scaled by h/140)
  const [deviceLabelPos, setDeviceLabelPos] = useState<{ x: number; y: number; fontSize: number }>(
    () => ({
      x: deviceData.facePlateLayout?.deviceLabel?.x ?? 50,
      y: deviceData.facePlateLayout?.deviceLabel?.y ?? 8,
      fontSize: deviceData.facePlateLayout?.deviceLabel?.fontSize ?? 12,
    }),
  );

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(FACE_PLATE_SNAP_PCT);

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Undo / redo
  type Snapshot = {
    positions: Record<string, { x: number; y: number }>;
    labels: FacePlateLabel[];
    deviceLabelPos: { x: number; y: number; fontSize: number };
  };
  const historyRef = useRef<{ stack: Snapshot[]; index: number }>({ stack: [], index: -1 });

  const pushUndo = useCallback(() => {
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push({
      positions: { ...positions },
      labels: labels.map((l) => ({ ...l })),
      deviceLabelPos: { ...deviceLabelPos },
    });
    h.index = h.stack.length - 1;
  }, [positions, labels, deviceLabelPos]);

  const handleUndo = useCallback(() => {
    const h = historyRef.current;
    if (h.index < 0) return;
    if (h.index === h.stack.length - 1) {
      h.stack.push({
        positions: { ...positions },
        labels: labels.map((l) => ({ ...l })),
        deviceLabelPos: { ...deviceLabelPos },
      });
    }
    const snap = h.stack[h.index];
    h.index--;
    setPositions(snap.positions);
    setLabels(snap.labels);
    setDeviceLabelPos(snap.deviceLabelPos);
  }, [positions, labels, deviceLabelPos]);

  const handleRedo = useCallback(() => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 2) return;
    h.index += 2;
    const snap = h.stack[h.index];
    h.index--;
    setPositions(snap.positions);
    setLabels(snap.labels);
    setDeviceLabelPos(snap.deviceLabelPos);
  }, []);

  // Drag state — tracks group drag with initial positions
  const dragRef = useRef<{
    type: "port" | "label" | "device-label";
    id: string;
    offsetX: number;
    offsetY: number;
    initPositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    clientX1: number;
    clientX2: number;
  } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; startClientX: number } | null>(null);
  const justFinishedInteraction = useRef(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const autoFitDoneRef = useRef(false);

  const snapX = useCallback(
    (val: number) => {
      const clamped = Math.max(2, Math.min(98, val));
      if (!snapEnabled) return clamped;
      return snapFacePlateCoord(clamped, gridSize);
    },
    [snapEnabled, gridSize],
  );

  const snapY = useCallback(
    (val: number) => {
      const clamped = Math.max(2, Math.min(98, val));
      if (!snapEnabled) return clamped;
      return snapFacePlateCoord(clamped, gridSize);
    },
    [snapEnabled, gridSize],
  );

  // Convert mouse position to face-plate percentage coordinates (viewBox-aware via getScreenCTM)
  const toFaceCoords = useCallback(
    (e: React.MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 50, y: 50, panel: activePanel as FacePlatePanel };
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 50, y: 50, panel: activePanel as FacePlatePanel };
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      const panel = panelAtPointer(svgPt.x, svgPt.y);
      const origin = panelOrigin(panel);
      return {
        panel,
        x: ((svgPt.x - origin.x) / canonW) * 100,
        y: ((svgPt.y - origin.y) / canonH) * 100,
      };
    },
    [canonW, canonH, activePanel, panelAtPointer, panelOrigin],
  );

  // Get position for any item by id
  const getItemPos = useCallback((id: string): { x: number; y: number } | undefined => {
    if (id === DEVICE_LABEL_ID) return deviceLabelPos;
    if (positions[id]) return positions[id];
    return labels.find((l) => l.id === id);
  }, [positions, labels, deviceLabelPos]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: "port" | "label" | "device-label") => {
      e.preventDefault();
      e.stopPropagation();
      const coords = toFaceCoords(e);
      const pos = getItemPos(id);
      if (!pos) return;

      // Multi-select with shift
      let newSelection: Set<string>;
      if (e.shiftKey) {
        newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
      } else if (!selectedIds.has(id)) {
        newSelection = new Set([id]);
      } else {
        newSelection = selectedIds;
      }
      setSelectedIds(newSelection);

      // Snapshot initial positions for group drag
      const initPositions: Record<string, { x: number; y: number }> = {};
      for (const sid of newSelection) {
        const spos = sid === id ? pos : getItemPos(sid);
        if (spos) initPositions[sid] = { x: spos.x, y: spos.y };
      }

      pushUndo();
      dragRef.current = { type, id, offsetX: coords.x - pos.x, offsetY: coords.y - pos.y, initPositions };
    },
    [toFaceCoords, getItemPos, selectedIds, pushUndo],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Marquee dragging
      if (marqueeRef.current) {
        const coords = toFaceCoords(e);
        setMarquee({
          x1: marqueeRef.current.startX,
          y1: marqueeRef.current.startY,
          x2: coords.x,
          y2: coords.y,
          clientX1: marqueeRef.current.startClientX,
          clientX2: e.clientX,
        });
        return;
      }

      if (!dragRef.current) return;
      const coords = toFaceCoords(e);
      const { id, offsetX, offsetY, initPositions } = dragRef.current;

      const initPos = initPositions[id];
      if (!initPos) return;
      const snappedX = snapX(coords.x - offsetX);
      const snappedY = snapY(coords.y - offsetY);
      const dx = snappedX - initPos.x;
      const dy = snappedY - initPos.y;

      const updatedPorts: Record<string, { x: number; y: number }> = {};
      const updatedLabels: { id: string; x: number; y: number }[] = [];
      let updatedDeviceLabel: { x: number; y: number } | null = null;

      for (const [sid, spos] of Object.entries(initPositions)) {
        const newX = Math.max(2, Math.min(98, spos.x + dx));
        const newY = Math.max(2, Math.min(98, spos.y + dy));
        if (sid === DEVICE_LABEL_ID) {
          updatedDeviceLabel = { x: newX, y: newY };
        } else if (positions[sid]) {
          updatedPorts[sid] = { x: newX, y: newY };
        } else {
          updatedLabels.push({ id: sid, x: newX, y: newY });
        }
      }

      if (Object.keys(updatedPorts).length > 0) {
        setPositions((prev) => ({ ...prev, ...updatedPorts }));
      }
      if (updatedLabels.length > 0) {
        setLabels((prev) => prev.map((l) => {
          const upd = updatedLabels.find((u) => u.id === l.id);
          return upd ? { ...l, x: upd.x, y: upd.y } : l;
        }));
      }
      if (updatedDeviceLabel) {
        setDeviceLabelPos((prev) => ({ ...prev, ...updatedDeviceLabel }));
      }
    },
    [toFaceCoords, snapX, snapY, positions],
  );

  const portItemRect = useCallback(
    (itemKey: string, pos: { x: number; y: number }): NormalizedRect => {
      const item = allItems.find((i) => i.key === itemKey);
      if (!item) {
        return { minX: pos.x, maxX: pos.x, minY: pos.y, maxY: pos.y };
      }
      const spec = getConnectorSpec(item.connectorType);
      const halfW = ((spec.widthMm * PX_PER_MM) / 2 / canonW) * 100;
      const halfH = ((spec.heightMm * PX_PER_MM) / 2 / canonH) * 100;
      return {
        minX: pos.x - halfW,
        maxX: pos.x + halfW,
        minY: pos.y - halfH,
        maxY: pos.y + halfH,
      };
    },
    [allItems, canonW, canonH],
  );

  const handleMouseUp = useCallback(() => {
    if (marqueeRef.current && marquee) {
      const box = normalizeRect(marquee.x1, marquee.y1, marquee.x2, marquee.y2);
      const mode = marqueeModeFromDrag(marquee.clientX1, marquee.clientX2);
      const hasArea = box.maxX - box.minX > 0.25 && box.maxY - box.minY > 0.25;

      if (hasArea) {
        const hits = new Set<string>();
        for (const [pid, pos] of Object.entries(positions)) {
          const parsed = parseFacePlateItemKey(pid);
          if (dualPanels && parsed.panel && parsed.panel !== activePanel) continue;
          const rect = portItemRect(pid, pos);
          if (mode === "window") {
            if (hitTestItemRect(mode, rect, box)) hits.add(pid);
          } else {
            const cx = (rect.minX + rect.maxX) / 2;
            const cy = (rect.minY + rect.maxY) / 2;
            if (hitTestPoint("window", cx, cy, box)) hits.add(pid);
          }
        }
        for (const lbl of labels) {
          if (hitTestPoint(mode, lbl.x, lbl.y, box)) hits.add(lbl.id);
        }
        if (hitTestPoint(mode, deviceLabelPos.x, deviceLabelPos.y, box)) {
          hits.add(DEVICE_LABEL_ID);
        }
        setSelectedIds(hits);
      }

      setMarquee(null);
      marqueeRef.current = null;
    }

    dragRef.current = null;
    panRef.current = null;
    justFinishedInteraction.current = true;
  }, [marquee, positions, labels, deviceLabelPos, portItemRect, dualPanels, activePanel]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const ratio = newZoom / zoom;
    setPan((prev) => ({
      x: svgPt.x - (svgPt.x - prev.x) * ratio,
      y: svgPt.y - (svgPt.y - prev.y) * ratio,
    }));
    setZoom(newZoom);
  }, [zoom]);

  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    if (e.button === 0) {
      const coords = toFaceCoords(e);
      if (dualPanels) setActivePanel(coords.panel);
      marqueeRef.current = { startX: coords.x, startY: coords.y, startClientX: e.clientX };
      setMarquee({
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
        clientX1: e.clientX,
        clientX2: e.clientX,
      });
      if (!e.shiftKey) setSelectedIds(new Set());
    }
  }, [pan, toFaceCoords, dualPanels]);

  const handleBgMouseMove = useCallback((e: React.MouseEvent) => {
    if (panRef.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const scale = ctm.a;
      const dx = (e.clientX - panRef.current.startX) / scale;
      const dy = (e.clientY - panRef.current.startY) / scale;
      setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
      return;
    }
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleResetView = useCallback(() => {
    const el = canvasRef.current;
    if (el) {
      setZoom(fitZoomToCanvas(el.clientWidth, el.clientHeight, svgW, svgH));
    } else {
      setZoom(1);
    }
    setPan({ x: 0, y: 0 });
    autoFitDoneRef.current = true;
  }, [svgW, svgH]);

  const handleResetLayout = useCallback(() => {
    pushUndo();
    setPositions(
      autoLayoutAllFacePlateItems(deviceData.ports ?? [], deviceData.deviceType, panelAssignments),
    );
    setLabels([]);
    setDeviceLabelPos({ x: 50, y: 8, fontSize: 12 });
    setSelectedIds(new Set());
  }, [deviceData.ports, deviceData.deviceType, panelAssignments, pushUndo]);

  const movePortToPanel = useCallback(
    (portId: string, fromKey: string, targetPanel: FacePlatePanel) => {
      const port = (deviceData.ports ?? []).find((p) => p.id === portId);
      if (!port || port.direction === "passthrough") return;
      pushUndo();
      setPanelAssignments((prev) => ({ ...prev, [portId]: targetPanel }));
      const newKey = facePlateItemKey(portId, targetPanel);
      setPositions((prev) => {
        const pos = prev[fromKey] ?? prev[portId];
        const next = { ...prev };
        if (pos) next[newKey] = pos;
        delete next[fromKey];
        delete next[portId];
        return next;
      });
      setActivePanel(targetPanel);
      setSelectedIds(new Set([newKey]));
    },
    [deviceData.ports, pushUndo],
  );

  const moveSelectedPortsToPanel = useCallback((targetPanel: FacePlatePanel) => {
    const ports = deviceData.ports ?? [];
    const selected = [...selectedIds]
      .map((id) => ({ id, parsed: parseFacePlateItemKey(id) }))
      .filter(({ parsed }) => parsed.panel === "front" || parsed.panel === "rear")
      .map(({ id, parsed }) => ({ id, portId: parsed.portId }));
    if (selected.length === 0) return;
    const movable = selected.filter(({ portId }) => {
      const p = ports.find((x) => x.id === portId);
      return p && p.direction !== "passthrough";
    });
    if (movable.length === 0) return;
    pushUndo();
    const movedSelection = new Set<string>();
    setPanelAssignments((prev) => {
      const next = { ...prev };
      for (const m of movable) next[m.portId] = targetPanel;
      return next;
    });
    setPositions((prev) => {
      const next = { ...prev };
      for (const m of movable) {
        const newKey = facePlateItemKey(m.portId, targetPanel);
        const oldPos = next[m.id] ?? next[m.portId];
        if (oldPos) next[newKey] = oldPos;
        delete next[m.id];
        delete next[m.portId];
        movedSelection.add(newKey);
      }
      return next;
    });
    setSelectedIds(movedSelection);
    setActivePanel(targetPanel);
  }, [deviceData.ports, selectedIds, pushUndo]);

  const handleAddLabel = useCallback(() => {
    pushUndo();
    const id = `lbl-${Date.now()}`;
    setLabels((prev) => [...prev, { id, text: "LABEL", x: 50, y: 8, fontSize: 4 }]);
    setSelectedIds(new Set([id]));
  }, [pushUndo]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const labelIds = new Set(labels.map((l) => l.id));
    const toDelete = [...selectedIds].filter((id) => labelIds.has(id));
    if (toDelete.length > 0) {
      pushUndo();
      const delSet = new Set(toDelete);
      setLabels((prev) => prev.filter((l) => !delSet.has(l.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of toDelete) next.delete(id);
        return next;
      });
    }
  }, [selectedIds, labels, pushUndo]);

  const commitSave = useCallback(
    (applyToAll: boolean) => {
      const layout = pendingLayoutRef.current;
      if (!layout) return;
      useSchematicStore.getState().saveFacePlateLayout(nodeId, layout, {
        applyToMatching: applyToAll,
        updateDefinition: applyToAll,
      });
      pendingLayoutRef.current = null;
      setApplyPrompt(null);
      onClose();
    },
    [nodeId, onSave, onClose],
  );

  const handleSave = useCallback(() => {
    const layout = buildFacePlateLayoutPatch(
      positions,
      labels.length > 0 ? labels : undefined,
      { x: deviceLabelPos.x, y: deviceLabelPos.y, fontSize: deviceLabelPos.fontSize },
      panelAssignments,
    );
    pendingLayoutRef.current = layout;
    const defKey = rackDeviceDefinitionKey(deviceData);
    const { others, modelName } = countMatchingDeviceInstances(
      useSchematicStore.getState().nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data as DeviceData,
      })),
      nodeId,
      defKey,
    );
    if (others.length > 0) {
      setApplyPrompt({ modelName, otherCount: others.length });
      return;
    }
    commitSave(false);
  }, [positions, labels, deviceLabelPos, deviceData, nodeId, commitSave]);

  // ── Align / Distribute ──────────────────────────────────────────────

  const getSelectedPositions = useCallback(() => {
    const items: { id: string; x: number; y: number }[] = [];
    for (const id of selectedIds) {
      const pos = getItemPos(id);
      if (pos) items.push({ id, x: pos.x, y: pos.y });
    }
    return items;
  }, [selectedIds, getItemPos]);

  const applyPositions = useCallback((items: { id: string; x: number; y: number }[]) => {
    const portUpdates: Record<string, { x: number; y: number }> = {};
    const labelUpdates: { id: string; x: number; y: number }[] = [];
    let devLabel: { x: number; y: number } | null = null;

    for (const item of items) {
      if (item.id === DEVICE_LABEL_ID) {
        devLabel = { x: item.x, y: item.y };
      } else if (positions[item.id]) {
        portUpdates[item.id] = { x: item.x, y: item.y };
      } else {
        labelUpdates.push(item);
      }
    }
    if (Object.keys(portUpdates).length > 0) {
      setPositions((prev) => ({ ...prev, ...portUpdates }));
    }
    if (labelUpdates.length > 0) {
      setLabels((prev) => prev.map((l) => {
        const upd = labelUpdates.find((u) => u.id === l.id);
        return upd ? { ...l, x: upd.x, y: upd.y } : l;
      }));
    }
    if (devLabel) {
      setDeviceLabelPos((prev) => ({ ...prev, ...devLabel }));
    }
  }, [positions]);

  const handleAlign = useCallback((axis: "x" | "y", edge: "min" | "mid" | "max") => {
    const items = getSelectedPositions();
    if (items.length < 2) return;
    pushUndo();
    const values = items.map((it) => axis === "x" ? it.x : it.y);
    let target: number;
    if (edge === "min") target = Math.min(...values);
    else if (edge === "max") target = Math.max(...values);
    else target = (Math.min(...values) + Math.max(...values)) / 2;
    applyPositions(items.map((it) => ({
      ...it,
      x: axis === "x" ? target : it.x,
      y: axis === "y" ? target : it.y,
    })));
  }, [getSelectedPositions, applyPositions, pushUndo]);

  const handleDistribute = useCallback((axis: "x" | "y") => {
    const items = getSelectedPositions();
    if (items.length < 2) return;
    pushUndo();
    const sorted = [...items].sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
    if (sorted.length === 2) {
      const a = axis === "x" ? sorted[0].x : sorted[0].y;
      const b = axis === "x" ? sorted[1].x : sorted[1].y;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      applyPositions([
        { ...sorted[0], ...(axis === "x" ? { x: lo } : { y: lo }) },
        { ...sorted[1], ...(axis === "x" ? { x: hi } : { y: hi }) },
      ]);
      return;
    }
    const first = axis === "x" ? sorted[0].x : sorted[0].y;
    const last = axis === "x" ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
    const step = (last - first) / (sorted.length - 1);
    applyPositions(sorted.map((it, i) => ({
      ...it,
      x: axis === "x" ? first + step * i : it.x,
      y: axis === "y" ? first + step * i : it.y,
    })));
  }, [getSelectedPositions, applyPositions, pushUndo]);

  const panelRef = useRef<HTMLDivElement>(null);

  const handleNudge = useCallback(
    (direction: ArrowDirection) => {
      if (!direction || selectedIds.size === 0 || editingLabelId) return;

      let stepX: number;
      let stepY: number;
      if (snapEnabled) {
        const step = gridSize;
        ({ dx: stepX, dy: stepY } = axisDelta(direction, step));
      } else {
        const scale = svgRef.current?.getScreenCTM()?.a ?? 1;
        const { dxPct, dyPct } = nudgeStepFacePlatePct(scale, canonW, canonH);
        stepX = direction === "left" ? -dxPct : direction === "right" ? dxPct : 0;
        stepY = direction === "up" ? -dyPct : direction === "down" ? dyPct : 0;
      }

      pushUndo();
      const items = getSelectedPositions().map((it) => ({
        ...it,
        x: Math.max(2, Math.min(98, it.x + stepX)),
        y: Math.max(2, Math.min(98, it.y + stepY)),
      }));
      applyPositions(items);
    },
    [
      selectedIds.size,
      editingLabelId,
      snapEnabled,
      gridSize,
      canonW,
      canonH,
      pushUndo,
      getSelectedPositions,
      applyPositions,
    ],
  );

  useEffect(() => {
    autoFitDoneRef.current = false;
  }, [svgW, svgH, panelLayout]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const applyFit = () => {
      if (autoFitDoneRef.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      autoFitDoneRef.current = true;
      setZoom(fitZoomToCanvas(w, h, svgW, svgH));
      setPan({ x: 0, y: 0 });
    };
    applyFit();
    const ro = new ResizeObserver(applyFit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [svgW, svgH, panelLayout]);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F9") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      e.stopPropagation();
      setSnapEnabled((v) => !v);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // ── Port data ───────────────────────────────────────────────────────

  const portMap = useMemo(() => {
    const map = new Map<string, (typeof deviceData.ports)[number]>();
    for (const p of deviceData.ports ?? []) map.set(p.id, p);
    return map;
  }, [deviceData]);

  const panelItemKeys = useMemo(() => panelItems.map((i) => i.key), [panelItems]);

  // Status info
  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selectedParsed = singleSelectedId ? parseFacePlateItemKey(singleSelectedId) : null;
  const selectedPort = selectedParsed ? portMap.get(selectedParsed.portId) : null;
  const selectedPortPanel = selectedParsed?.panel;
  const selectedLabel = singleSelectedId ? labels.find((l) => l.id === singleSelectedId) : null;
  const selectedPos = singleSelectedId ? positions[singleSelectedId] : null;
  const isDeviceLabelSelected = singleSelectedId === DEVICE_LABEL_ID;
  const selectedLabelCount = useMemo(
    () => [...selectedIds].filter((id) => labels.some((l) => l.id === id)).length,
    [selectedIds, labels],
  );
  const canMoveSelectedPort =
    !!singleSelectedId &&
    !!selectedPort &&
    selectedPort.direction !== "passthrough" &&
    !!selectedPortPanel &&
    (selectedPortPanel === "front" || selectedPortPanel === "rear");
  const selectedMovablePorts = useMemo(() => {
    const ports = deviceData.ports ?? [];
    return [...selectedIds]
      .map((id) => parseFacePlateItemKey(id))
      .filter((x) => x.panel === "front" || x.panel === "rear")
      .map((x) => ports.find((p) => p.id === x.portId))
      .filter((p): p is NonNullable<typeof p> => !!p && p.direction !== "passthrough").length;
  }, [selectedIds, deviceData.ports]);

  // Computed device label font (same formula as rack view)
  const dlFontSize = computeDeviceLabelFont(deviceLabelPos.fontSize, canonH);

  const marqueeMode = marquee ? marqueeModeFromDrag(marquee.clientX1, marquee.clientX2) : null;
  const marqueeStyle = marqueeMode ? MARQUEE_BOX_STYLES[marqueeMode] : null;

  // Marquee rect in canonical SVG coordinates
  const activeOrigin = panelOrigin(activePanel);
  const marqueeRect = marquee ? {
    x: activeOrigin.x + (Math.min(marquee.x1, marquee.x2) / 100) * canonW,
    y: activeOrigin.y + (Math.min(marquee.y1, marquee.y2) / 100) * canonH,
    w: (Math.abs(marquee.x2 - marquee.x1) / 100) * canonW,
    h: (Math.abs(marquee.y2 - marquee.y1) / 100) * canonH,
  } : null;

  const visiblePanels = useMemo(
    (): FacePlatePanel[] => (dualPanels ? ["front", "rear"] : [activePanel]),
    [dualPanels, activePanel],
  );

  const selStroke = 1.1;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose} onWheel={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-xl flex flex-col text-xs outline-none"
        style={{ width: "90vw", height: "90vh", maxWidth: 1400 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Delete" || e.key === "Backspace") handleDeleteSelected();
          if (e.key === "Escape") { if (selectedIds.size > 0) setSelectedIds(new Set()); else onClose(); }
          if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setSelectedIds(new Set(panelItemKeys));
          }
          if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
          }
          if ((e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === "y" && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            handleRedo();
          }
          const dir = arrowDirectionFromKey(e.key);
          if (dir && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handleNudge(dir);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Face-plate layout editor</h3>
            <span className="text-neutral-500">{deviceData.label} — {heightU}U</span>
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                className={`px-2 py-0.5 text-[11px] rounded-md border font-medium ${
                  activePanel === "front"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
                }`}
                onClick={() => { setActivePanel("front"); setSelectedIds(new Set()); }}
              >
                Front panel{frontCount > 0 ? ` (${frontCount})` : ""}
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 text-[11px] rounded-md border font-medium ${
                  activePanel === "rear"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
                }`}
                onClick={() => { setActivePanel("rear"); setSelectedIds(new Set()); }}
              >
                Rear panel ({rearCount})
              </button>
              {dualPanels && (
                <span className="inline-flex rounded-md border border-neutral-300 overflow-hidden ml-1">
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] ${panelLayout === "stacked" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"}`}
                    onClick={() => setPanelLayout("stacked")}
                  >
                    Stacked
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[10px] border-l border-neutral-300 ${panelLayout === "sideBySide" ? "bg-blue-600 text-white" : "bg-white text-neutral-600"}`}
                    onClick={() => setPanelLayout("sideBySide")}
                  >
                    Side by side
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50 text-xs disabled:opacity-40"
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50 text-xs disabled:opacity-40"
              onClick={handleRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50 text-xs"
              onClick={handleResetLayout}
              title="Reset all positions to auto-layout"
            >
              Reset layout
            </button>
            <button
              type="button"
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none px-1"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50 text-[11px] text-neutral-600 leading-snug">
          {dualPanels ? (
            <>
              <strong>Front</strong> and <strong>rear</strong> shown {panelLayout === "stacked" ? "stacked" : "side by side"} · click a panel to focus ·
            </>
          ) : (
            <strong>{activePanel === "front" ? "Front" : "Rear"}</strong>
          )}
          {" "}patch inputs default to rear, outputs to front · click to select/move · double-click a label to edit text
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-neutral-200 bg-white">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 shrink-0">Align</span>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleAlign("x", "mid")}
            title="Align horizontal centers — line up the middle of each selected item left–right"
          >
            <IconAlignHorizontalCentre />
          </LayoutToolbarButton>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleAlign("y", "min")}
            title="Align top edges — move selected items to the same top row"
          >
            <IconAlignTop />
          </LayoutToolbarButton>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleAlign("y", "mid")}
            title="Align vertical centers — line up the middle of each selected item top–bottom"
          >
            <IconAlignVerticalCenter />
          </LayoutToolbarButton>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleAlign("y", "max")}
            title="Align bottom edges — move selected items to the same bottom row"
          >
            <IconAlignBottom />
          </LayoutToolbarButton>
          <span className="text-neutral-300">|</span>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 shrink-0">Distribute</span>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleDistribute("x")}
            title="Distribute horizontal spacing — 2 items snap to left & right edges; 3+ get even gaps between the outermost items"
          >
            <IconDistributeSpacingHorizontal />
          </LayoutToolbarButton>
          <LayoutToolbarButton
            disabled={selectedIds.size < 2}
            onClick={() => handleDistribute("y")}
            title="Distribute vertical spacing — 2 items snap to top & bottom edges; 3+ get even gaps between the outermost items (does not move everything downward)"
          >
            <IconDistributeSpacingVertical />
          </LayoutToolbarButton>
          <span className="text-neutral-300">|</span>
          <button type="button" className="px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-50" onClick={handleAddLabel} title="Add a text label on the face-plate (edit in place)">+ Label</button>
          <button
            type="button"
            className="px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
            disabled={selectedLabelCount === 0}
            onClick={handleDeleteSelected}
            title="Delete selected labels"
          >
            Delete label
          </button>
          {canMoveSelectedPort && (
            <button
              type="button"
              className="px-2 py-1 text-[11px] rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() =>
                movePortToPanel(
                  selectedParsed!.portId,
                  singleSelectedId!,
                  selectedPortPanel === "front" ? "rear" : "front",
                )
              }
              title="Move selected port to the other panel"
            >
              Move to {selectedPortPanel === "front" ? "rear" : "front"} panel
            </button>
          )}
          {selectedMovablePorts > 1 && (
            <button
              type="button"
              className="px-2 py-1 text-[11px] rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => moveSelectedPortsToPanel(activePanel === "front" ? "rear" : "front")}
              title="Move all selected ports to the other panel"
            >
              Move {selectedMovablePorts} selected to {activePanel === "front" ? "rear" : "front"}
            </button>
          )}
          {isDeviceLabelSelected && (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-neutral-500 text-[10px]">Title size</span>
              <input
                type="range"
                min={6}
                max={20}
                step={1}
                value={deviceLabelPos.fontSize}
                onChange={(e) => setDeviceLabelPos((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                className="w-16 accent-blue-600"
              />
            </div>
          )}
          {selectedLabel && (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-neutral-500 text-[10px]">Label size</span>
              <input
                type="range"
                min={3}
                max={8}
                step={0.25}
                value={selectedLabel.fontSize ?? 4}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLabels((prev) => prev.map((l) => (l.id === selectedLabel.id ? { ...l, fontSize: v } : l)));
                }}
                className="w-16 accent-blue-600"
              />
            </div>
          )}
          <span className="text-[10px] text-neutral-400 ml-auto max-w-[280px] leading-snug">
            {selectedIds.size < 2
              ? "Marquee: drag right (blue) = fully inside · drag left (green) = center inside box · Arrow keys nudge"
              : "Distribute spaces evenly between outer items on that axis"}
          </span>
        </div>

        {/* Canvas — renders at canonical rack dimensions, viewBox scales up */}
        <div ref={canvasRef} className="flex-1 overflow-hidden bg-neutral-100 relative" style={{ minHeight: 0 }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${svgW / 2 - svgW / (2 * zoom) - pan.x} ${svgH / 2 - svgH / (2 * zoom) - pan.y} ${svgW / zoom} ${svgH / zoom}`}
            className="select-none"
            onMouseMove={handleBgMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleBgMouseDown}
            onWheel={handleWheel}
            onClick={() => { if (justFinishedInteraction.current) { justFinishedInteraction.current = false; return; } setSelectedIds(new Set()); }}
          >
            {visiblePanels.map((panel) => {
              const origin = panelOrigin(panel);
              const ox = origin.x;
              const oy = origin.y;
              const panelPorts = itemsForPanel(allItems, panel);
              const isFocus = activePanel === panel;
              return (
                <g key={panel} opacity={dualPanels && !isFocus ? 0.92 : 1}>
                  <rect
                    x={ox}
                    y={oy}
                    width={canonW}
                    height={canonH}
                    rx={1}
                    fill={deviceColor}
                    stroke={isFocus ? "#333" : "#666"}
                    strokeWidth={isFocus ? 0.75 : 0.5}
                  />
                  {dualPanels && (
                    <text
                      x={ox + canonW / 2}
                      y={oy - 2}
                      textAnchor="middle"
                      fontSize={4.5}
                      fontWeight={600}
                      fill={isFocus ? "#1e40af" : "#64748b"}
                      style={{ pointerEvents: "none" }}
                    >
                      {panel === "front" ? "Front" : "Rear"} ({panelPorts.length})
                    </text>
                  )}
                  {snapEnabled && (() => {
                    const cellPx = (gridSize / 100) * canonW;
                    const vLines = Math.floor(canonW / cellPx) - 1;
                    const hLines = Math.floor(canonH / cellPx) - 1;
                    return (
                      <g>
                        {Array.from({ length: vLines }, (_, i) => {
                          const gx = ox + cellPx * (i + 1);
                          return <line key={`v${panel}${i}`} x1={gx} y1={oy} x2={gx} y2={oy + canonH} stroke="rgba(255,255,255,0.15)" strokeWidth={0.25} />;
                        })}
                        {Array.from({ length: hLines }, (_, i) => {
                          const gy = oy + cellPx * (i + 1);
                          return <line key={`h${panel}${i}`} x1={ox} y1={gy} x2={ox + canonW} y2={gy} stroke="rgba(255,255,255,0.15)" strokeWidth={0.25} />;
                        })}
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* Device label — same rendering as rack view (on each visible panel) */}
            {visiblePanels.map((panel) => {
              const origin = panelOrigin(panel);
              const dlx = origin.x + (deviceLabelPos.x / 100) * canonW;
              const dly = origin.y + (deviceLabelPos.y / 100) * canonH;
              const isSel = selectedIds.has(DEVICE_LABEL_ID);
              const truncLabel = deviceData.label.length > 28 ? deviceData.label.slice(0, 27) + "…" : deviceData.label;
              return (
                <g key={`dl-${panel}`}>
                  {isSel && activePanel === panel && (
                    <rect
                      x={dlx - dlFontSize * 3}
                      y={dly - dlFontSize * 0.6}
                      width={dlFontSize * 6}
                      height={dlFontSize * 1.2}
                      fill="rgba(15,23,42,0.35)"
                      stroke="#fde047"
                      strokeWidth={selStroke}
                      strokeDasharray="2 1"
                      rx={0.5}
                    />
                  )}
                  <text
                    x={dlx}
                    y={dly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={dlFontSize}
                    fontWeight={600}
                    fill="#fff"
                    style={{ cursor: "grab" }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      if (dualPanels) setActivePanel(panel);
                      handleMouseDown(e, DEVICE_LABEL_ID, "device-label");
                    }}
                  >
                    {truncLabel}
                  </text>
                </g>
              );
            })}

            {/* Section labels — edit in place when selected */}
            {labels.map((lbl) => {
              const origin = panelOrigin(activePanel);
              const lx = origin.x + (lbl.x / 100) * canonW;
              const ly = origin.y + (lbl.y / 100) * canonH;
              const isSel = selectedIds.has(lbl.id);
              const editingThis = editingLabelId === lbl.id;
              return (
                <g key={lbl.id}>
                  {isSel && !editingThis && (
                    <rect
                      x={lx - 10}
                      y={ly - 2.5}
                      width={20}
                      height={5}
                      fill="rgba(15,23,42,0.3)"
                      stroke="#fde047"
                      strokeWidth={selStroke}
                      strokeDasharray="2 1"
                      rx={0.5}
                    />
                  )}
                  {editingThis ? (
                    <foreignObject
                      x={lx - 28}
                      y={ly - 4.5}
                      width={56}
                      height={9}
                      style={{ overflow: "visible" }}
                    >
                      <input
                        type="text"
                        value={lbl.text}
                        autoFocus
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLabels((prev) =>
                            prev.map((l) => (l.id === lbl.id ? { ...l, text: val } : l)),
                          );
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter" || e.key === "Escape") setEditingLabelId(null);
                        }}
                        onBlur={() => setEditingLabelId(null)}
                        style={{
                          width: "100%",
                          fontSize: Math.max(6, (lbl.fontSize ?? 4) * 1.5),
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          border: "1px solid #3b82f6",
                          borderRadius: 2,
                          padding: "1px 4px",
                          outline: "none",
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={lbl.fontSize ?? 3.5}
                      fontWeight={700}
                      fill="rgba(255,255,255,0.6)"
                      letterSpacing={0.5}
                      style={{ cursor: "grab", textTransform: "uppercase" }}
                      onClick={(e) => { e.stopPropagation(); setEditingLabelId(null); setSelectedIds(new Set([lbl.id])); }}
                      onDoubleClick={(e) => { e.stopPropagation(); setSelectedIds(new Set([lbl.id])); setEditingLabelId(lbl.id); }}
                      onMouseDown={(e) => handleMouseDown(e, lbl.id, "label")}
                    >
                      {lbl.text}
                    </text>
                  )}
                </g>
              );
            })}

            {visiblePanels.map((panel) => {
              const origin = panelOrigin(panel);
              const portsOnPanel = itemsForPanel(allItems, panel);
              if (portsOnPanel.length > 0) return null;
              return (
                <text
                  key={`empty-${panel}`}
                  x={origin.x + canonW / 2}
                  y={origin.y + canonH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={5}
                  fill="rgba(255,255,255,0.55)"
                  style={{ pointerEvents: "none" }}
                >
                  {panel === "rear"
                    ? "No ports on rear"
                    : "No ports on front"}
                </text>
              );
            })}

            {/* Connector icons — same rendering as rack view */}
            {visiblePanels.flatMap((panel) => {
              const origin = panelOrigin(panel);
              return itemsForPanel(allItems, panel).map((item) => {
                const lp = {
                  ...item,
                  x: positions[item.key]?.x ?? 50,
                  y: positions[item.key]?.y ?? 50,
                };
              const port = portMap.get(lp.portId);
              if (!port) return null;
              const cx = origin.x + (lp.x / 100) * canonW;
              const cy = origin.y + (lp.y / 100) * canonH;
              const sigColor = (SIGNAL_COLORS as Record<string, string>)[lp.signalType] ?? "#fff";
              const isSel = selectedIds.has(lp.key);

              const canMovePanel = port.direction !== "passthrough";
              return (
                <g
                  key={lp.key}
                  style={{ cursor: "grab" }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    if (dualPanels) setActivePanel(panel);
                    handleMouseDown(e, lp.key, "port");
                  }}
                  onContextMenu={(e) => {
                    if (!canMovePanel) return;
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {/* Selection ring */}
                  {isSel && (() => {
                    const spec = getConnectorSpec(lp.connectorType);
                    const selR = Math.max(spec.widthMm, spec.heightMm) * PX_PER_MM / 2 + 1;
                    return (
                      <circle cx={cx} cy={cy} r={selR + 0.5}
                        fill="rgba(250,204,21,0.25)" stroke="#fde047" strokeWidth={selStroke}
                      />
                    );
                  })()}
                  {/* Connector icon — same size as rack view */}
                  <ConnectorIcon
                    x={cx}
                    y={cy}
                    connectorType={lp.connectorType}
                    scale={PX_PER_MM}
                    color={sigColor}
                    detail={2}
                  />
                  {/* Port label — same as rack view */}
                  {showPortLabels && (
                    <text
                      x={cx}
                      y={cy + (getConnectorSpec(lp.connectorType).heightMm * PX_PER_MM) / 2 + 3}
                      textAnchor="middle"
                      fontSize={4}
                      fill="rgba(255,255,255,0.8)"
                    >
                      {(lp.sideTag ? `${lp.sideTag} ` : "") + (port.label.length > 8 ? port.label.slice(0, 7) + "…" : port.label)}
                    </text>
                  )}
                </g>
              );
              });
            })}

            {/* Marquee selection rectangle */}
            {marqueeRect && marqueeStyle && (
              <>
                {/* White surround — thick stroke behind colored border (visible on blue face-plates) */}
                <rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.w}
                  height={marqueeRect.h}
                  fill="none"
                  stroke={marqueeStyle.haloStroke}
                  strokeWidth={MARQUEE_FACE_PLATE_HALO_PX}
                  strokeDasharray={marqueeStyle.strokeDasharray}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />
                <rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.w}
                  height={marqueeRect.h}
                  fill={marqueeStyle.fill}
                  stroke={marqueeStyle.stroke}
                  strokeWidth={MARQUEE_SCREEN_STROKE_PX}
                  strokeDasharray={marqueeStyle.strokeDasharray}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    pointerEvents: "none",
                    filter:
                      "drop-shadow(0 0 1px rgba(255,255,255,1)) drop-shadow(0 0 2px rgba(255,255,255,0.9))",
                  }}
                />
              </>
            )}
          </svg>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>Snap (F9)</span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-neutral-400 text-[10px]">
                {snapEnabled
                  ? `Nudge: ${gridSize}% grid`
                  : "Nudge: 2 px (zoom for finer steps)"}
              </span>
            )}
            {snapEnabled && (
              <label className="flex items-center gap-1 text-neutral-500">
                <span>Grid</span>
                <select
                  className="border border-neutral-300 rounded px-1.5 py-0.5 text-xs"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  title="Distance between snap lines on the face-plate"
                >
                  <option value={4}>Small (~{snapGridSpacingPx(4, canonW)} px)</option>
                  <option value={8}>Medium (~{snapGridSpacingPx(8, canonW)} px)</option>
                  <option value={12}>Large (~{snapGridSpacingPx(12, canonW)} px)</option>
                </select>
              </label>
            )}
            <span className="text-neutral-500">{Math.round(zoom * 100)}%</span>
            {(Math.abs(pan.x) > 0.01 || Math.abs(pan.y) > 0.01 || zoom > 1.01) && (
              <button
                className="px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50"
                onClick={handleResetView}
              >
                Reset View
              </button>
            )}

            {/* Status bar */}
            <span className="text-neutral-400 ml-2">
              {selectedIds.size > 1
                ? `${selectedIds.size} items selected`
                : isDeviceLabelSelected
                  ? `Device label — (${deviceLabelPos.x.toFixed(0)}%, ${deviceLabelPos.y.toFixed(0)}%)`
                  : selectedPort && selectedPos
                    ? `${selectedPort.label} — (${selectedPos.x.toFixed(0)}%, ${selectedPos.y.toFixed(0)}%)`
                    : selectedLabel
                      ? `"${selectedLabel.text}" — (${selectedLabel.x.toFixed(0)}%, ${selectedLabel.y.toFixed(0)}%)`
                      : `${panelItems.length} port${panelItems.length === 1 ? "" : "s"} on ${activePanel} panel`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {applyPrompt && (
        <ApplyFacePlateLayoutDialog
          modelName={applyPrompt.modelName}
          otherCount={applyPrompt.otherCount}
          hasDefinitionKey={!!rackDeviceDefinitionKey(deviceData)}
          onApplyAll={() => commitSave(true)}
          onThisDeviceOnly={() => commitSave(false)}
          onCancel={() => {
            setApplyPrompt(null);
            pendingLayoutRef.current = null;
          }}
        />
      )}
    </div>
  );
}
