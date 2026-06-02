import { describe, expect, it } from "vitest";
import {
  applyTowerDatacomHubPreset,
  applyRackFillOrderPreset,
  defaultEthTrunkRackIds,
  filterVisibleCrossLinks,
  guessMasterRackId,
  jackFieldSpec,
} from "../rackDistributionPresets";
import type { RackElevationPage } from "../types";

function mockPage(rackCount: number): RackElevationPage {
  const racks = Array.from({ length: rackCount }, (_, i) => ({
    id: `r${i}`,
    label: `Rack ${i + 1}`,
    rackType: "floor-19" as const,
    heightU: 42,
    depthMm: 600,
    widthClass: "19in" as const,
    position: { x: i * 320, y: 40 },
  }));
  return {
    id: "page-1",
    label: "Sutro",
    type: "rack-elevation",
    racks,
    placements: [],
    accessories: [],
    crossLinks: [],
  };
}

describe("applyTowerDatacomHubPreset", () => {
  it("adds jack fields and eth trunks only to selected satellites", () => {
    const page = mockPage(4);
    const masterId = guessMasterRackId(page.racks)!;
    const ethIds = defaultEthTrunkRackIds(page.racks, masterId).slice(0, 2);
    const ids = {
      accessory: () => `a-${Math.random()}`,
      crossLink: () => `l-${Math.random()}`,
      deviceNode: () => `n-${Math.random()}`,
      placement: () => `p-${Math.random()}`,
    };
    const { page: out, result } = applyTowerDatacomHubPreset(
      page,
      { masterRackId: masterId, ethTrunkRackIds: ethIds, jackFieldPorts: 24 },
      ids,
    );
    expect(result.jacksAdded).toBe(4);
    expect(result.ethLinksAdded).toBe(2);
    expect(out.crossLinks).toHaveLength(2);
    expect(out.placements.filter((p) => p.distributionPresetRole === "jack-field")).toHaveLength(4);
    expect(out.showTrunkCallouts).toBe(true);
  });

  it("uses 48-port jack field height", () => {
    const page = mockPage(2);
    const masterId = guessMasterRackId(page.racks)!;
    const hub = applyTowerDatacomHubPreset(
      page,
      {
        masterRackId: masterId,
        ethTrunkRackIds: [],
        jackFieldPorts: 48,
        jackFieldBottomU: 39,
      },
      { accessory: () => "a1", crossLink: () => "l1", deviceNode: () => "n1", placement: () => "p1" },
    );
    const jack = hub.page.placements.find((p) => p.distributionPresetRole === "jack-field");
    expect(hub.jackFields[0]?.deviceData.rackHeightU).toBe(jackFieldSpec(48).heightU);
    expect(hub.jackFields[0]?.deviceData.label).toContain("48");
    expect(jack?.uPosition).toBe(39);
  });

  it("replaceExisting removes prior preset items", () => {
    const page = mockPage(3);
    const masterId = guessMasterRackId(page.racks)!;
    const ids = {
      n: 0,
      accessory: () => `a${++ids.n}`,
      crossLink: () => `l${++ids.n}`,
      deviceNode: () => `n${++ids.n}`,
      placement: () => `p${++ids.n}`,
    };
    const first = applyTowerDatacomHubPreset(
      page,
      { masterRackId: masterId, ethTrunkRackIds: defaultEthTrunkRackIds(page.racks, masterId) },
      ids,
    );
    const second = applyTowerDatacomHubPreset(first.page, {
      masterRackId: masterId,
      ethTrunkRackIds: [],
      replaceExisting: true,
    }, ids);
    expect(second.page.placements.filter((p) => p.distributionPresetRole === "jack-field")).toHaveLength(3);
    expect(second.page.crossLinks).toHaveLength(0);
  });
});

describe("filterVisibleCrossLinks", () => {
  it("hides preset-tagged links when showTrunkCallouts is false", () => {
    const links = [
      { id: "1", fromRackId: "a", toRackId: "b", label: "manual" },
      { id: "2", fromRackId: "a", toRackId: "c", label: "trunk", distributionPresetId: "tower-datacom-hub" },
    ];
    expect(filterVisibleCrossLinks(links, true)).toHaveLength(2);
    expect(filterVisibleCrossLinks(links, false)).toHaveLength(1);
  });
});

describe("applyRackFillOrderPreset", () => {
  it("returns BOM summary and stores on page", () => {
    const page = mockPage(2);
    const { page: out, result } = applyRackFillOrderPreset(
      page,
      { skipFillFromU: 40, skipBottomU: 1, ventEveryNU: 0, preferLargeBlanks: true },
      { accessory: () => `f-${Math.random()}`, crossLink: () => "x", deviceNode: () => "n", placement: () => "p" },
    );
    expect(result.orderSummary?.lines.length).toBeGreaterThan(0);
    expect(result.orderSummary?.totalPanels).toBeGreaterThan(0);
    expect(out.fillOrderSummary).toEqual(result.orderSummary);
  });

  it("uses fewer panels with large blank packing than 1U-only", () => {
    const page = mockPage(1);
    const ids = {
      accessory: () => `f-${Math.random()}`,
      crossLink: () => "x",
      deviceNode: () => "n",
      placement: () => "p",
    };
    const large = applyRackFillOrderPreset(
      page,
      { skipFillFromU: 41, skipBottomU: 1, ventEveryNU: 0, preferLargeBlanks: true },
      ids,
    );
    const small = applyRackFillOrderPreset(
      page,
      { skipFillFromU: 41, skipBottomU: 1, ventEveryNU: 0, preferLargeBlanks: false },
      ids,
    );
    expect(large.result.orderSummary!.totalPanels).toBeLessThan(
      small.result.orderSummary!.totalPanels,
    );
    expect(large.result.orderSummary!.totalU).toBe(small.result.orderSummary!.totalU);
  });

  it("fills only selected racks when rackIds is provided", () => {
    const page = mockPage(2);
    const out = applyRackFillOrderPreset(
      page,
      {
        skipFillFromU: 20,
        skipBottomU: 1,
        ventEveryNU: 0,
        preferLargeBlanks: false,
        rackIds: [page.racks[0]!.id],
      },
      { accessory: () => `f-${Math.random()}`, crossLink: () => "x", deviceNode: () => "n", placement: () => "p" },
    );
    const rack0 = page.racks[0]!.id;
    const rack1 = page.racks[1]!.id;
    expect(out.page.accessories.some((a) => a.rackId === rack0)).toBe(true);
    expect(out.page.accessories.some((a) => a.rackId === rack1)).toBe(false);
  });

  it("treats multi-U devices as occupied across full height", () => {
    const page = mockPage(1);
    page.placements.push({
      id: "p-1",
      rackId: page.racks[0]!.id,
      deviceNodeId: "dev-1",
      uPosition: 10,
      face: "front",
    });
    const out = applyRackFillOrderPreset(
      page,
      {
        skipFillFromU: 20,
        skipBottomU: 1,
        ventEveryNU: 0,
        preferLargeBlanks: false,
        deviceHeightsByNodeId: { "dev-1": 4 },
      },
      { accessory: () => `f-${Math.random()}`, crossLink: () => "x", deviceNode: () => "n", placement: () => "p" },
    );
    const fills = out.page.accessories.filter((a) => a.rackId === page.racks[0]!.id);
    const touchesBlockedBand = fills.some((a) => {
      const top = a.uPosition + a.heightU - 1;
      return a.uPosition <= 13 && top >= 10;
    });
    expect(touchesBlockedBand).toBe(false);
  });
});
