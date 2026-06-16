import { describe, expect, it } from "vitest";
import {
  affectedDeviceIdsForRoom,
  composeDeviceRoomPatch,
  findInnermostRoomId,
  resolveDeviceRoomContext,
} from "../roomContext";
import type { DeviceData, RoomData, SchematicNode } from "../types";

function mockRoom(id: string, label: string, parentId?: string): SchematicNode {
  return {
    id,
    type: "room",
    position: { x: 0, y: 0 },
    parentId,
    data: { label } as RoomData,
  };
}

function mockDevice(id: string, parentId?: string): SchematicNode {
  return {
    id,
    type: "device",
    position: { x: 0, y: 0 },
    parentId,
    data: { label: "Device", deviceType: "switcher", ports: [] } as DeviceData,
  };
}

describe("roomContext", () => {
  it("resolves innermost room and nested label path", () => {
    const nodes = [
      mockRoom("room-1", "MDF / Datacom"),
      mockRoom("room-2", "Patch Bay", "room-1"),
      mockDevice("d1", "room-2"),
    ];
    expect(findInnermostRoomId("d1", nodes)).toBe("room-2");
    expect(resolveDeviceRoomContext("d1", nodes).roomLabel).toBe("MDF / Datacom - Patch Bay");
  });

  it("syncs roomId and roomLocation on device", () => {
    const nodes = [mockRoom("room-1", "TK05"), mockDevice("d1", "room-1")];
    const device = nodes[1].data as DeviceData;
    const patch = composeDeviceRoomPatch("d1", nodes, device);
    expect(patch).toEqual({ roomId: "room-1", roomLocation: "TK05" });
  });

  it("lists devices affected by room label change", () => {
    const nodes = [
      mockRoom("room-1", "TK05"),
      mockDevice("d1", "room-1"),
      mockDevice("d2"),
    ];
    expect(affectedDeviceIdsForRoom("room-1", nodes)).toEqual(["d1"]);
  });
});
