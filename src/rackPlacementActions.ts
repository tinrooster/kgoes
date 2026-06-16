import { confirmDialog } from "./appDialogStore";
import { resolveDeviceTypeCode } from "./housename";
import { useSchematicStore } from "./store";
import type { DeviceData, RackElevationPage } from "./types";

/** Remove a rack placement and optionally prompt to renumber peer housenames (default: keep names). */
export async function removeRackPlacementWithRenumberPrompt(
  pageId: string,
  placementId: string,
): Promise<void> {
  const state = useSchematicStore.getState();
  const page = state.pages.find((p) => p.id === pageId && p.type === "rack-elevation") as
    | RackElevationPage
    | undefined;
  const placement = page?.placements.find((pl) => pl.id === placementId);
  if (!placement) return;

  const deviceNode = state.nodes.find((n) => n.id === placement.deviceNodeId && n.type === "device");
  const typeCode = deviceNode ? resolveDeviceTypeCode(deviceNode.data as DeviceData) : undefined;
  const { rackId } = placement;

  state.removeRackPlacement(pageId, placementId);

  if (!typeCode || !rackId) return;

  const hasGaps = state.housenameGapAfterRemoval(pageId, rackId, typeCode);
  if (!hasGaps) return;

  const ok = await confirmDialog({
    title: "Renumber housenames?",
    message:
      "Removing this device leaves a gap in housename letters (for example ENC A and ENC C with no ENC B). "
      + "Cable labels and documentation may still refer to the old names. "
      + "Renumber the remaining devices in this rack to close the gap?",
    confirmLabel: "Renumber",
    cancelLabel: "Keep names",
  });
  if (ok) {
    state.renumberHousenameSlotsInRack(pageId, rackId, typeCode);
  }
}
