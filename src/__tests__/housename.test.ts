import { describe, expect, it } from "vitest";
import {
  assignHousenameSlot,
  composeHousename,
  composeHousenameForDevice,
  computePositionIndex,
  findDeviceRackContext,
  formatFrameSlotForHousename,
  housenameNeedsTypeSetup,
  isPlantStyleRackLabel,
  positionLetter,
  resolveDeviceTypeCode,
  resolveHousenameRackCode,
  resolveLiveDeviceHousename,
} from "../housename";
import type { DeviceData, RackElevationPage, SchematicNode } from "../types";

function mockDevice(id: string, data: Partial<DeviceData> & Pick<DeviceData, "label" | "deviceType">): SchematicNode {
  return {
    id,
    type: "device",
    position: { x: 0, y: 0 },
    data: {
      ports: [],
      ...data,
    } as DeviceData,
  };
}

function mockRackPage(overrides?: Partial<RackElevationPage["racks"][0]>): RackElevationPage {
  return {
    id: "elev-1",
    label: "Racks",
    type: "rack-elevation",
    racks: [
      {
        id: "rack-1",
        label: "TD05",
        designation: "RACK05",
        rackType: "floor-19",
        heightU: 42,
        depthMm: 600,
        widthClass: "19in",
        position: { x: 0, y: 0 },
        ...overrides,
      },
    ],
    placements: [
      { id: "p1", rackId: "rack-1", deviceNodeId: "d1", uPosition: 10, face: "front" },
      { id: "p2", rackId: "rack-1", deviceNodeId: "d2", uPosition: 20, face: "front" },
      { id: "p3", rackId: "rack-1", deviceNodeId: "d3", uPosition: 30, face: "front" },
    ],
    accessories: [],
    crossLinks: [],
  };
}

