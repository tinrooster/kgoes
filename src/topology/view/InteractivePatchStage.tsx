import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CableSegment, Point, PortDetails, TopologyDatabase } from "../domain/types";
import type { HubMatrixLayout } from "../layout/matrixLayout";
import { usePatchCordBuilder } from "../hooks/usePatchCordBuilder";
import { useTooltipState } from "../hooks/useTooltipState";
import { mergePairPatch } from "../patchMerge";
import { routeBusTrunk } from "../routing/busTrunk";
import {
  resolveServiceStyle,
  SERVICE_REGISTRY,
  SERVICE_TYPES,
  type ServiceType,
} from "../serviceSchema";
import { validatePatchCandidate } from "../validate/patchValidator";
import { pointerToSvgCoords, svgPointToScreen } from "../utils/svgCoordinates";
import { FloatingTooltipOverlay } from "./FloatingTooltipOverlay";
import { LiveRubberBandWire } from "./LiveRubberBandWire";
import { PatchPortWithTooltip } from "./PatchPortWithTooltip";
import { PathRenderer } from "./PathRenderer";

export interface InteractivePatchStageProps {
  dbState: TopologyDatabase;
  sourcePorts: PortDetails[];
  destPorts: PortDetails[];
  sourcePortPositions: Map<string, Point>;
  destPortPositions: Map<string, Point>;
  matrixLayout?: HubMatrixLayout;
  trunkX?: number;
  trackSpacing?: number;
  controlledSegments?: CableSegment[];
  onSegmentsChange?: (segments: CableSegment[]) => void;
  onPatchBlocked?: (message: string) => void;
  masterPanelTitle?: string;
  destPanelTitle?: string;
  hubMatrixMode?: boolean;
}

function schematicIdForPort(
  ports: PortDetails[],
  matrixPortId: string,
): string {
  return ports.find((p) => p.id === matrixPortId)?.schematicPortId ?? matrixPortId;
}

