import { describe, expect, it } from "vitest";
import { buildHubPortPairEdges } from "../../hubDrawingLayout";
import {
  buildHubMatrixView,
  hubEdgesFromMatrixSegments,
  topologyFromHubPage,
} from "../../topology/adapters/hubMatrix";
import { buildDistributionPlanFromHubDialog } from "../../distributionPlan";
import { applyTowerDatacomHubPreset, guessMasterRackId } from "../../rackDistributionPresets";
import type { DeviceNode, RackElevationPage } from "../../types";

function mockPage(rackCount: number): RackElevationPage {
  const racks = Array.from({ length: rackCount }, (_, i) => ({
    id: `r${i}`,
    label: `Rack ${i + 1}`,
    rackType: "floor-19" as const,
    heightU: 42,
    depthMm: 600,
    widthClass: "19in" as const,
    position: { x: i * 320, y: 40 },
    designation: `RACK${String(i + 1).padStart(2, "0")}`,
  }));
  return {
    id: "page-1",
    label: "Hub",
    type: "rack-elevation",
    racks,
    placements: [],
    accessories: [],
    crossLinks: [],
  };
}

function hubFixture() {
  const page = mockPage(4);
  const distributionPlan = buildDistributionPlanFromHubDialog({
    designationPrefix: "RACK",
    masterDesignation: "RACK01",
    gridColumns: 4,
    rowCount: 1,
    jackFieldBottomU: 30,
    jackFieldPorts: 12,
    fanoutMode: "port-pair",
  });
  const masterId = guessMasterRackId(page.racks)!;
  const hub = applyTowerDatacomHubPreset(
    page,
    {
      masterRackId: masterId,
      ethTrunkRackIds: page.racks.filter((r) => r.id !== masterId).map((r) => r.id),
      jackFieldPorts: 12,
      distributionPlan,
    },
    {
      accessory: () => "a1",
      crossLink: () => "l1",
      deviceNode: () => `n-${Math.random()}`,
      placement: () => `p-${Math.random()}`,
    },
  );

  const nodes: DeviceNode[] = hub.jackFields.map((jf) => ({
    id: jf.deviceNodeId,
    type: "device" as const,
    position: { x: 0, y: 0 },
    data: jf.deviceData,
  }));

  let edgeN = 0;
  const wire = buildHubPortPairEdges({
    nodes,
    jackFields: hub.jackFields,
    racks: hub.page.racks,
    masterRackId: masterId,
    plan: distributionPlan,
    existingEdges: [],
    nextEdgeId: () => `e-${++edgeN}`,
  });

  return {
    page: { ...hub.page, distributionPlan },
    nodes,
    edges: wire.edges,
    masterId,
    destRackId: hub.page.racks.find((r) => r.id !== masterId)!.id,
    distributionPlan,
  };
}

describe("hubMatrix adapter", () => {
  it("reads trunk edges as expanded port-pair segments", () => {
    const { page, nodes, edges, masterId, destRackId } = hubFixture();
    const view = buildHubMatrixView({
      page,
      nodes,
      edges,
      masterRackId: masterId,
      destRackId,
    });
    expect(view).not.toBeNull();
    expect(view!.pairSegments.length).toBeGreaterThan(0);
    expect(view!.sourcePorts.length).toBe(12);
    expect(view!.destPorts.length).toBe(12);
  });

  it("round-trips segments to schematic hub edges", () => {
    const { page, nodes, edges, masterId, destRackId, distributionPlan } = hubFixture();
    const view = buildHubMatrixView({
      page,
      nodes,
      edges,
      masterRackId: masterId,
      destRackId,
    })!;
    let id = 0;
    const next = hubEdgesFromMatrixSegments({
      segments: view.pairSegments.slice(0, 2),
      pair: view.pair,
      existingEdges: edges,
      nextEdgeId: () => `new-${++id}`,
    });
    expect(next.length).toBeGreaterThan(edges.length - 1);
    const between = next.filter(
      (e) =>
        e.source === view.pair.masterBinding.deviceNodeId
        && e.target === view.pair.destBinding.deviceNodeId,
    );
    expect(between.length).toBeGreaterThan(0);
    expect(distributionPlan.fanout?.mode).toBe("port-pair");
  });

  it("builds topology database from elevation page", () => {
    const { page, nodes, edges, masterId } = hubFixture();
    const db = topologyFromHubPage(page, nodes, edges, masterId);
    expect(db.panels.length).toBeGreaterThan(2);
    expect(db.ports.length).toBeGreaterThan(24);
    expect(db.segments.length).toBeGreaterThan(0);
  });
});
