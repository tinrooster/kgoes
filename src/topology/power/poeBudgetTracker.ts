import type { CableSegment, NetworkPort } from "../domain/types";
import type { ServiceType } from "../serviceSchema";

export interface PoePanelSpecs {
  panelId: string;
  maxPoeBudgetWatts: number;
}

/** Typical IEEE draw per service category (planning estimates). */
/** PoE planning draw (ethernet-powered devices only). */
export const POE_DEVICE_DRAW_WATTS: Record<ServiceType, number> = {
  ETHERNET_DATA: 0,
  FIBER: 0,
  VIDEO: 0,
  GPIO: 0,
};

export interface PanelPoeStatus {
  panelId: string;
  totalAllocatedWatts: number;
  maxBudgetWatts: number;
  isOverBudget: boolean;
  utilizationPercentage: number;
}

export function calculatePoeBudgets(
  segments: CableSegment[],
  ports: NetworkPort[],
  panelSpecs: PoePanelSpecs[],
): PanelPoeStatus[] {
  const portToPanel = new Map(ports.map((p) => [p.id, p.panelId]));
  const ledger = new Map(panelSpecs.map((s) => [s.panelId, 0]));

  for (const seg of segments) {
    const draw = POE_DEVICE_DRAW_WATTS[seg.serviceType ?? "ETHERNET_DATA"] ?? 0;
    if (draw === 0) continue;

    for (const portId of [seg.sourcePortId, seg.destinationPortId]) {
      const panelId = portToPanel.get(portId);
      if (panelId && ledger.has(panelId)) {
        ledger.set(panelId, (ledger.get(panelId) ?? 0) + draw);
      }
    }
  }

  return panelSpecs.map((spec) => {
    const totalAllocatedWatts = parseFloat((ledger.get(spec.panelId) ?? 0).toFixed(1));
    const isOverBudget = totalAllocatedWatts > spec.maxPoeBudgetWatts;
    const utilizationPercentage = Math.min(
      Math.round((totalAllocatedWatts / spec.maxPoeBudgetWatts) * 100),
      100,
    );
    return {
      panelId: spec.panelId,
      totalAllocatedWatts,
      maxBudgetWatts: spec.maxPoeBudgetWatts,
      isOverBudget,
      utilizationPercentage,
    };
  });
}