export function InteractivePatchStage({
  dbState,
  sourcePorts,
  destPorts,
  sourcePortPositions,
  destPortPositions,
  matrixLayout,
  trunkX: trunkXProp,
  trackSpacing = 6,
  controlledSegments,
  onSegmentsChange,
  onPatchBlocked,
  masterPanelTitle = "Source",
  destPanelTitle = "Destination",
  hubMatrixMode = false,
}: InteractivePatchStageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isControlled = controlledSegments != null;
  const [localSegments, setLocalSegments] = useState<CableSegment[]>(dbState.segments);
  const segments = isControlled ? controlledSegments : localSegments;

  useEffect(() => {
    if (!isControlled) setLocalSegments(dbState.segments);
  }, [isControlled, dbState.segments]);

  const [currentService, setCurrentService] = useState<ServiceType>("ETHERNET_DATA");
  const { tooltip, showTooltip, hideTooltip } = useTooltipState();

  const trunkX = trunkXProp ?? matrixLayout?.trunkX ?? 200;
  const viewBox = matrixLayout?.viewBox ?? "0 0 400 200";

  const sourcePortIds = useMemo(() => new Set(sourcePorts.map((p) => p.id)), [sourcePorts]);
  const destPortIds = useMemo(() => new Set(destPorts.map((p) => p.id)), [destPorts]);

  const tryCompletePatch = useCallback(
    (srcMatrixId: string, destMatrixId: string) => {
      let sourceKey = srcMatrixId;
      let destKey = destMatrixId;

      if (destPortIds.has(srcMatrixId) && sourcePortIds.has(destMatrixId)) {
        sourceKey = destMatrixId;
        destKey = srcMatrixId;
      } else if (!sourcePortIds.has(srcMatrixId) || !destPortIds.has(destMatrixId)) {
        onPatchBlocked?.("Connect a source port (left) to a destination port (right).");
        return;
      }

      const sourcePortId = schematicIdForPort(sourcePorts, sourceKey);
      const destinationPortId = schematicIdForPort(destPorts, destKey);

      const validation = validatePatchCandidate(
        segments,
        sourcePortId,
        destinationPortId,
        { allowReplace: hubMatrixMode },
      );
      if (!validation.allowed) {
        onPatchBlocked?.(validation.message ?? "Patch blocked.");
        return;
      }

      const newSegment: CableSegment = {
        id: `seg-${Date.now()}`,
        tagNumber: `PATCH-${segments.length + 1}`,
        category: "Cat6A",
        sourcePortId,
        destinationPortId,
        serviceType: currentService,
      };

      const next = hubMatrixMode
        ? mergePairPatch(segments, sourcePortId, destinationPortId, newSegment)
        : [...segments, newSegment];

      if (!isControlled) setLocalSegments(next);
      onSegmentsChange?.(next);
    },
    [
      segments,
      sourcePorts,
      destPorts,
      sourcePortIds,
      destPortIds,
      hubMatrixMode,
      isControlled,
      currentService,
      onSegmentsChange,
      onPatchBlocked,
    ],
  );

  const {
    activeGesture,
    selectedSourcePortId,
    startPatchDrag,
    updatePatchDrag,
    setHoveredPort,
    completePatchDrag,
    selectSourcePort,
    cancelPatchDrag,
  } = usePatchCordBuilder(tryCompletePatch);

  const patchValidation = useMemo(() => {
    if (!activeGesture?.hoveredPortId) return null;
    const srcSchematic = schematicIdForPort(sourcePorts, activeGesture.sourcePortId);
    const destSchematic = schematicIdForPort(
      [...sourcePorts, ...destPorts],
      activeGesture.hoveredPortId,
    );
    return validatePatchCandidate(segments, srcSchematic, destSchematic, {
      allowReplace: hubMatrixMode,
    });
  }, [activeGesture, segments, sourcePorts, destPorts, hubMatrixMode]);

  const isTargetBlocked = patchValidation != null && !patchValidation.allowed;

  const handlePortClick = useCallback(
    (port: PortDetails) => {
      if (sourcePortIds.has(port.id)) {
        selectSourcePort(port.id);
        return;
      }
      if (destPortIds.has(port.id) && selectedSourcePortId) {
        tryCompletePatch(selectedSourcePortId, port.id);
        selectSourcePort(null);
      }
    },
    [sourcePortIds, destPortIds, selectedSourcePortId, selectSourcePort, tryCompletePatch],
  );

  const routedSegments = useMemo(() => {
    return segments.map((seg, index) => {
      const sourceKey = sourcePorts.find((p) => p.schematicPortId === seg.sourcePortId)?.id;
      const destKey = destPorts.find((p) => p.schematicPortId === seg.destinationPortId)?.id;
      const source = sourceKey ? sourcePortPositions.get(sourceKey) : undefined;
      const dest = destKey ? destPortPositions.get(destKey) : undefined;
      if (!source || !dest) return { seg, points: [] as Point[] };
      return {
        seg,
        points: routeBusTrunk(
          { id: seg.id, source, destination: dest },
          index,
          trunkX,
          trackSpacing,
        ),
      };
    });
  }, [segments, sourcePorts, destPorts, sourcePortPositions, destPortPositions, trunkX, trackSpacing]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeGesture || !svgRef.current) return;
    const { x, y } = pointerToSvgCoords(svgRef.current, e.clientX, e.clientY);
    updatePatchDrag(x, y);
  };

  const handlePointerUp = () => {
    if (!activeGesture) return;
    completePatchDrag(activeGesture.hoveredPortId);
  };

  const handleTooltip = (port: PortDetails | null, svgX: number, svgY: number) => {
    if (!port || !svgRef.current) {
      hideTooltip();
      return;
    }
    const screen = svgPointToScreen(svgRef.current, svgX, svgY);
    showTooltip(port, screen.x, screen.y);
  };

  const sourceTitleX = matrixLayout?.sourceTitleX ?? 80;
  const destTitleX = matrixLayout?.destTitleX ?? 320;

  return (
    <div className="relative flex flex-col h-full w-full min-h-[200px]">
      <div
        className="flex flex-wrap gap-2 p-2 border-b items-center"
        style={{
          background: "var(--ti-surface-2, #f1f5f9)",
          borderColor: "var(--ti-border, #e2e8f0)",
        }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--ti-ink-2, #475569)" }}>
          Media:
        </span>
        {SERVICE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setCurrentService(type)}
            className={`px-3 py-1 rounded text-xs font-semibold text-white transition-all ${
              currentService === type
                ? SERVICE_REGISTRY[type].badgeColor
                : "bg-slate-400 hover:bg-slate-500"
            }`}
          >
            {SERVICE_REGISTRY[type].label}
          </button>
        ))}
        {hubMatrixMode && (
          <span className="text-[10px] ml-1" style={{ color: "var(--ti-muted)" }}>
            Click source port, then destination — or drag across
          </span>
        )}
        {selectedSourcePortId && (
          <button
            type="button"
            className="text-[10px] ml-auto underline"
            style={{ color: "var(--ti-muted)" }}
            onClick={() => cancelPatchDrag()}
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="flex-1 relative min-h-[180px] overflow-x-auto" style={{ background: "#fff" }}>
        <svg
          ref={svgRef}
          className="w-full min-w-full touch-none"
          style={{ minHeight: matrixLayout?.height ?? 200 }}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            hideTooltip();
            if (activeGesture) completePatchDrag(activeGesture.hoveredPortId);
          }}
        >
          {matrixLayout && (
            <>
              <rect
                {...matrixLayout.sourcePanelRect}
                fill="#f8fafc"
                stroke="#e2e8f0"
                rx={4}
              />
              <rect
                {...matrixLayout.destPanelRect}
                fill="#f8fafc"
                stroke="#e2e8f0"
                rx={4}
              />
            </>
          )}

          <line
            x1={trunkX}
            y1={matrixLayout?.sourcePanelRect.y ?? 8}
            x2={trunkX}
            y2={(matrixLayout?.height ?? 200) - 8}
            stroke="#cbd5e1"
            strokeWidth={1}
            strokeDasharray="4 3"
          />

          <text
            x={sourceTitleX}
            y={(matrixLayout?.sourcePanelRect.y ?? 8) + 14}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill="#334155"
          >
            {masterPanelTitle}
          </text>
          <text
            x={destTitleX}
            y={(matrixLayout?.destPanelRect.y ?? 8) + 14}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill="#334155"
          >
            {destPanelTitle}
          </text>

          {routedSegments.map(({ seg, points }) => {
            const style = resolveServiceStyle(seg.serviceType);
            return (
              <PathRenderer
                key={seg.id}
                points={points}
                isActive={false}
                color={style.stroke}
                strokeWidth={2}
              />
            );
          })}

          {sourcePorts.map((port) => {
            const pos = sourcePortPositions.get(port.id);
            if (!pos) return null;
            return (
              <PatchPortWithTooltip
                key={port.id}
                port={port}
                x={pos.x}
                y={pos.y}
                isSelected={selectedSourcePortId === port.id}
                onStartDrag={startPatchDrag}
                onPortClick={handlePortClick}
                onShowTooltip={handleTooltip}
                onHoverPort={setHoveredPort}
              />
            );
          })}

          {destPorts.map((port) => {
            const pos = destPortPositions.get(port.id);
            if (!pos) return null;
            return (
              <PatchPortWithTooltip
                key={port.id}
                port={port}
                x={pos.x}
                y={pos.y}
                isSelected={selectedSourcePortId === port.id}
                onStartDrag={startPatchDrag}
                onPortClick={handlePortClick}
                onShowTooltip={handleTooltip}
                onHoverPort={setHoveredPort}
              />
            );
          })}

          {activeGesture && (
            <g>
              <LiveRubberBandWire gesture={activeGesture} blocked={isTargetBlocked} />
              {isTargetBlocked && patchValidation?.message && (
                <text
                  x={activeGesture.currentX + 8}
                  y={activeGesture.currentY - 8}
                  fill="#ef4444"
                  fontSize={10}
                  fontWeight="bold"
                >
                  {patchValidation.message}
                </text>
              )}
            </g>
          )}
        </svg>

        <FloatingTooltipOverlay
          activePort={tooltip.port}
          posX={tooltip.screenX}
          posY={tooltip.screenY}
        />
      </div>
    </div>
  );
}
