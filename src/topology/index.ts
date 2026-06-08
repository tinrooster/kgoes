// Domain
export type {
  CableCategory,
  CableSegment,
  CircuitPath,
  NetworkPanel,
  NetworkPort,
  PatchActionRecord,
  PanelType,
  Point,
  PortCoordinate,
  PortDetails,
  TopologyDatabase,
} from "./domain/types";

// Service colors
export {
  normalizeServiceType,
  SERVICE_REGISTRY,
  SERVICE_TYPES,
  resolveServiceStyle,
  signalTypeForService,
} from "./serviceSchema";
export type { ServiceStyle, ServiceType } from "./serviceSchema";

// Layout
export {
  columnsForGridPreset,
  generatePanelGrid,
} from "./layout/panelGrid";
export type { GridLayoutPreset, PanelLayoutConfig } from "./layout/panelGrid";

// Routing
export { pointsToSvgPath, routeBusTrunk } from "./routing/busTrunk";
export type { BusConnection } from "./routing/busTrunk";

// Validation
export { detectNetworkLoop } from "./validate/loopDetector";
export { validatePatchCandidate } from "./validate/patchValidator";
export type { PatchBlockReason, PatchValidationResult } from "./validate/patchValidator";
export { validateNetworkTopology } from "./validate/topologyValidator";
export type { ValidationError, ValidationErrorType } from "./validate/topologyValidator";

// PoE
export { calculatePoeBudgets, POE_DEVICE_DRAW_WATTS } from "./power/poeBudgetTracker";
export type { PanelPoeStatus, PoePanelSpecs } from "./power/poeBudgetTracker";

// Export
export {
  downloadFieldWorkOrder,
  generateFieldWorkOrder,
} from "./export/workOrderGenerator";

// Session
export {
  hasSessionChanges,
  recordPatchAdd,
  recordPatchRemove,
} from "./patchSession";

// Hub matrix adapters (elevation ↔ schematic ↔ topology)
export {
  buildHubMatrixView,
  collectHubJackFieldBindings,
  hubEdgesFromMatrixSegments,
  resolveHubMatrixPair,
  segmentsFromHubJackEdges,
  satelliteRackIdsForHub,
  stripHubJackEdgesForPair,
  topologyFromHubPage,
} from "./adapters/hubMatrix";
export { computeHubMatrixLayout } from "./layout/matrixLayout";
export type { HubMatrixLayout } from "./layout/matrixLayout";
export type {
  HubJackFieldBinding,
  HubMatrixPairContext,
  HubMatrixViewModel,
} from "./adapters/hubMatrix";

// Utils
export { pointerToSvgCoords, svgPointToScreen } from "./utils/svgCoordinates";

// Hooks
export { useCanvasHover } from "./hooks/useCanvasHover";
export type { HoverContext } from "./hooks/useCanvasHover";
export { usePatchCordBuilder } from "./hooks/usePatchCordBuilder";
export type { DragPatchGesture } from "./hooks/usePatchCordBuilder";
export { useTooltipState } from "./hooks/useTooltipState";
export type { TooltipState } from "./hooks/useTooltipState";

// View (React)
export { FloatingTooltipOverlay } from "./view/FloatingTooltipOverlay";
export { InteractivePatchStage } from "./view/InteractivePatchStage";
export type { InteractivePatchStageProps } from "./view/InteractivePatchStage";
export { LiveRubberBandWire } from "./view/LiveRubberBandWire";
export { PanelPoeMetricsGauge } from "./view/PanelPoeMetricsGauge";
export { PatchPortWithTooltip } from "./view/PatchPortWithTooltip";
export { PathRenderer } from "./view/PathRenderer";
