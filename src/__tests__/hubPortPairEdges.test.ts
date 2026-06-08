import { describe, expect, it } from "vitest";
import { buildHubPortPairEdges } from "../hubDrawingLayout";
import { buildDistributionPlanFromHubDialog } from "../distributionPlan";
import { applyTowerDatacomHubPreset, guessMasterRackId, defaultEthTrunkRackIds } from "../rackDistributionPresets";
import type { DeviceNode, RackElevationPage } from "../types";

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
    ...(i === 0 ? { linkedRoomId: "room-1" } : {}),
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

function wireHub(opts: {
  page: RackElevationPage;
  distributionPlan: ReturnType<typeof buildDistributionPlanFromHubDialog>;
}) {
  const masterId = guessMasterRackId(opts.page.racks)!;
  const ethIds = defaultEthTrunkRackIds(opts.page.racks, masterId);
  let edgeN = 0;
  const hub = applyTowerDatacomHubPreset(
    opts.page,
    {
      masterRackId: masterId,
      ethTrunkRackIds: ethIds,
      jackFieldPorts: 12,
      distributionPlan: opts.distributionPlan,
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

  const wire = buildHubPortPairEdges({
    nodes,
    jackFields: hub.jackFields,
    racks: hub.page.racks,
    masterRackId: masterId,
    plan: opts.distributionPlan,
    existingEdges: [],
    nextEdgeId: () => `e-${++edgeN}`,
  });

  return { hub, wire, masterId };
}

describe("buildHubPortPairEdges", () => {
  it("draws one trunk line per satellite by default (many ports collected)", () => {
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

    const { wire } = wireHub({ page, distributionPlan });

    expect(wire.drewTrunkLines).toBe(true);
    expect(wire.added).toBe(3);
    expect(wire.edges).toHaveLength(3);
    expect(wire.edges[0]?.data?.multicableLabel).toBe("12×");
    expect(wire.edges[0]?.data?.targetLabel).toBe("P01–P12");
    expect(wire.edges[0]?.data?.hubPortPairTrunk?.portsPerDest).toBe(12);
    expect(wire.edges[0]?.style?.strokeWidth).toBe(3);
  });

  it("draws one edge per port when schematicStyle is port-pair", () => {
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
    distributionPlan.fanout!.schematicStyle = "port-pair";

    const { wire } = wireHub({ page, distributionPlan });

    expect(wire.drewTrunkLines).toBe(false);
    expect(wire.added).toBe(36);
    expect(wire.edges).toHaveLength(36);
    expect(wire.edges[0]?.sourceHandle).toMatch(/-front$/);
    expect(wire.edges[0]?.targetHandle).toMatch(/-front$/);
  });

  it("uses a unique master EJF panel per destination rack when stacked", () => {
    const page = mockPage(7);
    const distributionPlan = buildDistributionPlanFromHubDialog({
      designationPrefix: "RACK",
      masterDesignation: "RACK01",
      gridColumns: 6,
      rowCount: 2,
      jackFieldBottomU: 30,
      jackFieldPorts: 12,
      fanoutMode: "port-pair",
    });

    const { hub, wire } = wireHub({ page, distributionPlan });

    const panelByNode = new Map(
      hub.jackFields.map((jf) => [jf.deviceNodeId, jf.placement.distributionPresetPanelIndex ?? 1]),
    );

    // RACK02–RACK06 → panels 1–5 (panel 6 spare); RACK07 skipped
    expect(wire.added).toBe(5);
    expect(wire.drewTrunkLines).toBe(true);

    const sourcesUsed = new Set(
      wire.edges.map((e) => panelByNode.get(e.source)),
    );
    expect(sourcesUsed).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});
