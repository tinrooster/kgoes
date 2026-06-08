import { describe, expect, it } from "vitest";
import {
  estimateFeedlineRunFt,
  feedlineForDevice,
  formatSuggestFeedlinesToast,
  polylineToRunFt,
  suggestTowerDraftFeedlinesForPage,
} from "../towerDraftFeedlines";
import type {
  ConnectionEdge,
  DeviceData,
  RackElevationPage,
  SchematicNode,
  TowerDraftPage,
} from "../types";

const towerPage = (placements: TowerDraftPage["placements"]): TowerDraftPage => ({
  id: "td-1",
  label: "Test tower",
  type: "tower-draft",
  towerHeightFtAgl: 150,
  guideBandsFt: [{ ftAgl: 150, label: "150′" }, { ftAgl: 0, label: "Base" }],
  placements,
  polylines: [],
});

const deviceNode = (id: string, data: Partial<DeviceData> & { label: string; deviceType: string }): SchematicNode => ({
  id,
  type: "device",
  position: { x: 0, y: 0 },
  data: {
    ports: [],
    ...data,
  } as DeviceData,
});

describe("towerDraftFeedlines", () => {
  it("estimates run length with slack and entry", () => {
    expect(estimateFeedlineRunFt(100)).toBe(125);
  });

  it("generates structure feedlines for each placement", () => {
    const page = towerPage([
      { id: "pl-1", deviceNodeId: "cam-1", mountHeightFtAgl: 120 },
      { id: "pl-2", deviceNodeId: "ant-1", mountHeightFtAgl: 80, offsetX: 12 },
    ]);
    const nodes = [
      deviceNode("cam-1", { label: "PTZ", deviceType: "outdoor-ptz-camera" }),
      deviceNode("ant-1", { label: "UHF", deviceType: "rf-antenna" }),
    ];
    let n = 0;
    const result = suggestTowerDraftFeedlinesForPage({
      page,
      nodes,
      edges: [],
      pages: [page],
      nextPolylineId: () => `fl-${++n}`,
    });
    expect(result.added).toBe(2);
    expect(result.structureCount).toBe(2);
    expect(result.polylines.filter((p) => p.feedlineFromNodeId)).toHaveLength(2);
    const camLine = feedlineForDevice({ ...page, polylines: result.polylines }, "cam-1");
    expect(camLine?.feedType).toBe("network_poe");
    expect(camLine?.feedlineKind).toBe("structure");
    expect(camLine?.feedlineEstFt).toBeGreaterThan(100);
  });

  it("routes dish to ODU hop and ODU to rack destination", () => {
    const page = towerPage([
      { id: "pl-d", deviceNodeId: "dish-1", mountHeightFtAgl: 120 },
      { id: "pl-o", deviceNodeId: "odu-1", mountHeightFtAgl: 116 },
    ]);
    const rackPage: RackElevationPage = {
      id: "rack-1",
      label: "Rack 1",
      type: "rack-elevation",
      racks: [{ id: "r1", label: "Rack 1", rackType: "floor-19", heightU: 42, depthMm: 1000, widthClass: "19in", position: { x: 0, y: 0 } }],
      placements: [{ id: "rp-1", rackId: "r1", deviceNodeId: "idu-1", uPosition: 21, face: "front" }],
      accessories: [],
    };
    const nodes = [
      deviceNode("dish-1", { label: "MW Dish", deviceType: "microwave-dish" }),
      deviceNode("odu-1", { label: "MW ODU", deviceType: "microwave-odu" }),
      deviceNode("idu-1", { label: "MW IDU", deviceType: "microwave-radio-idu" }),
    ];
    const edges: ConnectionEdge[] = [
      { id: "e1", source: "dish-1", target: "odu-1", data: { signalType: "fiber" } },
      { id: "e2", source: "odu-1", target: "idu-1", data: { signalType: "eth" } },
    ];
    let n = 0;
    const result = suggestTowerDraftFeedlinesForPage({
      page,
      nodes,
      edges,
      pages: [page, rackPage],
      nextPolylineId: () => `fl-${++n}`,
    });
    expect(result.hopCount).toBe(1);
    expect(result.structureCount).toBe(1);
    const hop = feedlineForDevice({ ...page, polylines: result.polylines }, "dish-1");
    const down = feedlineForDevice({ ...page, polylines: result.polylines }, "odu-1");
    expect(hop?.feedlineKind).toBe("hop");
    expect(hop?.feedlineToNodeId).toBe("odu-1");
    expect(down?.feedlineKind).toBe("structure");
    expect(down?.feedlineToLabel).toContain("Rack 1");
    expect(down?.feedType).toBe("network");
  });

  it("formats toast with profile hint", () => {
    expect(
      formatSuggestFeedlinesToast({
        polylines: [],
        added: 3,
        structureCount: 2,
        hopCount: 1,
        primaryDestinationLabel: "MW IDU · Rack 1 · 21U",
      }),
    ).toContain("Profile");
  });

  it("computes polyline run ft from geometry", () => {
    const pts = [
      { x: 200, y: 100 },
      { x: 200, y: 400 },
    ];
    expect(polylineToRunFt(pts)).toBeGreaterThan(100);
  });
});
