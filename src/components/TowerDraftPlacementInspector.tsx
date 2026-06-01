import type { TowerDraftPage } from "../types";
import type { MeasurementSystem } from "../measurementUnits";
import TowerDeviceMountEditor from "./TowerDeviceMountEditor";

interface TowerDraftPlacementInspectorProps {
  page: TowerDraftPage;
  placementId: string;
  measurementSystem: MeasurementSystem;
  embedded?: boolean;
  onClose: () => void;
  onEditDevice: () => void;
  onOpenTrackIt?: () => void;
  onRemove: () => void;
}

/** Tower equipment detail — mount, azimuth, and RF fields (see TowerDeviceMountEditor). */
export default function TowerDraftPlacementInspector({
  page,
  placementId,
  measurementSystem,
  embedded = false,
  onClose,
  onEditDevice,
  onOpenTrackIt,
  onRemove,
}: TowerDraftPlacementInspectorProps) {
  const body = (
    <TowerDeviceMountEditor
      page={page}
      placementId={placementId}
      measurementSystem={measurementSystem}
      showFullDeviceLink
      onOpenFullDeviceEditor={onEditDevice}
      onOpenTrackIt={onOpenTrackIt}
      onRemoveFromTower={onRemove}
    />
  );

  if (embedded) return body;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3"
      data-print-hide
    >
      <div
        className="pointer-events-auto w-full max-w-3xl rounded-lg border shadow-xl"
        style={{
          borderColor: "var(--ti-border)",
          background: "var(--ti-surface)",
        }}
        role="region"
        aria-label="Edit placement"
      >
        {body}
        <button type="button" onClick={onClose} aria-label="Close" style={{ display: "none" }} />
      </div>
    </div>
  );
}
