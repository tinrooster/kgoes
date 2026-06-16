import { describe, expect, it } from "vitest";
import { resolveDefaultPlacementU, planDeviceLinkedRackSync } from "../rackLink";
import type { DeviceData, RackData, RackElevationPage, RoomData, SchematicNode } from "../types";

function mockRack(overrides?: Partial<RackData>): RackData {
  return {
    id: "rack-1",
    label: "TD08",
    rackType: "floor-19",
    heightU: 42,
    depthMm: 600,
    widthClass: "19in",
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

describe("rackLink", () => {
  it("resolveDefaultPlacementU scales 36/42 for a 42U rack", () => {
    expect(resolveDefaultPlacementU(mockRack())).toBe(36);
  });

  it("resolveDefaultPlacementU scales for a 25U rack", () => {
    expect(resolveDefaultPlacementU(mockRack({ heightU: 25 }))).toBe(21);
  });

  it("resolveDefaultPlacementU honors explicit defaultPlacementU setting", () => {
    expect(resolveDefaultPlacementU(mockRack(), { defaultPlacementU: 30 })).toBe(30);
  });

  it("planDeviceLinkedRackSync places device in linked rack at default U", () => {
    const roomId = "room-1";
    const deviceId = "dev-1";
    const nodes: SchematicNode[] = [
      {
        id: roomId,
        type: "room",
        position: { x: 0, y: 0 },
        data: {
          label: "TE Room",
          isEquipmentRack: true,
          linkedRackPageId: "elev-1",
          linkedRackId: "rack-8",
        } as RoomData,
      },
      {
        id: deviceId,
        type: "device",
        position: { x: 10, y: 10 },
        parentId: roomId,
        data: {
          label: "Encoder",
          deviceType: "media-server",
          heightMm: 44,
          ports: [],
          designation: "TD05 ENC B",
        } as DeviceData,
      },
    ];
    const pages: RackElevationPage[] = [
      {
        id: "elev-1",
        label: "Racks",
        type: "rack-elevation",
        racks: [mockRack({ id: "rack-8", label: "TD08" })],
        placements: [
          {
            id: "p-old",
            rackId: "rack-5",
            deviceNodeId: deviceId,
            uPosition: 32,
            face: "front",
          },
        ],
        accessories: [],
        crossLinks: [],
      },
    ];

    const plan = planDeviceLinkedRackSync({
      deviceNodeId: deviceId,
      roomId,
      nodes,
      pages,
    });

    expect(plan).toMatchObject({
      pageId: "elev-1",
      rackId: "rack-8",
      deviceNodeId: deviceId,
      uPosition: 36,
      face: "front",
      clearHousenameSlot: true,
      removePlacementIds: ["p-old"],
    });
  });
});
