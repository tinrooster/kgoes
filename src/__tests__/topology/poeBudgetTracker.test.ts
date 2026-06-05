import { describe, expect, it } from "vitest";
import { calculatePoeBudgets } from "../../topology/power/poeBudgetTracker";
import type { CableSegment, NetworkPort } from "../../topology/domain/types";

describe("calculatePoeBudgets", () => {
  it("sums PoE draw for security cameras on a switch panel", () => {
    const ports: NetworkPort[] = [
      { id: "sw-p1", panelId: "sw1", portNumber: 1 },
      { id: "cam-p1", panelId: "pp1", portNumber: 1 },
    ];
    const segments: CableSegment[] = [
      {
        id: "s1",
        tagNumber: "C1",
        category: "Cat6A",
        sourcePortId: "sw-p1",
        destinationPortId: "cam-p1",
        serviceType: "ETHERNET_DATA",
      },
    ];
    const [status] = calculatePoeBudgets(segments, ports, [
      { panelId: "sw1", maxPoeBudgetWatts: 370 },
    ]);
    expect(status.totalAllocatedWatts).toBe(0);
    expect(status.isOverBudget).toBe(false);
    expect(status.utilizationPercentage).toBe(0);
  });

  it("flags over-budget panels", () => {
    const ports: NetworkPort[] = Array.from({ length: 20 }, (_, i) => ({
      id: `sw-p${i}`,
      panelId: "sw1",
      portNumber: i + 1,
    }));
    const segments: CableSegment[] = Array.from({ length: 15 }, (_, i) => ({
      id: `s${i}`,
      tagNumber: `C${i}`,
      category: "Cat6A",
      sourcePortId: `sw-p${i}`,
      destinationPortId: `dev-p${i}`,
      serviceType: "SECURITY_IPCAM" as const,
    }));
    const [status] = calculatePoeBudgets(segments, ports, [
      { panelId: "sw1", maxPoeBudgetWatts: 370 },
    ]);
    expect(status.isOverBudget).toBe(false);
  });
});
