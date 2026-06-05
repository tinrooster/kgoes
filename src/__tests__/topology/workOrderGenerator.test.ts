import { describe, expect, it } from "vitest";
import { generateFieldWorkOrder } from "../../topology/export/workOrderGenerator";
import type { PatchActionRecord } from "../../topology/domain/types";

describe("generateFieldWorkOrder", () => {
  it("includes add and remove phases with readable locations", () => {
    const history: PatchActionRecord[] = [
      {
        type: "REMOVE_CABLE",
        timestamp: 1,
        segment: {
          id: "old",
          tagNumber: "A-001",
          category: "Cat6",
          sourcePortId: "p1",
          destinationPortId: "p2",
          serviceType: "ETHERNET_DATA",
        },
      },
      {
        type: "ADD_CABLE",
        timestamp: 2,
        segment: {
          id: "new",
          tagNumber: "B-002",
          category: "Cat6A",
          sourcePortId: "p3",
          destinationPortId: "p4",
          serviceType: "FIBER",
        },
      },
    ];

    const text = generateFieldWorkOrder(
      history,
      {
        panels: [
          { id: "mdf", name: "MDF Rack A", type: "MDF_PATCH_PANEL", portsCount: 24 },
        ],
        ports: [
          { id: "p1", panelId: "mdf", portNumber: 1 },
          { id: "p2", panelId: "mdf", portNumber: 2 },
          { id: "p3", panelId: "mdf", portNumber: 3 },
          { id: "p4", panelId: "mdf", portNumber: 4 },
        ],
      },
      new Date("2026-06-04T12:00:00"),
    );

    expect(text).toContain("PHASE 1: UNPLUG");
    expect(text).toContain("A-001");
    expect(text).toContain("MDF Rack A");
    expect(text).toContain("PHASE 2: DEPLOY");
    expect(text).toContain("Fiber");
    expect(text).toContain("B-002");
  });
});
