import { describe, expect, it } from "vitest";
import {
  HUB_DRAWING_CELL_W,
  HUB_DRAWING_OPEN_CANVAS_ORIGIN,
  layoutHubJackFieldsForDrawing,
  layoutHubJackFieldsInRoom,
} from "../hubDrawingLayout";
import type { JackFieldPlacementPlan } from "../rackDistributionPresets";

describe("layoutHubJackFieldsInRoom", () => {
  it("places jack fields in a grid instead of stacking", () => {
    const racks = [
      { id: "r1", label: "Rack 1", rackType: "floor-19" as const, heightU: 42, depthMm: 600, widthClass: "19in" as const, position: { x: 0, y: 0 }, designation: "SR01" },
      { id: "r2", label: "Rack 2", rackType: "floor-19" as const, heightU: 42, depthMm: 600, widthClass: "19in" as const, position: { x: 0, y: 0 }, designation: "SR02" },
      { id: "r3", label: "Rack 3", rackType: "floor-19" as const, heightU: 42, depthMm: 600, widthClass: "19in" as const, position: { x: 0, y: 0 }, designation: "SR03" },
    ];
    const jackFields: JackFieldPlacementPlan[] = racks.map((r, i) => ({
      deviceNodeId: `n${i}`,
      deviceData: { label: r.designation!, ports: [] } as JackFieldPlacementPlan["deviceData"],
      placement: {
        rackId: r.id,
        deviceNodeId: `n${i}`,
        uPosition: 30,
        face: "front" as const,
        distributionPresetRole: "jack-field" as const,
      },
    }));

    const positions = layoutHubJackFieldsInRoom({
      jackFields,
      racks,
      masterRackId: "r1",
      plan: {
        version: 1,
        layout: { kind: "grid", columns: 3, rowCount: 1, designationPrefix: "SR", masterDesignation: "SR01", pathOrder: "row-major" },
        jackFields: { bottomU: 30, portsPerPanel: 12 },
        lengthModel: { kind: "hub-serpentine", baseFt: 10, incrementFt: 5, crossoverAfterRack: 6, crossoverExtraFt: 20, trayLocation: "ceiling" },
        cablePool: { start: 101, step: 1 },
      },
      roomOrigin: { x: 80, y: 80 },
    });

    const p0 = positions.get("n0")!;
    const p1 = positions.get("n1")!;
    const p2 = positions.get("n2")!;
    expect(p1.x - p0.x).toBe(HUB_DRAWING_CELL_W);
    expect(p2.x - p0.x).toBe(HUB_DRAWING_CELL_W * 2);
    expect(p0.y).toBe(p1.y);
    expect(p0.y).toBe(80);
  });

  it("places jack fields on open canvas when master rack has no linked room", () => {
    const racks = [
      { id: "r1", label: "Rack 1", rackType: "floor-19" as const, heightU: 42, depthMm: 600, widthClass: "19in" as const, position: { x: 0, y: 0 }, designation: "SR01" },
      { id: "r2", label: "Rack 2", rackType: "floor-19" as const, heightU: 42, depthMm: 600, widthClass: "19in" as const, position: { x: 0, y: 0 }, designation: "SR02" },
    ];
    const jackFields = racks.map((r, i) => ({
      deviceNodeId: `n${i}`,
      deviceData: { label: r.designation!, ports: [] } as JackFieldPlacementPlan["deviceData"],
      placement: {
        rackId: r.id,
        deviceNodeId: `n${i}`,
        uPosition: 30,
        face: "front" as const,
        distributionPresetRole: "jack-field" as const,
      },
    }));

    const result = layoutHubJackFieldsForDrawing({
      jackFields,
      racks,
      masterRackId: "r1",
      masterRack: racks[0],
      plan: {
        version: 1,
        layout: { kind: "grid", columns: 2, rowCount: 1, designationPrefix: "SR", masterDesignation: "SR01", pathOrder: "row-major" },
        jackFields: { bottomU: 30, portsPerPanel: 12 },
        lengthModel: { kind: "hub-serpentine", baseFt: 10, incrementFt: 5, crossoverAfterRack: 6, crossoverExtraFt: 20, trayLocation: "ceiling" },
        cablePool: { start: 101, step: 1 },
      },
    });

    expect(result.placedInLinkedRoom).toBe(false);
    expect(result.layoutByNode.get("n0")?.x).toBe(HUB_DRAWING_OPEN_CANVAS_ORIGIN.x);
    expect(result.layoutByNode.get("n1")?.x).toBe(HUB_DRAWING_OPEN_CANVAS_ORIGIN.x + HUB_DRAWING_CELL_W);
  });
});
