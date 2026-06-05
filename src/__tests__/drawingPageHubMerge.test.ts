import { describe, expect, it } from "vitest";
import { createDrawingPage, mergeHubGraphIntoDrawingPages } from "../drawingPageUtils";
import type { DeviceNode } from "../types";

describe("mergeHubGraphIntoDrawingPages", () => {
  it("writes jack-field nodes and edges onto the drawing page graph", () => {
    const room = {
      id: "room-1",
      type: "room" as const,
      position: { x: 100, y: 100 },
      data: { label: "MDF" },
      style: { width: 800, height: 600 },
    };
    const ejf: DeviceNode = {
      id: "ejf-1",
      type: "device",
      parentId: "room-1",
      position: { x: 64, y: 64 },
      data: { label: "EJF 1", ports: [{ id: "p1", label: "Port 1", direction: "passthrough", signalType: "ethernet" }] },
    };
    const drawing = createDrawingPage("Drawing", "drawing-1", {
      nodes: [room],
      edges: [],
    });
    const pages = [drawing];
    const edges = [
      {
        id: "e1",
        source: "ejf-1",
        target: "ejf-2",
        sourceHandle: "p1-front",
        targetHandle: "p2-front",
        data: { signalType: "ethernet" },
      },
    ];
    const ejf2: DeviceNode = {
      id: "ejf-2",
      type: "device",
      parentId: "room-1",
      position: { x: 300, y: 64 },
      data: { label: "EJF 2", ports: [{ id: "p2", label: "Port 1", direction: "passthrough", signalType: "ethernet" }] },
    };

    const merged = mergeHubGraphIntoDrawingPages(
      pages,
      [room, ejf, ejf2],
      edges,
      ["ejf-1", "ejf-2"],
    );

    const sheet = merged[0];
    expect(sheet.type).toBe("drawing");
    if (sheet.type !== "drawing") return;
    expect(sheet.nodes?.filter((n) => n.type === "device")).toHaveLength(2);
    expect(sheet.edges).toHaveLength(1);
  });
});
