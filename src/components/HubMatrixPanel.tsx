import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import { guessMasterRackId } from "../rackDistributionPresets";
import { resolveRackDesignation } from "../rackDesignation";
import type { RackElevationPage } from "../types";
import type { CableSegment } from "../topology/domain/types";
import { describeHubMdfContext } from "../topology/adapters/hubMdfContext";
import {
  buildHubMatrixView,
  collectHubJackFieldBindings,
  satelliteRackIdsForHub,
} from "../topology/adapters/hubMatrix";
import { removePairPatch } from "../topology/patchMerge";
import type { GridLayoutPreset } from "../topology/layout/panelGrid";
import { InteractivePatchStage } from "../topology/view/InteractivePatchStage";
import MatrixPatchList from "./MatrixPatchList";

interface HubMatrixPanelProps {
  page: RackElevationPage;
  masterRackId?: string;
}

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--ti-muted)",
  lineHeight: 1.45,
};

const labelStyle: React.CSSProperties = {
  color: "var(--ti-ink-2)",
  fontWeight: 500,
  fontSize: 11,
};

const fieldStyle: React.CSSProperties = {
  marginTop: 4,
  width: "100%",
  border: "1px solid var(--ti-border)",
  borderRadius: 6,
  padding: "6px 8px",
  background: "var(--ti-surface-2)",
  color: "var(--ti-ink)",
  fontSize: 12,
};