describe("housename", () => {
  it("maps device types to CAD housename codes", () => {
    expect(resolveDeviceTypeCode({ label: "DA", deviceType: "distribution-amplifier", ports: [] })).toBe("DA");
    expect(resolveDeviceTypeCode({ label: "R", deviceType: "router", ports: [] })).toBe("RSW");
    expect(resolveDeviceTypeCode({ label: "S", deviceType: "switcher", ports: [] })).toBe("SWR");
    expect(resolveDeviceTypeCode({ label: "S", deviceType: "network-switch", ports: [] })).toBe("ESW");
    expect(resolveDeviceTypeCode({ label: "E", deviceType: "ndi-encoder", ports: [] })).toBe("ENC");
    expect(resolveDeviceTypeCode({ label: "M", deviceType: "media-server", ports: [] })).toBe("ENC");
  });

  it("flags unmapped device types", () => {
    expect(housenameNeedsTypeSetup({ label: "X", deviceType: "custom-widget", ports: [] })).toBe(true);
    expect(housenameNeedsTypeSetup({ label: "X", deviceType: "switcher", ports: [] })).toBe(false);
  });

  it("formats frame/slot for housename", () => {
    expect(formatFrameSlotForHousename("FRAME 1 SLOT 9/10")).toBe("FR1 SL9/10");
    expect(formatFrameSlotForHousename("FR1 SL9/10")).toBe("FR1 SL9/10");
  });

  it("composes short housename with frame/slot", () => {
    expect(
      composeHousename({
        rackCode: "TD15",
        frameSlot: "FRAME 1 SLOT 9/10",
        typeCode: "DA",
        positionIndex: 2,
        expandTypeLabel: false,
      }),
    ).toBe("TD15 FR1 SL9/10 DA C");
    expect(
      composeHousename({ rackCode: "TD05", typeCode: "SWR", positionIndex: 0, expandTypeLabel: false }),
    ).toBe("TD05 SWR A");
  });

  it("live housename shows TD05 SWR A/B/C for switchers in rack", () => {
    const page = mockRackPage();
    const nodes = [
      mockDevice("d1", { label: "SW1", deviceType: "switcher" }),
      mockDevice("d2", { label: "SW2", deviceType: "switcher" }),
      mockDevice("d3", { label: "SW3", deviceType: "switcher" }),
    ];
    expect(resolveLiveDeviceHousename("d1", nodes[0].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TD05 SWR A",
    );
    expect(resolveLiveDeviceHousename("d2", nodes[1].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TD05 SWR B",
    );
    expect(resolveLiveDeviceHousename("d3", nodes[2].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TD05 SWR C",
    );
  });

  it("does not persist rack-only designation when type is missing", () => {
    const page = mockRackPage();
    const nodes = [
      mockDevice("d1", {
        label: "Unknown",
        deviceType: "custom-widget",
        designation: "TD05",
        rackLocation: "TD05",
      }),
    ];
    const patch = composeHousenameForDevice("d1", { nodes, pages: [page] });
    expect(patch?.designation).toBeUndefined();
    expect(patch?.rackLocation).toBe("TD05");
  });

  it("prefers plant-style rack label over stale designation", () => {
    const rack = {
      id: "r1",
      label: "TD05",
      designation: "RACK05",
      rackType: "floor-19" as const,
      heightU: 42,
      depthMm: 600,
      widthClass: "19in" as const,
      position: { x: 0, y: 0 },
    };
    expect(resolveHousenameRackCode(rack)).toBe("TD05");
    expect(isPlantStyleRackLabel("TD05")).toBe(true);
  });

  it("builds position letters bottom-up", () => {
    const page = mockRackPage();
    const map = new Map<string, DeviceData>([
      ["d1", { label: "SW1", deviceType: "switcher", ports: [] }],
      ["d2", { label: "SW2", deviceType: "switcher", ports: [] }],
    ]);
    expect(computePositionIndex("rack-1", "SWR", "d2", page, map)).toBe(1);
    expect(positionLetter(1)).toBe("B");
  });

  it("composes MDF housename with row-port label (TK05 MDA 1-5)", () => {
    const page = mockRackPage({ label: "TK05" });
    const nodes = [
      mockDevice("d1", {
        label: "MDF",
        deviceType: "mdf",
        ports: [{ id: "p1", label: "1-5", signalType: "sdi", direction: "passthrough" }],
      }),
    ];
    expect(resolveLiveDeviceHousename("d1", nodes[0].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TK05 MDA 1-5",
    );
  });

  it("assigns MDA/MDB top-down by rack U for MDF panels", () => {
    const page = mockRackPage({ label: "TD08" });
    page.placements = [
      { id: "p1", rackId: "rack-1", deviceNodeId: "d-top", uPosition: 30, face: "front" },
      { id: "p2", rackId: "rack-1", deviceNodeId: "d-low", uPosition: 10, face: "front" },
    ];
    const nodes = [
      mockDevice("d-top", {
        label: "MDF top",
        deviceType: "mdf",
        ports: [{ id: "p1", label: "1-1", signalType: "sdi", direction: "passthrough" }],
      }),
      mockDevice("d-low", {
        label: "MDF low",
        deviceType: "mdf",
        ports: [{ id: "p1", label: "2-14", signalType: "sdi", direction: "passthrough" }],
      }),
    ];
    expect(resolveLiveDeviceHousename("d-top", nodes[0].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TD08 MDA 1-1",
    );
    expect(resolveLiveDeviceHousename("d-low", nodes[1].data as DeviceData, { nodes, pages: [page] }).text).toBe(
      "TD08 MDB 2-14",
    );
  });

  it("assigns ENC X when placed above existing ENC cluster", () => {
    const page = mockRackPage();
    page.placements = [
      { id: "p1", rackId: "rack-1", deviceNodeId: "d1", uPosition: 32, face: "front" },
      { id: "p2", rackId: "rack-1", deviceNodeId: "d2", uPosition: 34, face: "front" },
      { id: "p3", rackId: "rack-1", deviceNodeId: "d3", uPosition: 36, face: "front" },
    ];
    const nodes = [
      mockDevice("d1", { label: "E1", deviceType: "ndi-encoder", housenameSlot: "A" }),
      mockDevice("d2", { label: "E2", deviceType: "ndi-encoder", housenameSlot: "C" }),
      mockDevice("d3", { label: "E3", deviceType: "ndi-encoder" }),
    ];
    const map = new Map(nodes.map((n) => [n.id, n.data as DeviceData]));
    const ctx = findDeviceRackContext("d3", [page])!;
    const slot = assignHousenameSlot("d3", nodes[2].data as DeviceData, ctx, map);
    expect(slot).toBe("X");
    expect(
      resolveLiveDeviceHousename("d3", { ...(nodes[2].data as DeviceData), housenameSlot: slot }, { nodes, pages: [page] }).text,
    ).toBe("TD05 ENC X");
  });

  it("keeps stable housenameSlot on compose (ENC B stays B)", () => {
    const page = mockRackPage();
    page.placements = [
      { id: "p2", rackId: "rack-1", deviceNodeId: "d2", uPosition: 34, face: "front" },
    ];
    const nodes = [
      mockDevice("d2", { label: "E2", deviceType: "ndi-encoder", housenameSlot: "B" }),
    ];
    const patch = composeHousenameForDevice("d2", { nodes, pages: [page] });
    expect(patch?.designation).toBe("TD05 ENC B");
  });

  it("composes housename with explicit positionSlot", () => {
    expect(
      composeHousename({ rackCode: "TD08", typeCode: "ENC", positionSlot: "A", expandTypeLabel: false }),
    ).toBe("TD08 ENC A");
  });
});