export default function HubMatrixPanel({ page, masterRackId: masterRackIdProp }: HubMatrixPanelProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const pages = useSchematicStore((s) => s.pages);
  const syncHubMatrixSegments = useSchematicStore((s) => s.syncHubMatrixSegments);
  const addToast = useSchematicStore((s) => s.addToast);

  const masterRackId = masterRackIdProp ?? guessMasterRackId(page.racks) ?? "";
  const prefix = page.distributionPlan?.layout?.designationPrefix ?? "RACK";
  const masterRack = page.racks.find((r) => r.id === masterRackId);
  const upstreamLabel = page.distributionPlan?.labels?.jackSourceLabel?.trim();

  const mdfContext = useMemo(
    () => describeHubMdfContext({ page, nodes, masterRackId, pages }),
    [page, nodes, masterRackId, pages],
  );

  const [showDetails, setShowDetails] = useState(false);

  const satelliteIds = useMemo(
    () => satelliteRackIdsForHub(page, masterRackId),
    [page, masterRackId],
  );

  const [destRackId, setDestRackId] = useState(() => satelliteIds[0] ?? "");
  const [gridPreset, setGridPreset] = useState<GridLayoutPreset>("2x6");

  useEffect(() => {
    if (satelliteIds.length > 0 && !satelliteIds.includes(destRackId)) {
      setDestRackId(satelliteIds[0]);
    }
  }, [satelliteIds, destRackId]);

  const matrixView = useMemo(() => {
    if (!masterRackId || !destRackId) return null;
    return buildHubMatrixView({
      page,
      nodes,
      edges,
      masterRackId,
      destRackId,
      gridPreset,
    });
  }, [page, nodes, edges, masterRackId, destRackId, gridPreset]);

  const jackCount = useMemo(
    () => collectHubJackFieldBindings(page, nodes, masterRackId, prefix).length,
    [page, nodes, masterRackId, prefix],
  );

  const handleSegmentsChange = useCallback(
    (segments: CableSegment[]) => {
      if (!masterRackId || !destRackId) return;
      syncHubMatrixSegments(page.id, masterRackId, destRackId, segments);
    },
    [syncHubMatrixSegments, page.id, masterRackId, destRackId],
  );

  const handleRemovePatch = useCallback(
    (segmentId: string) => {
      if (!matrixView) return;
      handleSegmentsChange(removePairPatch(matrixView.pairSegments, segmentId));
    },
    [matrixView, handleSegmentsChange],
  );

  if (jackCount < 2) {
    return (
      <p className="leading-relaxed py-2" style={hintStyle}>
        Apply the <strong>Tower datacom hub</strong> preset to place source and destination jack fields
        on racks. This view maps <strong>source rack → destination rack</strong> port pairs — no separate
        MDF room object is required.
      </p>
    );
  }

  if (!matrixView) {
    return (
      <p className="leading-relaxed py-2" style={hintStyle}>
        No jack-field pair for this destination. Re-apply the preset or pick another rack.
      </p>
    );
  }

  const { pair } = matrixView;
  const destRack = page.racks.find((r) => r.id === destRackId);
  const destCode = destRack ? resolveRackDesignation(destRack, prefix) : destRackId;
  const masterCode = masterRack ? resolveRackDesignation(masterRack, prefix) : "—";

  return (
    <div className="flex flex-col gap-2 min-h-[320px]">
      <p style={hintStyle}>
        <strong>Source rack</strong> {masterCode} ({mdfContext.masterRackLabel}) ↔{" "}
        <strong>destination</strong> {destCode}. One destination at a time.
        {upstreamLabel ? (
          <> Upstream feed label on source EJF: <strong>{upstreamLabel}</strong> (optional naming only).</>
        ) : null}
        <button
          type="button"
          className="ml-2 underline"
          style={{ color: "var(--ti-accent-ink)" }}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? "Hide details" : "Details"}
        </button>
      </p>

      {showDetails && (
        <ul className="list-disc pl-4 space-y-0.5" style={hintStyle}>
          <li>{mdfContext.jackFieldCount} jack-field devices on elevation</li>
          <li>
            {mdfContext.jackFieldsOnDrawing > 0
              ? `${mdfContext.jackFieldsOnDrawing} on Drawing page`
              : "Not on Drawing yet — use Place EJF on Drawing in rack sidebar"}
          </li>
          {mdfContext.ethTrunkCallouts.length > 0 && (
            <li>Trunk callouts: {mdfContext.ethTrunkCallouts.join("; ")}</li>
          )}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span style={labelStyle}>Destination rack (right)</span>
          <select
            style={fieldStyle}
            value={destRackId}
            onChange={(e) => setDestRackId(e.target.value)}
          >
            {satelliteIds.map((id) => {
              const rack = page.racks.find((r) => r.id === id);
              const code = rack ? resolveRackDesignation(rack, prefix) : id;
              return (
                <option key={id} value={id}>
                  {rack?.label ?? id} ({code})
                </option>
              );
            })}
          </select>
        </label>
        <label className="block">
          <span style={labelStyle}>Port grid</span>
          <select
            style={fieldStyle}
            value={gridPreset}
            onChange={(e) => setGridPreset(e.target.value as GridLayoutPreset)}
          >
            <option value="2x6">2 × 6</option>
            <option value="1x12">1 × 12</option>
            <option value="2x12">2 × 12</option>
            <option value="1x24">1 × 24</option>
          </select>
        </label>
      </div>

      <div
        className="rounded border overflow-hidden"
        style={{ borderColor: "var(--ti-border)" }}
      >
        <InteractivePatchStage
          dbState={matrixView.db}
          controlledSegments={matrixView.pairSegments}
          sourcePorts={matrixView.sourcePorts}
          destPorts={matrixView.destPorts}
          sourcePortPositions={matrixView.sourcePortPositions}
          destPortPositions={matrixView.destPortPositions}
          matrixLayout={matrixView.layout}
          trunkX={matrixView.layout.trunkX}
          hubMatrixMode
          masterPanelTitle={`Source · ${masterCode} P${pair.masterBinding.panelIndex}`}
          destPanelTitle={`Dest · ${destCode}`}
          onSegmentsChange={handleSegmentsChange}
          onPatchBlocked={(message) => addToast(message, "info")}
        />
      </div>

      <MatrixPatchList
        segments={matrixView.pairSegments}
        sourcePorts={matrixView.sourcePorts}
        destPorts={matrixView.destPorts}
        masterTitle={`${masterCode} P${pair.masterBinding.panelIndex}`}
        destTitle={destCode}
        onRemove={handleRemovePatch}
      />
    </div>
  );
}
