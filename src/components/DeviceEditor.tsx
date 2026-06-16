import { useState, useEffect, useCallback, useRef, useMemo, useId, type DragEvent } from "react";
import { useSchematicStore } from "../store";
import { findLocationByCode } from "../trackitLocationMerge";
import {
  SIGNAL_LABELS,
  SIGNAL_COLORS,
  CONNECTOR_LABELS,
  CONNECTOR_GROUPS,
  type SignalType,
  type ConnectorType,
  type Gender,
  type Port,
  type PortDirection,
  type PortNetworkConfig,
  type PortCapabilities,
  type RfPortMetadata,
  type RfInstallationMetadata,
  type DbPinAssignment,
  type SerialPortConfig,
  type AuxRow,
  type DeviceData,
  type DeviceNode,
  type DhcpServerConfig,
  type SlotDefinition,
} from "../types";
import { CONNECTORS_WITH_GENDER_VARIATION, DEFAULT_CONNECTOR, NETWORK_SIGNAL_TYPES, VIDEO_SIGNAL_TYPES, resolvePortGender, shouldDefaultMultiConnect } from "../connectorTypes";
import { getBundledTemplates, getCardsByFamily } from "../templateApi";
import { getTemplateDrift } from "../templateSync";
import { confirmDialog } from "../appDialogStore";
import CardCreatorDialog from "./CardCreatorDialog";
import TemplateSyncDialog from "./TemplateSyncDialog";
import { isValidIpv4, isValidSubnetMask, isValidVlan, findDuplicateIps } from "../networkValidation";
import IpInput from "./IpInput";
import FacePlateEditor from "./FacePlateEditor";
import ApplyRackMetadataDialog, { type ApplyRackMetadataPrompt } from "./ApplyRackMetadataDialog";
import {
  composeHousename,
  computePositionIndex,
  findDeviceRackContext,
  HOUSENAME_CODE_TO_LABEL,
  HOUSENAME_TYPE_CODES,
  housenameNeedsTypeSetup,
  resolveDeviceTypeCode,
  resolveRackCodeForDevice,
  resolveMdfPanelTypeCode,
} from "../housename";
import { resolveDeviceRoomContext } from "../roomContext";
import { isMdfDevice, resolveMdfPairLabel } from "../mdfDisplay";
import {
  MdfDeviceEditorSection,
  applyMdfLayoutToPorts,
  isMdfMultiPairFromPorts,
  mdfEditorStateFromDevice,
  type MdfEditorState,
} from "./MdfDeviceEditorSection";
import {
  DB_PINOUT_CONNECTORS,
  DbPinoutEditor,
  RF_METADATA_SIGNAL_TYPES,
  RfInstallationEditor,
  RfPortMetadataEditor,
  SERIAL_SIGNAL_TYPES,
  SerialPortConfigEditor,
} from "./RfMetadataEditor";
import type { FacePlateLayout } from "../types";
import {
  AUX_FIELD_GROUPS,
  auxPositionLabel,
  auxPositionTitle,
  cycleAuxPosition,
  normalizeAuxRows,
  resolveAuxiliaryLine,
  rowPosition,
  trimTrailingEmpty,
} from "../auxiliaryData";
import { deriveThermalBtuh } from "../thermal";
import type { MountingClass } from "../rackMount";
import {
  getRackMountSummary,
  validateRackDimensions,
  GENERIC_THROWDOWN_DIMENSIONS,
  applyGenericThrowdownDimensionsIfMissing,
  formatGenericThrowdownDimensions,
  heightMmFromRackU,
  buildExplicitRackMetadata,
  rackDeviceDefinitionKey,
  rackMetadataChanged,
  resolveMountingClass,
} from "../rackMount";
import { findTowerPlacementForDevice } from "../towerDraftPlacementLookup";
import { resolvePlacementAzimuthDeg, resolvePlacementTowerFace } from "../towerDraftFaces";
import TowerDeviceMountEditor from "./TowerDeviceMountEditor";
import CollapsibleModuleSection, { summarizePortsHint } from "./CollapsibleModuleSection";
import FloatingPanel from "./FloatingPanel";
import type { SectionTint } from "../ui/collapsibleSectionSurface";

const ALL_SIGNAL_TYPES = (Object.keys(SIGNAL_LABELS) as SignalType[]).sort(
  (a, b) => SIGNAL_LABELS[a].localeCompare(SIGNAL_LABELS[b]),
);
const ALL_CONNECTOR_TYPES = (Object.keys(CONNECTOR_LABELS) as ConnectorType[]).sort(
  (a, b) => CONNECTOR_LABELS[a].localeCompare(CONNECTOR_LABELS[b]),
);

/** Grouped connector dropdown order — preserves CONNECTOR_GROUPS ordering, alphabetizes within each
 *  group, and sweeps any connector missing from CONNECTOR_GROUPS into "Other" so a new ConnectorType
 *  never silently disappears from the dropdown. */
const CONNECTOR_GROUP_ENTRIES: Array<[string, ConnectorType[]]> = (() => {
  const groups = Object.entries(CONNECTOR_GROUPS).map(
    ([name, list]) => [name, [...list].sort((a, b) => CONNECTOR_LABELS[a].localeCompare(CONNECTOR_LABELS[b]))] as [string, ConnectorType[]],
  );
  const grouped = new Set<ConnectorType>(groups.flatMap(([, list]) => list));
  const orphans = ALL_CONNECTOR_TYPES.filter((c) => !grouped.has(c));
  if (orphans.length > 0) {
    const otherIdx = groups.findIndex(([name]) => name === "Other");
    if (otherIdx >= 0) {
      groups[otherIdx] = [
        "Other",
        [...groups[otherIdx][1], ...orphans].sort((a, b) => CONNECTOR_LABELS[a].localeCompare(CONNECTOR_LABELS[b])),
      ];
    } else {
      groups.push(["Other", orphans.sort((a, b) => CONNECTOR_LABELS[a].localeCompare(CONNECTOR_LABELS[b]))]);
    }
  }
  return groups;
})();

interface PortDraft {
  id: string;
  label: string;
  signalType: SignalType;
  direction: PortDirection;
  section?: string;
  connectorType?: ConnectorType;
  gender?: Gender;
  networkConfig?: PortNetworkConfig;
  addressable?: boolean;
  capabilities?: PortCapabilities;
  isMulticable?: boolean;
  channelCount?: number;
  multiConnect?: boolean;
  directAttach?: boolean;
  notes?: string;
  poeDrawW?: number;
  linkSpeed?: string;
  flipped?: boolean;
  rf?: RfPortMetadata;
  dbPinout?: DbPinAssignment[];
  rearDbPinout?: DbPinAssignment[];
  frontDbPinout?: DbPinAssignment[];
  serial?: SerialPortConfig;
  // Passthrough-only fields
  rearConnectorType?: ConnectorType;
  rearGender?: Gender;
  frontConnectorType?: ConnectorType;
  frontGender?: Gender;
  inheritsSignal?: boolean;
}

function newPortDraft(direction: PortDirection): PortDraft {
  const signalType: SignalType = "sdi";
  const connectorType = DEFAULT_CONNECTOR[signalType];
  if (direction === "passthrough") {
    return {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: "",
      signalType: "custom",
      direction,
      inheritsSignal: true,
    };
  }
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    signalType,
    direction,
    connectorType,
    multiConnect: shouldDefaultMultiConnect(signalType, connectorType) || undefined,
  };
}

const MIME = "application/easyschematic-port";

export default function DeviceEditor() {
  const editingNodeId = useSchematicStore((s) => s.editingNodeId);
  const nodes = useSchematicStore((s) => s.nodes);
  const syncDeviceFromTemplate = useSchematicStore((s) => s.syncDeviceFromTemplate);
  const edges = useSchematicStore((s) => s.edges);
  const setEditingNodeId = useSchematicStore((s) => s.setEditingNodeId);
  const setCreatingNodeId = useSchematicStore((s) => s.setCreatingNodeId);
  const undo = useSchematicStore((s) => s.undo);
  const addCustomTemplate = useSchematicStore((s) => s.addCustomTemplate);
  const updateCustomTemplate = useSchematicStore((s) => s.updateCustomTemplate);
  const customTemplates = useSchematicStore((s) => s.customTemplates);
  const templateHiddenSignals = useSchematicStore((s) => s.templateHiddenSignals);
  const currency = useSchematicStore((s) => s.currency);
  const setTemplateHiddenSignals = useSchematicStore((s) => s.setTemplateHiddenSignals);
  const templatePresets = useSchematicStore((s) => s.templatePresets);
  const setTemplatePreset = useSchematicStore((s) => s.setTemplatePreset);
  const patchDeviceData = useSchematicStore((s) => s.patchDeviceData);
  const pages = useSchematicStore((s) => s.pages);
  const measurementSystem = useSchematicStore((s) => s.measurementSystem);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const trackItLocations = useSchematicStore((s) => s.trackItLocations);
  const locationListId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingNodeId) return;
    dialogRef.current?.focus({ preventScroll: true });
  }, [editingNodeId]);

  const node = nodes.find((n) => n.id === editingNodeId && n.type === "device") as DeviceNode | undefined;

  const towerPlacementCtx = useMemo(
    () => findTowerPlacementForDevice(pages, editingNodeId),
    [pages, editingNodeId],
  );

  const [label, setLabel] = useState("");
  const [shortName, setShortName] = useState("");
  /** Tri-state per-instance toggle: undefined = inherit schematic default. */
  const [useShortName, setUseShortName] = useState<boolean | undefined>(undefined);
  const [wrapLabel, setWrapLabelState] = useState<boolean | undefined>(undefined);
  const [hostname, setHostname] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [rackLocation, setRackLocation] = useState("");
  const locationOptions = useMemo(() => trackItLocations ?? [], [trackItLocations]);
  const rackLocationMatch = useMemo(
    () => (rackLocation.trim() ? findLocationByCode(locationOptions, rackLocation) : undefined),
    [locationOptions, rackLocation],
  );
  const [frameSlot, setFrameSlot] = useState("");
  const [mdfPairLabel, setMdfPairLabel] = useState("");
  const [deviceTypeCode, setDeviceTypeCode] = useState("");
  const [designationLocked, setDesignationLocked] = useState(false);
  const recomputeHousenames = useSchematicStore((s) => s.recomputeHousenames);
  const mdfSchematicDefault = useSchematicStore((s) => s.mdfDisplayMode);
  const [mdfEditor, setMdfEditor] = useState<MdfEditorState | null>(null);
  const roomContext = useMemo(() => {
    if (!editingNodeId) return { roomId: undefined, roomLabel: "" };
    return resolveDeviceRoomContext(editingNodeId, nodes);
  }, [editingNodeId, nodes]);
  const housenamePreview = useMemo(() => {
    if (!editingNodeId || designationLocked) return "";
    const ctx = findDeviceRackContext(editingNodeId, pages);
    const draftDevice: DeviceData = {
      label: label.trim() || "Device",
      deviceType: deviceType.trim() || node?.data.deviceType || "custom",
      ports: [],
      deviceTypeCode: deviceTypeCode.trim() || undefined,
      rackLocation: rackLocation.trim() || undefined,
      mdfPairLabel: mdfPairLabel.trim() || undefined,
    };
    const rackCode = resolveRackCodeForDevice(ctx, draftDevice);
    const typeCode = deviceTypeCode.trim() || resolveDeviceTypeCode(draftDevice);
    if (!rackCode && !typeCode) return "";
    if (isMdfDevice(draftDevice)) {
      const deviceDataMap = new Map<string, DeviceData>();
      for (const n of nodes) {
        if (n.type === "device") deviceDataMap.set(n.id, n.data as DeviceData);
      }
      const ctx = editingNodeId ? findDeviceRackContext(editingNodeId, pages) : undefined;
      const panelCode = editingNodeId
        ? resolveMdfPanelTypeCode(editingNodeId, draftDevice, ctx, deviceDataMap)
        : "MDA";
      const base = composeHousename({
        rackCode,
        frameSlot,
        typeCode: panelCode,
        expandTypeLabel: false,
      });
      const pair = mdfPairLabel.trim() || resolveMdfPairLabel(draftDevice);
      return pair ? `${base} ${pair}`.trim() : base;
    }
    const deviceDataMap = new Map<string, DeviceData>();
    for (const n of nodes) {
      if (n.type === "device") deviceDataMap.set(n.id, n.data as DeviceData);
    }
    const positionIndex =
      ctx && typeCode
        ? computePositionIndex(ctx.rack.id, typeCode, editingNodeId, ctx.page, deviceDataMap)
        : undefined;
    return composeHousename({
      rackCode,
      frameSlot,
      typeCode,
      positionIndex,
      expandTypeLabel: false,
    });
  }, [
    editingNodeId,
    designationLocked,
    pages,
    nodes,
    label,
    deviceType,
    node?.data.deviceType,
    deviceTypeCode,
    rackLocation,
    frameSlot,
    mdfPairLabel,
  ]);
  const typeSetupNeeded = useMemo(
    () => housenameNeedsTypeSetup({
      label: label.trim() || "Device",
      deviceType: deviceType.trim() || node?.data.deviceType || "custom",
      ports: [],
      deviceTypeCode: deviceTypeCode.trim() || undefined,
    }),
    [label, deviceType, node?.data.deviceType, deviceTypeCode],
  );
  const [managementIp, setManagementIp] = useState("");
  const [vlanSummary, setVlanSummary] = useState("");
  const [showInstallationBlock, setShowInstallationBlock] = useState<boolean | undefined>(undefined);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [headerColor, setHeaderColor] = useState<string | undefined>(undefined);
  const [ports, setPorts] = useState<PortDraft[]>([]);

  // Port visibility local state
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [hiddenPorts, setHiddenPorts] = useState<string[]>([]);

  // DHCP server config
  const [dhcpServer, setDhcpServer] = useState<DhcpServerConfig | undefined>(undefined);

  // Power fields
  const [powerDrawW, setPowerDrawW] = useState<number | undefined>(undefined);
  const [powerCapacityW, setPowerCapacityW] = useState<number | undefined>(undefined);
  const [voltage, setVoltage] = useState<string | undefined>(undefined);
  const [thermalBtuh, setThermalBtuh] = useState<number | undefined>(undefined);
  const [poeBudgetW, setPoeBudgetW] = useState<number | undefined>(undefined);
  const [poeDrawW, setPoeDrawW] = useState<number | undefined>(undefined);

  // Cost
  const [unitCost, setUnitCost] = useState<number | undefined>(undefined);

  // Physical dimensions
  const [heightMm, setHeightMm] = useState<number | undefined>(undefined);
  const [widthMm, setWidthMm] = useState<number | undefined>(undefined);
  const [depthMm, setDepthMm] = useState<number | undefined>(undefined);
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined);
  const [rackHeightU, setRackHeightU] = useState<number | undefined>(undefined);
  const [mountingClass, setMountingClass] = useState<MountingClass>("rack-full");
  const [syncMmFromU, setSyncMmFromU] = useState(true);
  const shelfDimsMissing =
    mountingClass === "shelf" && (heightMm == null || widthMm == null);
  const [applyRackPrompt, setApplyRackPrompt] = useState<ApplyRackMetadataPrompt | null>(null);
  const pendingSaveRef = useRef<DeviceData | null>(null);
  const pendingApplyMetaRef = useRef<{
    rackPatch: ReturnType<typeof buildExplicitRackMetadata>;
    otherNodeIds: string[];
    templateId?: string;
  } | null>(null);

  // Cable accessory flags
  const [isCableAccessory, setIsCableAccessory] = useState(false);
  const [integratedWithCable, setIntegratedWithCable] = useState(false);
  const [isVenueProvided, setIsVenueProvided] = useState(false);
  const [adapterVisibility, setAdapterVisibility] = useState<"default" | "force-show" | "force-hide">("default");

  // Search terms — raw string kept as-is so commas can be typed freely; parsed to array at save
  const [searchTermsRaw, setSearchTermsRaw] = useState("");
  const [rfInstallation, setRfInstallation] = useState<RfInstallationMetadata | undefined>(undefined);

  // Auxiliary data rows — each row carries its own header/footer slot.
  const [auxiliaryData, setAuxiliaryData] = useState<AuxRow[]>([]);
  const [auxFieldMenuIdx, setAuxFieldMenuIdx] = useState<number | null>(null);
  const auxInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const auxMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (auxFieldMenuIdx === null) return;
    const onDown = (e: MouseEvent) => {
      if (!auxMenuRef.current) return;
      if (!auxMenuRef.current.contains(e.target as Node)) setAuxFieldMenuIdx(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [auxFieldMenuIdx]);

  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // Face-plate editor
  const [showFacePlateEditor, setShowFacePlateEditor] = useState(false);

  // Drag state — which port is being dragged and where it would drop
  const [draggedPortId, setDraggedPortId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ direction: PortDirection; index: number } | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- syncing props to local editor state */
  useEffect(() => {
    if (!node) return;
    const tpl = node.data.templateId
      ? getBundledTemplates().find((t) => t.id === node.data.templateId)
      : undefined;
    setLabel(node.data.label);
    setShortName(node.data.shortName ?? "");
    setUseShortName(node.data.useShortName);
    setWrapLabelState(node.data.wrapLabel);
    setHostname(node.data.hostname ?? "");
    setDeviceType(node.data.deviceType);
    setManufacturer(node.data.manufacturer ?? "");
    setModelNumber(node.data.modelNumber ?? "");
    setDesignation(node.data.designation ?? "");
    setDesignationLocked(node.data.designationLocked ?? false);
    setRackLocation(node.data.rackLocation ?? "");
    setFrameSlot(node.data.frameSlot ?? "");
    setMdfPairLabel(node.data.mdfPairLabel ?? "");
    setMdfEditor(mdfEditorStateFromDevice(node.data));
    setDeviceTypeCode(node.data.deviceTypeCode ?? resolveDeviceTypeCode(node.data) ?? "");
    setManagementIp(node.data.managementIp ?? "");
    setVlanSummary(node.data.vlanSummary ?? "");
    setShowInstallationBlock(node.data.showInstallationBlock);
    setReferenceUrl(node.data.referenceUrl ?? tpl?.referenceUrl ?? "");
    setCategory(node.data.category ?? tpl?.category ?? "");
    setColor(node.data.color);
    setHeaderColor(node.data.headerColor);
    setPorts(
      node.data.ports.map((p) => ({
        id: p.id,
        label: p.label,
        signalType: p.signalType,
        direction: p.direction,
        section: p.section,
        connectorType: p.connectorType,
        gender: p.gender,
        networkConfig: p.networkConfig ? { ...p.networkConfig } : undefined,
        capabilities: p.capabilities ? { ...p.capabilities } : undefined,
        isMulticable: p.isMulticable,
        channelCount: p.channelCount,
        multiConnect: p.multiConnect,
        directAttach: p.directAttach,
        notes: p.notes,
        poeDrawW: p.poeDrawW,
        linkSpeed: p.linkSpeed,
        flipped: p.flipped,
        addressable: p.addressable,
        rearConnectorType: p.rearConnectorType,
        rearGender: p.rearGender,
        frontConnectorType: p.frontConnectorType,
        frontGender: p.frontGender,
        inheritsSignal: p.inheritsSignal,
        rf: p.rf ? { ...p.rf } : undefined,
        dbPinout: p.dbPinout ? p.dbPinout.map((row) => ({ ...row })) : undefined,
        rearDbPinout: p.rearDbPinout ? p.rearDbPinout.map((row) => ({ ...row })) : undefined,
        frontDbPinout: p.frontDbPinout ? p.frontDbPinout.map((row) => ({ ...row })) : undefined,
        serial: p.serial ? { ...p.serial } : undefined,
      })),
    );
    setShowAllPorts(node.data.showAllPorts ?? false);
    setHiddenPorts(node.data.hiddenPorts ?? []);
    setDhcpServer(node.data.dhcpServer ? { ...node.data.dhcpServer } : undefined);
    setPowerDrawW(node.data.powerDrawW);
    setPowerCapacityW(node.data.powerCapacityW);
    setVoltage(node.data.voltage);
    setThermalBtuh(node.data.thermalBtuh);
    setPoeBudgetW(node.data.poeBudgetW);
    setPoeDrawW(node.data.poeDrawW);
    setUnitCost(node.data.unitCost);
    setHeightMm(node.data.heightMm);
    setWidthMm(node.data.widthMm);
    setDepthMm(node.data.depthMm);
    setWeightKg(node.data.weightKg);
    setRackHeightU(node.data.rackHeightU ?? (node.data.heightMm != null ? Math.max(1, Math.round(node.data.heightMm / 44.45)) : undefined));
    setMountingClass(
      node.data.mountingClass
        ?? (node.data.rackForm === "half"
          ? "rack-half"
          : node.data.rackForm === "shelf-only"
            ? "shelf"
            : resolveMountingClass(node.data)),
    );
    setSyncMmFromU(true);
    setIsCableAccessory(node.data.isCableAccessory ?? false);
    setIntegratedWithCable(node.data.integratedWithCable ?? false);
    setIsVenueProvided(node.data.isVenueProvided ?? false);
    setAdapterVisibility(node.data.adapterVisibility ?? "default");
    setAuxiliaryData(normalizeAuxRows(node.data.auxiliaryData));
    setSearchTermsRaw((node.data.searchTerms ?? []).join(", "));
    setRfInstallation(node.data.rfInstallation ? { ...node.data.rfInstallation } : undefined);
  }, [node, mdfSchematicDefault]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleApplyMdfLayout = useCallback(() => {
    if (!mdfEditor) return;
    const rebuilt = applyMdfLayoutToPorts(
      ports.map((p) => ({ ...p })) as Port[],
      mdfEditor,
    );
    setPorts(
      rebuilt.map((p) => ({
        id: p.id,
        label: p.label,
        signalType: p.signalType,
        direction: p.direction,
        section: p.section,
        connectorType: p.connectorType,
        rearConnectorType: p.rearConnectorType,
        frontConnectorType: p.frontConnectorType,
        inheritsSignal: p.inheritsSignal,
      })),
    );
    setRackHeightU(Math.max(1, mdfEditor.mdfRows));
  }, [mdfEditor, ports]);

  const close = useCallback(() => {
    // Read live store state — a stale closure here would make handleSave
    // (which clears creatingNodeId just before calling close) trigger the
    // provisional-undo branch and revert the user's just-saved data.
    const { editingNodeId: eId, creatingNodeId: cId } = useSchematicStore.getState();
    if (eId && eId === cId) {
      // Provisional node — user cancelled without saving, undo the addDevice
      undo();
      setCreatingNodeId(null);
    }
    setEditingNodeId(null);
  }, [undo, setCreatingNodeId, setEditingNodeId]);

  const finishSave = useCallback((applyToAllSiblings: boolean) => {
    if (!editingNodeId) return;
    const data = pendingSaveRef.current;
    const applyMeta = pendingApplyMetaRef.current;
    if (!data) return;

    const store = useSchematicStore.getState();
    store.updateDevice(editingNodeId, data);
    if (applyMeta) {
      store.saveDeviceRackMetadata(editingNodeId, applyMeta.rackPatch, {
        applyToMatching: applyToAllSiblings,
        updateDefinition: applyToAllSiblings,
      });
    }
    store.syncRackPlacementsForDevice(editingNodeId);
    if (!data.designationLocked) {
      store.recomputeHousenames({ deviceNodeIds: [editingNodeId] }, { skipUndo: true });
    }
    setCreatingNodeId(null);
    pendingSaveRef.current = null;
    pendingApplyMetaRef.current = null;
    setApplyRackPrompt(null);
    close();
  }, [editingNodeId, setCreatingNodeId, close]);

  const handleSave = useCallback(() => {
    if (!editingNodeId) return;

    // Build old→new ID map for draft ports
    const idMap = new Map<string, string>();
    const finalPorts: Port[] = ports
      .filter((p) => p.label.trim())
      .map((p, i) => {
        const newId = p.id.startsWith("draft-") ? `p${Date.now()}-${i}` : p.id;
        if (newId !== p.id) idMap.set(p.id, newId);
        return { ...p, id: newId, label: p.label.trim() };
      });

    // Remap and prune stale IDs from hiddenPorts
    const finalPortIds = new Set(finalPorts.map((p) => p.id));
    const finalHiddenPorts = hiddenPorts
      .map((id) => idMap.get(id) ?? id)
      .filter((id) => finalPortIds.has(id));

    // Preserve existing metadata fields from the node
    const existing = node?.data;
    const mdfActive = (deviceType.trim() || existing?.deviceType) === "mdf" && mdfEditor;
    const effRackLocation = mdfActive ? mdfEditor.rackLocation.trim() : rackLocation.trim();
    const effFrameSlot = mdfActive ? mdfEditor.frameSlot.trim() : frameSlot.trim();
    const effDesignation = mdfActive ? mdfEditor.designation.trim() : designation.trim();
    const effDesignationLocked = mdfActive ? mdfEditor.designationLocked : designationLocked;
    const effShowInstallationBlock = mdfActive
      ? mdfEditor.showInstallationBlock
      : showInstallationBlock;
    const effRackHeightUFromMdf = mdfActive ? mdfEditor.rackHeightU : rackHeightU;
    const effMountingFromMdf = mdfActive ? mdfEditor.mountingClass : mountingClass;
    const throwdownDefaults = applyGenericThrowdownDimensionsIfMissing({
      label: label.trim() || "Untitled",
      deviceType: deviceType.trim() || "custom",
      ports: finalPorts,
      mountingClass: effMountingFromMdf,
      rackHeightU: effRackHeightUFromMdf,
      heightMm,
      widthMm,
      depthMm,
    });
    const effRackHeightU = effRackHeightUFromMdf ?? throwdownDefaults.rackHeightU;
    const effHeightMm = heightMm ?? throwdownDefaults.heightMm;
    const effWidthMm = widthMm ?? throwdownDefaults.widthMm;
    const effDepthMm = depthMm ?? throwdownDefaults.depthMm;
    const effMountingClass = effMountingFromMdf;
    const data: DeviceData = {
      label: label.trim() || "Untitled",
      ...(shortName.trim() ? { shortName: shortName.trim() } : {}),
      ...(useShortName !== undefined ? { useShortName } : {}),
      ...(wrapLabel !== undefined ? { wrapLabel } : {}),
      ...(hostname.trim() ? { hostname: hostname.trim() } : {}),
      deviceType: deviceType.trim() || "custom",
      ports: finalPorts,
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(modelNumber.trim() ? { modelNumber: modelNumber.trim() } : {}),
      ...(effDesignation ? { designation: effDesignation } : {}),
      ...(effDesignationLocked ? { designationLocked: true } : { designationLocked: false }),
      ...(effRackLocation ? { rackLocation: effRackLocation } : {}),
      ...(effFrameSlot ? { frameSlot: effFrameSlot } : {}),
      ...(mdfActive
        ? {
            ...(mdfEditor.mdfPairLabel.trim()
              ? { mdfPairLabel: mdfEditor.mdfPairLabel.trim() }
              : {}),
            mdfRows: mdfEditor.mdfRows,
            mdfPortsPerRow: mdfEditor.mdfPortsPerRow,
            mdfSignalType: mdfEditor.mdfSignalType,
            ...(mdfEditor.mdfDisplayMode !== "inherit"
              ? { mdfDisplayMode: mdfEditor.mdfDisplayMode }
              : {}),
          }
        : mdfPairLabel.trim()
          ? { mdfPairLabel: mdfPairLabel.trim() }
          : {}),
      ...(deviceTypeCode.trim() ? { deviceTypeCode: deviceTypeCode.trim() } : {}),
      ...(managementIp.trim() ? { managementIp: managementIp.trim() } : {}),
      ...(vlanSummary.trim() ? { vlanSummary: vlanSummary.trim() } : {}),
      ...(effShowInstallationBlock !== undefined ? { showInstallationBlock: effShowInstallationBlock } : {}),
      ...(referenceUrl.trim() ? { referenceUrl: referenceUrl.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(existing?.templateId ? { templateId: existing.templateId } : {}),
      ...(existing?.templateVersion ? { templateVersion: existing.templateVersion } : {}),
      ...(color ? { color } : {}),
      ...(headerColor ? { headerColor } : {}),
      ...(existing?.model ? { model: existing.model } : {}),
      ...(showAllPorts ? { showAllPorts: true } : {}),
      ...(finalHiddenPorts.length > 0 ? { hiddenPorts: finalHiddenPorts } : {}),
      // Always persist dhcpServer if set (preserves range config when toggling off)
      ...(dhcpServer ? { dhcpServer } : {}),
      ...(powerDrawW != null ? { powerDrawW } : {}),
      ...(powerCapacityW != null ? { powerCapacityW } : {}),
      ...(poeBudgetW != null ? { poeBudgetW } : {}),
      ...(poeDrawW != null ? { poeDrawW } : {}),
      ...(voltage ? { voltage } : {}),
      ...(thermalBtuh != null ? { thermalBtuh } : {}),
      ...(unitCost != null ? { unitCost } : {}),
      ...(effHeightMm != null ? { heightMm: effHeightMm } : {}),
      ...(effWidthMm != null ? { widthMm: effWidthMm } : {}),
      ...(effDepthMm != null ? { depthMm: effDepthMm } : {}),
      ...(weightKg != null ? { weightKg } : {}),
      ...(throwdownDefaults.rackMetadataSource
        ? { rackMetadataSource: throwdownDefaults.rackMetadataSource }
        : {}),
      ...buildExplicitRackMetadata(effRackHeightU, effMountingClass, effHeightMm),
      ...(isCableAccessory ? { isCableAccessory: true } : {}),
      ...(integratedWithCable ? { integratedWithCable: true } : {}),
      ...(isVenueProvided ? { isVenueProvided: true } : {}),
      ...(adapterVisibility !== "default" ? { adapterVisibility } : {}),
      ...(existing?.baseLabel ? { baseLabel: existing.baseLabel } : {}),
      ...(existing?.slots ? { slots: existing.slots } : {}),
      ...((() => {
        const trimmed = trimTrailingEmpty(auxiliaryData);
        return trimmed.some((r) => r.text.trim()) ? { auxiliaryData: trimmed } : {};
      })()),
      ...(() => { const t = searchTermsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20); return t.length > 0 ? { searchTerms: t } : {}; })(),
      ...(rfInstallation ? { rfInstallation } : {}),
    };
    if (mdfActive && mdfEditor.mdfDisplayMode === "inherit") {
      delete data.mdfDisplayMode;
    }
    const rackPatch = buildExplicitRackMetadata(effRackHeightU, effMountingClass, effHeightMm);
    const defKey = existing ? rackDeviceDefinitionKey({ ...existing, ...data }) : null;
    const rackChanged = rackMetadataChanged(existing, effRackHeightU, effMountingClass);

    pendingSaveRef.current = data;

    if (rackChanged && defKey) {
      const store = useSchematicStore.getState();
      const others = store.nodes.filter(
        (n) => n.type === "device" && n.id !== editingNodeId && rackDeviceDefinitionKey(n.data as DeviceData) === defKey,
      );
      if (others.length > 0) {
        const modelName = (existing?.model ?? existing?.baseLabel ?? label.trim()) || "this device";
        pendingApplyMetaRef.current = {
          rackPatch,
          otherNodeIds: others.map((n) => n.id),
          templateId: existing?.templateId,
        };
        setApplyRackPrompt({
          modelName,
          otherCount: others.length,
          rackPatch,
          mountingClass,
          hasDefinitionKey: !!defKey,
        });
        return;
      }
    }

    pendingApplyMetaRef.current = null;
    finishSave(false);
  }, [editingNodeId, ports, label, shortName, useShortName, wrapLabel, hostname, deviceType, manufacturer, modelNumber, designation, designationLocked, rackLocation, frameSlot, deviceTypeCode, managementIp, vlanSummary, showInstallationBlock, referenceUrl, category, color, headerColor, node, finishSave, showAllPorts, hiddenPorts, dhcpServer, powerDrawW, powerCapacityW, voltage, thermalBtuh, poeBudgetW, poeDrawW, unitCost, heightMm, widthMm, depthMm, weightKg, rackHeightU, mountingClass, isCableAccessory, integratedWithCable, isVenueProvided, adapterVisibility, auxiliaryData, searchTermsRaw, rfInstallation]);

  // Ctrl+Enter anywhere in the editor → Apply & Close
  const onCtrlEnter = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    }
  }, [handleSave]);

  const handleSaveAsTemplate = useCallback(() => {
    const finalPorts: Port[] = ports
      .filter((p) => p.label.trim())
      .map((p, i) => ({
        ...p,
        id: `tpl-${i}`,
        label: p.label.trim(),
      }));

    const trimmedAux = trimTrailingEmpty(auxiliaryData);
    const existing = node?.data;

    addCustomTemplate({
      id: `custom-${Date.now()}`,
      deviceType: deviceType.trim() || "custom",
      label: label.trim() || "Custom Device",
      ...(shortName.trim() ? { shortName: shortName.trim() } : {}),
      ports: finalPorts,
      ...(color ? { color } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(modelNumber.trim() ? { modelNumber: modelNumber.trim() } : {}),
      ...(referenceUrl.trim() ? { referenceUrl: referenceUrl.trim() } : {}),
      ...(hostname.trim() ? { hostname: hostname.trim() } : {}),
      ...(powerDrawW != null ? { powerDrawW } : {}),
      ...(powerCapacityW != null ? { powerCapacityW } : {}),
      ...(voltage ? { voltage } : {}),
      ...(thermalBtuh != null ? { thermalBtuh } : {}),
      ...(poeBudgetW != null ? { poeBudgetW } : {}),
      ...(poeDrawW != null ? { poeDrawW } : {}),
      ...(unitCost != null ? { unitCost } : {}),
      ...(heightMm != null ? { heightMm } : {}),
      ...(widthMm != null ? { widthMm } : {}),
      ...(depthMm != null ? { depthMm } : {}),
      ...(weightKg != null ? { weightKg } : {}),
      ...(isVenueProvided ? { isVenueProvided: true } : {}),
      // Convert InstalledSlot[] back to the blueprint SlotDefinition[] that DeviceTemplate
      // expects — card selections are per-placement, not part of the template spec.
      ...(existing?.slots && existing.slots.length > 0
        ? {
            slots: existing.slots.map((s) => ({
              id: s.slotId,
              label: s.label,
              slotFamily: s.slotFamily ?? "",
              ...(s.cardTemplateId ? { defaultCardId: s.cardTemplateId } : {}),
            })),
          }
        : {}),
      ...(existing?.slotFamily ? { slotFamily: existing.slotFamily as string } : {}),
      ...(trimmedAux.some((r) => r.text.trim()) ? { auxiliaryData: trimmedAux } : {}),
      ...(() => { const t = searchTermsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20); return t.length > 0 ? { searchTerms: t } : {}; })(),
    });
  }, [ports, label, shortName, hostname, addCustomTemplate, node, powerDrawW, powerCapacityW, voltage, thermalBtuh, poeBudgetW, poeDrawW, unitCost, heightMm, widthMm, depthMm, weightKg, isVenueProvided, deviceType, color, manufacturer, modelNumber, referenceUrl, category, auxiliaryData, searchTermsRaw]);

  const handleUpdateUserTemplate = useCallback(() => {
    if (!node?.data.templateId) return;
    const finalPorts: Port[] = ports
      .filter((p) => p.label.trim())
      .map((p, i) => ({
        ...p,
        id: `tpl-${i}`,
        label: p.label.trim(),
      }));
    const trimmedAux = trimTrailingEmpty(auxiliaryData);
    const existing = node.data;
    updateCustomTemplate(node.data.templateId, {
      id: node.data.templateId,
      deviceType: deviceType.trim() || "custom",
      label: label.trim() || "Custom Device",
      ...(shortName.trim() ? { shortName: shortName.trim() } : {}),
      ports: finalPorts,
      ...(color ? { color } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(modelNumber.trim() ? { modelNumber: modelNumber.trim() } : {}),
      ...(referenceUrl.trim() ? { referenceUrl: referenceUrl.trim() } : {}),
      ...(hostname.trim() ? { hostname: hostname.trim() } : {}),
      ...(powerDrawW != null ? { powerDrawW } : {}),
      ...(powerCapacityW != null ? { powerCapacityW } : {}),
      ...(voltage ? { voltage } : {}),
      ...(thermalBtuh != null ? { thermalBtuh } : {}),
      ...(poeBudgetW != null ? { poeBudgetW } : {}),
      ...(poeDrawW != null ? { poeDrawW } : {}),
      ...(unitCost != null ? { unitCost } : {}),
      ...(heightMm != null ? { heightMm } : {}),
      ...(widthMm != null ? { widthMm } : {}),
      ...(depthMm != null ? { depthMm } : {}),
      ...(weightKg != null ? { weightKg } : {}),
      ...(isVenueProvided ? { isVenueProvided: true } : {}),
      ...(existing.slots && existing.slots.length > 0
        ? {
            slots: existing.slots.map((s) => ({
              id: s.slotId,
              label: s.label,
              slotFamily: s.slotFamily ?? "",
              ...(s.cardTemplateId ? { defaultCardId: s.cardTemplateId } : {}),
            })),
          }
        : {}),
      ...(existing.slotFamily ? { slotFamily: existing.slotFamily as string } : {}),
      ...(trimmedAux.some((r) => r.text.trim()) ? { auxiliaryData: trimmedAux } : {}),
      ...(() => { const t = searchTermsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20); return t.length > 0 ? { searchTerms: t } : {}; })(),
    });
    handleSave();
  }, [node, ports, label, shortName, hostname, updateCustomTemplate, powerDrawW, powerCapacityW, voltage, thermalBtuh, poeBudgetW, poeDrawW, unitCost, heightMm, widthMm, depthMm, weightKg, isVenueProvided, deviceType, color, manufacturer, modelNumber, referenceUrl, category, auxiliaryData, searchTermsRaw, handleSave]);

  const handleSaveAsPreset = useCallback(() => {
    if (!editingNodeId || !node?.data.templateId) return;
    const templateId = node.data.templateId;

    // Normalize ports to stable preset IDs
    const presetPorts: Port[] = ports
      .filter((p) => p.label.trim())
      .map((p, i) => ({ ...p, id: `preset-${i}`, label: p.label.trim() }));

    // Remap hiddenPorts through old→new mapping
    const idMap = new Map<string, string>();
    ports.filter((p) => p.label.trim()).forEach((p, i) => { idMap.set(p.id, `preset-${i}`); });
    const presetHidden = hiddenPorts
      .map((id) => idMap.get(id) ?? id)
      .filter((id) => presetPorts.some((p) => p.id === id));

    setTemplatePreset(templateId, {
      ports: presetPorts,
      ...(presetHidden.length > 0 ? { hiddenPorts: presetHidden } : {}),
      ...(color ? { color } : {}),
    });

    // Also apply changes to current device
    handleSave();
  }, [editingNodeId, node, ports, hiddenPorts, color, setTemplatePreset, handleSave]);

  const handleRevertToTemplate = useCallback(() => {
    if (!node) return;
    const templateId = node.data.templateId;
    const tpl = templateId
      ? getBundledTemplates().find((t) => t.id === templateId) ??
        customTemplates.find((t) => t.id === templateId)
      : undefined;
    if (!tpl) return;

    setPorts(tpl.ports.map((p) => ({
      id: p.id,
      label: p.label,
      signalType: p.signalType,
      direction: p.direction,
      section: p.section,
      connectorType: p.connectorType,
      gender: p.gender,
      networkConfig: p.networkConfig ? { ...p.networkConfig } : undefined,
      capabilities: p.capabilities ? { ...p.capabilities } : undefined,
      multiConnect: p.multiConnect,
      directAttach: p.directAttach,
      notes: p.notes,
      poeDrawW: p.poeDrawW,
      linkSpeed: p.linkSpeed,
      flipped: p.flipped,
      addressable: p.addressable,
    })));
    setHiddenPorts([]);
    setColor(tpl.color);

    // For user templates, also revert all editable metadata fields
    if (customTemplates.some((t) => t.id === templateId)) {
      setLabel(tpl.label ?? "");
      setShortName(tpl.shortName ?? "");
      setManufacturer(tpl.manufacturer ?? "");
      setModelNumber(tpl.modelNumber ?? "");
      setReferenceUrl(tpl.referenceUrl ?? "");
      setCategory(tpl.category ?? "");
      setHostname(tpl.hostname ?? "");
      setPowerDrawW(tpl.powerDrawW);
      setPowerCapacityW(tpl.powerCapacityW);
      setVoltage(tpl.voltage);
      setThermalBtuh(tpl.thermalBtuh);
      setPoeBudgetW(tpl.poeBudgetW);
      setPoeDrawW(tpl.poeDrawW);
      setUnitCost(tpl.unitCost);
      setHeightMm(tpl.heightMm);
      setWidthMm(tpl.widthMm);
      setDepthMm(tpl.depthMm);
      setWeightKg(tpl.weightKg);
      setIsVenueProvided(tpl.isVenueProvided ?? false);
      setAuxiliaryData(normalizeAuxRows(tpl.auxiliaryData));
      setSearchTermsRaw((tpl.searchTerms ?? []).join(", "));
    }
  }, [node, customTemplates]);

  const handleRevertToPreset = useCallback(() => {
    if (!node?.data.templateId) return;
    const preset = templatePresets[node.data.templateId];
    if (!preset) return;

    setPorts(preset.ports.map((p) => ({
      id: p.id,
      label: p.label,
      signalType: p.signalType,
      direction: p.direction,
      section: p.section,
      connectorType: p.connectorType,
      gender: p.gender,
      networkConfig: p.networkConfig ? { ...p.networkConfig } : undefined,
      capabilities: p.capabilities ? { ...p.capabilities } : undefined,
      directAttach: p.directAttach,
      notes: p.notes,
      poeDrawW: p.poeDrawW,
      linkSpeed: p.linkSpeed,
      flipped: p.flipped,
      addressable: p.addressable,
    })));
    setHiddenPorts(preset.hiddenPorts ?? []);
    setColor(preset.color);
  }, [node, templatePresets]);

  const addPort = (direction: PortDirection) => {
    setPorts([...ports, newPortDraft(direction)]);
  };

  const removePort = (id: string) => {
    setPorts(ports.filter((p) => p.id !== id));
  };

  const updatePort = (id: string, updates: Partial<PortDraft>) => {
    setPorts(ports.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const bulkAddPorts = (direction: PortDirection, prefix: string, start: number, count: number, signalType: SignalType, section: string) => {
    const newPorts: PortDraft[] = [];
    const connectorType = DEFAULT_CONNECTOR[signalType];
    const multiConnect = shouldDefaultMultiConnect(signalType, connectorType) || undefined;
    for (let i = 0; i < count; i++) {
      newPorts.push({
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
        label: `${prefix} ${start + i}`,
        signalType,
        direction,
        section: section || undefined,
        multiConnect,
      });
    }
    setPorts([...ports, ...newPorts]);
  };

  // Drag-and-drop: move a port to a new position/section
  const movePortTo = useCallback(
    (portId: string, targetDirection: PortDirection, targetIndex: number) => {
      setPorts((prev) => {
        const port = prev.find((p) => p.id === portId);
        if (!port) return prev;

        const without = prev.filter((p) => p.id !== portId);
        const updated = { ...port, direction: targetDirection };

        const sectionPorts = without.filter((p) => p.direction === targetDirection);
        const insertAfterId = targetIndex > 0 ? sectionPorts[targetIndex - 1]?.id : null;

        if (sectionPorts.length === 0 || targetIndex === 0) {
          const firstOfSection = without.findIndex((p) => p.direction === targetDirection);
          if (firstOfSection === -1) {
            return [...without, updated];
          }
          without.splice(firstOfSection, 0, updated);
          return [...without];
        }

        const insertAfterIdx = without.findIndex((p) => p.id === insertAfterId);
        without.splice(insertAfterIdx + 1, 0, updated);
        return [...without];
      });
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (draggedPortId && dropTarget) {
      movePortTo(draggedPortId, dropTarget.direction, dropTarget.index);
    }
    setDraggedPortId(null);
    setDropTarget(null);
  }, [draggedPortId, dropTarget, movePortTo]);

  // Dirty detection: compare current editor state against the effective default
  // (preset if one exists, otherwise raw template)
  // Must be above the early return to satisfy rules of hooks.
  const templateId = node?.data.templateId;
  const { dirtyVsPreset, dirtyVsTemplate } = useMemo(() => {
    if (!templateId) return { dirtyVsPreset: false, dirtyVsTemplate: false };

    const tpl = getBundledTemplates().find((t) => t.id === templateId) ??
      customTemplates.find((t) => t.id === templateId);
    const preset = templatePresets[templateId];

    const portsMatch = (a: PortDraft[], b: Port[]) => {
      if (a.length !== b.length) return false;
      return a.every((ap, i) => {
        const bp = b[i];
        return ap.label === bp.label &&
          ap.signalType === bp.signalType &&
          ap.direction === bp.direction &&
          (ap.connectorType ?? undefined) === (bp.connectorType ?? undefined) &&
          (ap.section ?? undefined) === (bp.section ?? undefined);
      });
    };

    const isUserTemplate = customTemplates.some((t) => t.id === templateId);

    const dirtyVsTemplate = !!tpl && (
      !portsMatch(ports, tpl.ports) ||
      hiddenPorts.length > 0 ||
      (color ?? undefined) !== (tpl.color ?? undefined) ||
      // For user templates, also check all editable metadata fields
      (isUserTemplate && (
        label !== (tpl.label ?? "") ||
        (manufacturer ?? "") !== (tpl.manufacturer ?? "") ||
        (modelNumber ?? "") !== (tpl.modelNumber ?? "") ||
        (referenceUrl ?? "") !== (tpl.referenceUrl ?? "") ||
        (category ?? "") !== (tpl.category ?? "") ||
        (hostname ?? "") !== (tpl.hostname ?? "") ||
        powerDrawW !== tpl.powerDrawW ||
        powerCapacityW !== tpl.powerCapacityW ||
        (voltage ?? undefined) !== (tpl.voltage ?? undefined) ||
        thermalBtuh !== tpl.thermalBtuh ||
        poeBudgetW !== tpl.poeBudgetW ||
        poeDrawW !== tpl.poeDrawW ||
        unitCost !== tpl.unitCost ||
        heightMm !== tpl.heightMm ||
        widthMm !== tpl.widthMm ||
        depthMm !== tpl.depthMm ||
        weightKg !== tpl.weightKg ||
        isVenueProvided !== (tpl.isVenueProvided ?? false)
      ))
    );

    const dirtyVsPreset = !!preset && (
      !portsMatch(ports, preset.ports) ||
      JSON.stringify([...hiddenPorts].sort()) !== JSON.stringify([...(preset.hiddenPorts ?? [])].sort()) ||
      (color ?? undefined) !== (preset.color ?? undefined)
    );

    return { dirtyVsPreset, dirtyVsTemplate };
  }, [templateId, ports, hiddenPorts, color, templatePresets, customTemplates, label, manufacturer, modelNumber, referenceUrl, category, hostname, powerDrawW, powerCapacityW, voltage, thermalBtuh, poeBudgetW, poeDrawW, unitCost, heightMm, widthMm, depthMm, weightKg, isVenueProvided]);

  const towerMountHint = useMemo(() => {
    if (!towerPlacementCtx || !node) return "";
    const pl = towerPlacementCtx.placement;
    const data = node.data as DeviceData;
    const parts: string[] = [`${Math.round(pl.mountHeightFtAgl)} ft AGL`];
    const az = resolvePlacementAzimuthDeg(pl, data, trackItTowerContext);
    if (az != null) parts.push(`${Math.round(az)}°`);
    else {
      const face = resolvePlacementTowerFace(pl, data, trackItTowerContext);
      if (face) parts.push(face);
    }
    return parts.join(" · ");
  }, [towerPlacementCtx, node, trackItTowerContext]);

  const deviceDetailsHint = useMemo(() => {
    const parts: string[] = [];
    const typeLabel = deviceType.trim() || node?.data.deviceType;
    if (typeLabel) parts.push(typeLabel);
    const mfgModel = [manufacturer.trim(), modelNumber.trim()].filter(Boolean).join(" ");
    if (mfgModel) parts.push(mfgModel);
    else if (node?.data.model?.trim()) parts.push(node.data.model.trim());
    if (category.trim()) parts.push(category.trim());
    const installBits = [designation.trim(), deviceTypeCode.trim()].filter(Boolean);
    if (installBits.length > 0) parts.push(installBits.join(" "));
    if (managementIp.trim()) parts.push(managementIp.trim());
    return parts.length > 0 ? parts.join(" · ") : "Type, manufacturer, installation";
  }, [
    deviceType,
    manufacturer,
    modelNumber,
    category,
    designation,
    deviceTypeCode,
    managementIp,
    node?.data.deviceType,
    node?.data.model,
  ]);

  const rackMoreHint = useMemo(() => {
    const parts: string[] = [];
    if (rackHeightU != null) parts.push(`${rackHeightU}U`);
    if (mountingClass && mountingClass !== "rack-full") {
      parts.push(mountingClass.replace(/-/g, " "));
    }
    if (hostname.trim()) parts.push(hostname.trim());
    if (powerDrawW != null) parts.push(`${powerDrawW}W`);
    return parts.length > 0 ? parts.join(" · ") : "Rack, network, power";
  }, [rackHeightU, mountingClass, hostname, powerDrawW]);

  const dialogTitle = useMemo(() => {
    if (!node) return "";
    return (
      label.trim() ||
      shortName.trim() ||
      modelNumber.trim() ||
      node.data.model ||
      node.data.deviceType ||
      "Unnamed device"
    );
  }, [label, shortName, modelNumber, node]);

  if (!editingNodeId || !node) return null;

  const drift = getTemplateDrift(node.data, customTemplates);
  const hasPreset = !!(templateId && templatePresets[templateId]);
  const inputs = ports.filter((p) => p.direction === "input");
  const outputs = ports.filter((p) => p.direction === "output");
  const bidir = ports.filter((p) => p.direction === "bidirectional");
  const passthroughPorts = ports.filter((p) => p.direction === "passthrough");
  const isMdf = deviceType === "mdf";
  const isPatchStyle = deviceType === "patch-panel" || isMdf;
  const showIoSections = !isMdf || inputs.length > 0 || outputs.length > 0 || bidir.length > 0;

  return (
    <>
    <FloatingPanel
      panelRef={dialogRef}
      defaultWidth={towerPlacementCtx ? 600 : 560}
      title={dialogTitle}
      subtitle={
        towerPlacementCtx
          ? towerMountHint
            ? `Tower equipment · ${towerMountHint}`
            : "Tower equipment · device properties"
          : undefined
      }
      onClose={close}
      onBackdropClick={close}
      onKeyDownCapture={onCtrlEnter}
      footer={
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={handleSaveAsTemplate}
            className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
            title="Save this device configuration as a reusable user template"
          >
            Save as User Template
          </button>
          {templateId && customTemplates.some((t) => t.id === templateId) ? (
            <button
              onClick={handleUpdateUserTemplate}
              className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
              title="Overwrite the saved user template with this configuration"
            >
              Update User Template
            </button>
          ) : templateId ? (
            <button
              onClick={handleSaveAsPreset}
              className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
              title="Set this configuration as the project default for this template"
            >
              Save as Preset
            </button>
          ) : null}
          {hasPreset && dirtyVsPreset && (
            <button
              onClick={handleRevertToPreset}
              className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
              title="Reset ports and visibility to the project preset"
            >
              Revert to Preset
            </button>
          )}
          {dirtyVsTemplate && (
            <button
              onClick={handleRevertToTemplate}
              className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
              title="Reset ports and visibility to the original template defaults"
            >
              Revert to Template
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={close}
            className="px-3 py-1.5 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text-heading)] border border-[var(--color-border)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Apply
          </button>
        </div>
      }
    >
        {drift && (
          <div className="mx-3 mt-3 px-4 py-2 border border-[var(--color-border)] rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between gap-2">
            <span className="text-xs text-blue-900 dark:text-blue-200">
              Template updated — v{drift.deviceVersion} → v{drift.currentVersion} available
            </span>
            <button
              onClick={() => setShowSyncDialog(true)}
              className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Update
            </button>
          </div>
        )}

        <div className="p-3 space-y-2">
          {towerPlacementCtx && (
            <DeviceEditorSection
              sectionId="mount-tower"
              title="Mount on tower"
              hint={towerMountHint}
            >
              <TowerDeviceMountEditor
                embedded
                page={towerPlacementCtx.page}
                placementId={towerPlacementCtx.placement.id}
                measurementSystem={measurementSystem}
              />
            </DeviceEditorSection>
          )}

          {isMdf && mdfEditor ? (
            <div className="p-3">
              <MdfDeviceEditorSection
                state={mdfEditor}
                onChange={(patch) => setMdfEditor((s) => (s ? { ...s, ...patch } : s))}
                onApplyLayout={handleApplyMdfLayout}
                housenamePreview={housenamePreview}
                roomLabel={roomContext.roomLabel}
                multiPair={isMdfMultiPairFromPorts(ports as Port[])}
                schematicDefault={mdfSchematicDefault}
              />
            </div>
          ) : (
          <>
          <DeviceEditorSection
            sectionId="device-details"
            title="Device details"
            hint={deviceDetailsHint}
          >
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Device Name">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Camera 1"
              />
              {node.data.model && label.trim() !== node.data.model && (
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  Template: {node.data.model}
                </div>
              )}
            </Field>
            <Field label="Short Name">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. HDC-5500"
              />
            </Field>
            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 -mt-1">
              {(() => {
                const hasCompact = !!(shortName.trim() || modelNumber.trim());
                const fallbackLabel = !shortName.trim() && modelNumber.trim() ? ` — falls back to model number "${modelNumber.trim()}"` : "";
                return (
                  <label
                    className={`flex items-center gap-1.5 text-[11px] ${hasCompact ? "text-[var(--color-text)] cursor-pointer" : "text-[var(--color-text-muted)] opacity-60 cursor-not-allowed"}`}
                    title={hasCompact
                      ? `Use the short name on this device${fallbackLabel}. Leave unchecked to inherit the schematic-wide default.`
                      : "Set a Short Name (or Model Number) above to enable this toggle."}
                  >
                    <input
                      type="checkbox"
                      disabled={!hasCompact}
                      checked={useShortName === true}
                      ref={(el) => { if (el) el.indeterminate = useShortName === undefined; }}
                      onChange={(e) => setUseShortName(e.target.checked ? true : (useShortName === undefined ? false : undefined))}
                    />
                    Use short name {useShortName === undefined && hasCompact && <span className="text-[var(--color-text-muted)]">(inherit)</span>}
                  </label>
                );
              })()}
              <label
                className="flex items-center gap-1.5 text-[11px] text-[var(--color-text)] cursor-pointer"
                title="Wrap the device label across two lines on this device. Leave unchecked to inherit the schematic-wide default."
              >
                <input
                  type="checkbox"
                  checked={wrapLabel === true}
                  ref={(el) => { if (el) el.indeterminate = wrapLabel === undefined; }}
                  onChange={(e) => setWrapLabelState(e.target.checked ? true : (wrapLabel === undefined ? false : undefined))}
                />
                Wrap label {wrapLabel === undefined && <span className="text-[var(--color-text-muted)]">(inherit)</span>}
              </label>
            </div>
            <Field label="Device Type">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                placeholder="e.g. camera"
              />
            </Field>
            <Field label="Manufacturer">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Sony"
              />
            </Field>
            <Field label="Model Number">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g. FX9"
              />
            </Field>
            <Field label="Category">
              <input
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. video"
              />
            </Field>
            <Field label="Reference URL">
              <input
                type="url"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>

          <div className="border border-[var(--color-border)] rounded-md p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Installation (drawing)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Designation">
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  value={designation}
                  onChange={(e) => {
                    setDesignation(e.target.value);
                    setDesignationLocked(true);
                  }}
                  placeholder="e.g. DSK-01B, TC-03 DA C"
                />
                {!designationLocked && housenamePreview ? (
                  <p className="mt-1 text-[10px] text-emerald-600">
                    Auto housename: {housenamePreview}
                  </p>
                ) : null}
                {designationLocked ? (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[10px] text-amber-600">Manual housename — auto updates paused</p>
                    <button
                      type="button"
                      className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                      onClick={() => {
                        if (!editingNodeId) return;
                        setDesignationLocked(false);
                        recomputeHousenames({ deviceNodeIds: [editingNodeId] });
                        const updated = useSchematicStore.getState().nodes.find(
                          (n) => n.id === editingNodeId && n.type === "device",
                        );
                        if (updated) {
                          setDesignation((updated.data as DeviceData).designation ?? "");
                        }
                      }}
                    >
                      Reset to auto
                    </button>
                  </div>
                ) : null}
              </Field>
              <Field label="Type code (housename)">
                <input
                  list="housename-type-codes"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 es-housename"
                  value={deviceTypeCode}
                  onChange={(e) => setDeviceTypeCode(e.target.value.toUpperCase())}
                  placeholder="SWR, ENC, DA…"
                />
                <datalist id="housename-type-codes">
                  {HOUSENAME_TYPE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {HOUSENAME_CODE_TO_LABEL[code]}
                    </option>
                  ))}
                </datalist>
                {typeSetupNeeded ? (
                  <p className="mt-1 text-[10px] text-amber-600">
                    Select a CAD device type for housename (e.g. SWR for video switcher, ENC for encoder).
                  </p>
                ) : null}
              </Field>
              <Field label="Rack location">
                <input
                  list={locationOptions.length > 0 ? locationListId : undefined}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                  placeholder="e.g. RK CB03, TH-03"
                />
                {locationOptions.length > 0 ? (
                  <datalist id={locationListId}>
                    {locationOptions.map((loc) => (
                      <option key={loc.id} value={loc.code}>
                        {loc.name}
                      </option>
                    ))}
                  </datalist>
                ) : null}
                {rackLocation.trim() && locationOptions.length > 0 ? (
                  <p
                    className={`mt-1 text-[10px] ${rackLocationMatch ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {rackLocationMatch
                      ? `trackIT: ${rackLocationMatch.name}`
                      : "No matching plant location — add under trackIT Locations"}
                  </p>
                ) : null}
              </Field>
              <Field label="Frame / slot">
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  value={frameSlot}
                  onChange={(e) => setFrameSlot(e.target.value)}
                  placeholder="FRAME 1 SLOT 3/4"
                />
              </Field>
              <Field label="Room (linked)">
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-muted)] outline-none"
                  value={roomContext.roomLabel || "—"}
                  readOnly
                  title={roomContext.roomId ? `Room node: ${roomContext.roomId}` : "Place device inside a room frame"}
                />
                {roomContext.roomLabel ? (
                  <p className="mt-1 text-[10px] text-emerald-600">
                    Referrable via {"{{room}}"} — not part of housename
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    Drag into a room container to link
                  </p>
                )}
              </Field>
              {isMdf ? (
                <Field label="MDF pair label (inline)">
                  <input
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 es-housename"
                    value={mdfPairLabel}
                    onChange={(e) => setMdfPairLabel(e.target.value)}
                    placeholder="e.g. 1-29 (single-pair inline only)"
                  />
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    Panel code (MDA/MDB/…) comes from rack position top-down. Add passthrough ports below for multi-pair panels.
                  </p>
                </Field>
              ) : null}
              <Field label="Management IP">
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  value={managementIp}
                  onChange={(e) => setManagementIp(e.target.value)}
                  placeholder="192.168.x.x"
                />
              </Field>
              <Field label="VLAN summary">
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  value={vlanSummary}
                  onChange={(e) => setVlanSummary(e.target.value)}
                  placeholder="VLAN 10, 20"
                />
              </Field>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={showInstallationBlock === true}
                ref={(el) => { if (el) el.indeterminate = showInstallationBlock === undefined; }}
                onChange={(e) =>
                  setShowInstallationBlock(
                    e.target.checked ? true : showInstallationBlock === undefined ? false : undefined,
                  )
                }
              />
              Show installation block on canvas
              {showInstallationBlock === undefined && (
                <span className="text-[var(--color-text-muted)]">(inherit)</span>
              )}
            </label>
          </div>

          {/* Header color picker */}
          <div className="flex items-center gap-2 -mt-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Header Color</span>
            <input
              type="color"
              className="w-6 h-6 rounded border border-[var(--color-border)] cursor-pointer p-0"
              value={headerColor ?? "#4b5563"}
              onChange={(e) => setHeaderColor(e.target.value)}
            />
            {headerColor && (
              <button
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                onClick={() => setHeaderColor(undefined)}
              >
                Reset
              </button>
            )}
          </div>

          {(() => {
            const tpl = node.data.templateId
              ? getBundledTemplates().find((t) => t.id === node.data.templateId)
              : undefined;
            const url = referenceUrl.trim() || tpl?.referenceUrl;
            return url ? (
              <div className="text-[10px] text-[var(--color-text-muted)] -mt-2 flex items-center gap-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                  title="View manufacturer spec page"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
                    <path d="M9 2h5v5" />
                    <path d="M14 2L7 9" />
                  </svg>
                  <span>Spec sheet</span>
                </a>
              </div>
            ) : null;
          })()}

          {/* Preset indicator */}
          {hasPreset && templateId && (
            <div className="text-[10px] text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded px-2 py-1 flex items-center justify-between -mt-1">
              <span>Preset active for all &ldquo;{node.data.model || "this template"}&rdquo; devices</span>
              <button
                onClick={() => setTemplatePreset(templateId, null)}
                className="text-blue-500 hover:text-blue-600 cursor-pointer ml-2"
              >
                Clear
              </button>
            </div>
          )}

          {/* Hostname */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">Hostname:</span>
            <input
              className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g. nvx-room101"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          </div>
          </DeviceEditorSection>

          <DeviceEditorSection
            sectionId="ports"
            title="Ports"
            hint={summarizePortsHint(ports)}
          >
          <div className="space-y-4">

          {/* Port Visibility */}
          <PortVisibilitySection
            showAllPorts={showAllPorts}
            setShowAllPorts={setShowAllPorts}
            hiddenPorts={hiddenPorts}
            setHiddenPorts={setHiddenPorts}
            ports={ports}
            node={node}
            nodes={nodes}
            templateHiddenSignals={templateHiddenSignals}
            setTemplateHiddenSignals={setTemplateHiddenSignals}
          />

          {showIoSections ? (
          <>
          <PortSection
            title={isPatchStyle ? "Rear" : "Inputs"}
            direction="input"
            deviceType={deviceType}
            ports={inputs}
            onAdd={() => addPort("input")}
            onBulkAdd={bulkAddPorts}
            onRemove={removePort}
            onUpdate={updatePort}
            draggedPortId={draggedPortId}
            setDraggedPortId={setDraggedPortId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            onDragEnd={handleDragEnd}
            hiddenPorts={hiddenPorts}
            setHiddenPorts={setHiddenPorts}
          />

          <PortSection
            title={isPatchStyle ? "Front" : "Outputs"}
            direction="output"
            deviceType={deviceType}
            ports={outputs}
            onAdd={() => addPort("output")}
            onBulkAdd={bulkAddPorts}
            onRemove={removePort}
            onUpdate={updatePort}
            draggedPortId={draggedPortId}
            setDraggedPortId={setDraggedPortId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            onDragEnd={handleDragEnd}
            hiddenPorts={hiddenPorts}
            setHiddenPorts={setHiddenPorts}
          />

          {(deviceType !== "patch-panel" && !isMdf || bidir.length > 0) && (
            <PortSection
              title="Bidirectional"
              direction="bidirectional"
              deviceType={deviceType}
              ports={bidir}
              onAdd={() => addPort("bidirectional")}
              onBulkAdd={bulkAddPorts}
              onRemove={removePort}
              onUpdate={updatePort}
              draggedPortId={draggedPortId}
              setDraggedPortId={setDraggedPortId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDragEnd={handleDragEnd}
              hiddenPorts={hiddenPorts}
              setHiddenPorts={setHiddenPorts}
            />
          )}
          </>
          ) : null}

          {(isPatchStyle || deviceType === "wall-plate" || passthroughPorts.length > 0) && (
            <PortSection
              title={isPatchStyle ? "Rear ⇔ Front (passthrough)" : "Passthrough Circuits"}
              direction="passthrough"
              deviceType={deviceType}
              ports={passthroughPorts}
              onAdd={() => addPort("passthrough")}
              onBulkAdd={bulkAddPorts}
              onRemove={removePort}
              onUpdate={updatePort}
              draggedPortId={draggedPortId}
              setDraggedPortId={setDraggedPortId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDragEnd={handleDragEnd}
              hiddenPorts={hiddenPorts}
              setHiddenPorts={setHiddenPorts}
            />
          )}

          </div>
          </DeviceEditorSection>

          <DeviceEditorSection
            sectionId="rack-power-more"
            title="Rack, power & more"
            hint={rackMoreHint}
          >
          <div className="space-y-4">

          {!towerPlacementCtx &&
            (deviceType.startsWith("rf-") ||
              deviceType.startsWith("microwave-") ||
              deviceType === "eng-receiver-ird") && (
              <RfInstallationEditor
                rfInstallation={rfInstallation}
                onInstallationChange={setRfInstallation}
              />
            )}

          {/* Rack elevation */}
          <div className="border border-[var(--color-border)] rounded-md p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Rack elevation
            </div>
            {node && (() => {
              const draft: DeviceData = {
                label,
                deviceType,
                ports: [],
                rackHeightU,
                mountingClass,
                heightMm,
                widthMm,
                depthMm,
              };
              const summary = getRackMountSummary(draft);
              const warnings = validateRackDimensions(draft);
              return (
                <>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {summary.heightU}U · {summary.mountingLabel}
                    {summary.source === "estimated" ? " · estimated" : ""}
                  </p>
                  {warnings.map((w) => (
                    <p key={w} className="text-[10px] text-amber-700">{w}</p>
                  ))}
                  {shelfDimsMissing && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 space-y-1.5">
                      <p>
                        Missing footprint mm for shelf / throwdown. Apply will use typical size (
                        {formatGenericThrowdownDimensions()}), or fill dimensions below.
                      </p>
                      <button
                        type="button"
                        className="text-blue-700 hover:underline font-medium"
                        onClick={() => {
                          const g = GENERIC_THROWDOWN_DIMENSIONS;
                          setRackHeightU(g.rackHeightU);
                          setMountingClass(g.mountingClass);
                          if (heightMm == null) setHeightMm(g.heightMm);
                          if (widthMm == null) setWidthMm(g.widthMm);
                          if (depthMm == null) setDepthMm(g.depthMm);
                        }}
                      >
                        Use typical throwdown dimensions
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Rack U
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={rackHeightU ?? ""}
                  onChange={(e) => {
                    const u = e.target.value ? Number(e.target.value) : undefined;
                    setRackHeightU(u);
                    if (syncMmFromU && u != null) setHeightMm(heightMmFromRackU(u));
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Mounting
                </label>
                <select
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={mountingClass}
                  onChange={(e) => {
                    const mc = e.target.value as MountingClass;
                    setMountingClass(mc);
                    if (mc !== "shelf") return;
                    const patch = applyGenericThrowdownDimensionsIfMissing({
                      label,
                      deviceType,
                      ports: [],
                      mountingClass: mc,
                      rackHeightU,
                      heightMm,
                      widthMm,
                      depthMm,
                    });
                    if (patch.rackHeightU != null && rackHeightU == null) setRackHeightU(patch.rackHeightU);
                    if (patch.heightMm != null && heightMm == null) setHeightMm(patch.heightMm);
                    if (patch.widthMm != null && widthMm == null) setWidthMm(patch.widthMm);
                    if (patch.depthMm != null && depthMm == null) setDepthMm(patch.depthMm);
                  }}
                >
                  <option value="rack-full">Full rack panel</option>
                  <option value="rack-half">Half rack</option>
                  <option value="shelf">Shelf / throwdown</option>
                  <option value="tabletop">Tabletop (not on elevation)</option>
                  <option value="not-rackable">Not rackable</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={syncMmFromU}
                onChange={(e) => setSyncMmFromU(e.target.checked)}
              />
              Sync height (mm) from rack U
            </label>
            {(deviceType === "patch-panel" || (ports.length >= 24)) && (
              <button
                type="button"
                className="text-[10px] text-blue-600 hover:underline"
                onClick={() => setShowFacePlateEditor(true)}
              >
                Edit face-plate layout (ports on rack view)
              </button>
            )}
          </div>

          {/* Physical Dimensions */}
          <details
            className={`text-xs rounded ${shelfDimsMissing ? "border border-amber-300 bg-amber-50/50 px-2" : ""}`}
            open={shelfDimsMissing || undefined}
          >
            <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
              Physical dimensions (mm)
              {shelfDimsMissing ? (
                <span className="ml-1 text-amber-700 font-medium">— required for throwdown</span>
              ) : null}
            </summary>
            <div className="pt-1 pl-2 grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Height (mm)
                </label>
                <input
                  type="number"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={heightMm ?? ""}
                  onChange={(e) => setHeightMm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 44"
                  min={1}
                  step={1}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Width (mm)
                </label>
                <input
                  type="number"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={widthMm ?? ""}
                  onChange={(e) => setWidthMm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 482"
                  min={1}
                  step={1}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Depth (mm)
                </label>
                <input
                  type="number"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={depthMm ?? ""}
                  onChange={(e) => setDepthMm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 350"
                  min={1}
                  step={1}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
                  value={weightKg ?? ""}
                  onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 2.5"
                  min={0}
                  step={0.1}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </details>

          {ports.some((p) => p.connectorType === "rj45" || p.connectorType === "ethercon") && (
            <>
              <DhcpServerSection dhcpServer={dhcpServer} onChange={setDhcpServer} />
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={poeBudgetW != null}
                    onChange={(e) => setPoeBudgetW(e.target.checked ? 0 : undefined)}
                    className="cursor-pointer"
                  />
                  PoE Source
                </label>
                {poeBudgetW != null && (
                  <input
                    className="w-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500"
                    type="number"
                    value={poeBudgetW || ""}
                    onChange={(e) => setPoeBudgetW(e.target.value ? Number(e.target.value) : 0)}
                    placeholder="Budget (W)"
                    min={0}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={poeDrawW != null}
                    onChange={(e) => setPoeDrawW(e.target.checked ? 0 : undefined)}
                    className="cursor-pointer"
                  />
                  Powered by PoE
                </label>
                {poeDrawW != null && (
                  <input
                    className="w-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500"
                    type="number"
                    value={poeDrawW || ""}
                    onChange={(e) => setPoeDrawW(e.target.value ? Number(e.target.value) : 0)}
                    placeholder="Draw (W)"
                    min={0}
                    step={0.1}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </>
          )}

          {/* Expansion Slots */}
          {(() => {
            const templateDef = node.data.templateId
              ? getBundledTemplates().find((t) => t.id === node.data.templateId)
              : undefined;
            const slotDefs = templateDef?.slots ?? [];
            return (
              <SlotEditSection
                nodeId={node.id}
                installedSlots={node.data.slots ?? []}
                slotDefs={slotDefs}
              />
            );
          })()}

          {/* Power */}
          {(ports.some((p) => p.signalType === "power") || deviceType.includes("power")) && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
                Power
              </summary>
              <div className="grid grid-cols-2 gap-2 pt-1 pl-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                    Power Draw (W)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                    value={powerDrawW ?? ""}
                    onChange={(e) => setPowerDrawW(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                    Voltage
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                    value={voltage ?? ""}
                    onChange={(e) => setVoltage(e.target.value || undefined)}
                    placeholder="100-240V"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="col-span-2">
                  <label
                    className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5"
                    title="Thermal load for HVAC sizing. Auto-derived from Power Draw × 3.412 if left blank."
                  >
                    Thermal (BTU/h)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                    value={thermalBtuh ?? ""}
                    onChange={(e) => setThermalBtuh(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={(() => {
                      const auto = deriveThermalBtuh(powerDrawW);
                      return auto != null ? `auto: ${auto}` : "0";
                    })()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {deviceType.includes("power-distribution") && (
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                      Power Capacity (W)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                      value={powerCapacityW ?? ""}
                      onChange={(e) => setPowerCapacityW(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Search Terms */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
              {(() => { const n = searchTermsRaw.split(",").map((s) => s.trim()).filter(Boolean).length; return `Search Terms${n > 0 ? ` (${n})` : ""}`; })()}
            </summary>
            <div className="pt-1 pl-2">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1">
                Comma-separated keywords used to find this device in the library. Edit here and "Submit to Community" to contribute improvements back.
              </p>
              <input
                type="text"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                value={searchTermsRaw}
                onChange={(e) => setSearchTermsRaw(e.target.value)}
                placeholder="e.g. matrix, router, video switcher"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </details>

          {/* Cost */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
              Cost
            </summary>
            <div className="pt-1 pl-2" style={{ maxWidth: "50%" }}>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                Unit Cost ({currency})
              </label>
              <input
                type="number"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                value={unitCost ?? ""}
                onChange={(e) => setUnitCost(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.00"
                min={0}
                step={0.01}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </details>

          {/* Auxiliary Data */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
              Auxiliary Data
            </summary>
            <div className="flex flex-col gap-1.5 pt-1 pl-2">
              <p className="text-[10px] text-[var(--color-text-muted)] -mb-0.5">
                Up to 5 custom lines. Use the <span className="font-mono">+</span> button to insert a device field. Leave a line blank to add a separator. Toggle <span className="font-mono">F</span>/<span className="font-mono">GH</span>/<span className="font-mono">—</span> for footer, global header, or hidden.
              </p>
              {(() => {
                const previewDevice = {
                  label,
                  hostname,
                  manufacturer,
                  modelNumber: node?.data.modelNumber,
                  deviceType,
                  powerDrawW,
                  powerCapacityW,
                  poeBudgetW,
                  poeDrawW,
                  voltage,
                  thermalBtuh,
                  weightKg,
                  widthMm,
                  heightMm,
                  depthMm,
                  unitCost,
                  ports,
                } as unknown as DeviceData;
                return [0, 1, 2, 3, 4].map((i) => {
                  const row = auxiliaryData[i] ?? { text: "", position: "footer" as const };
                  const text = row.text;
                  const position = rowPosition(row);
                  const hasToken = text.indexOf("{{") !== -1;
                  const preview = hasToken ? resolveAuxiliaryLine(text, previewDevice) : "";
                  const setRow = (next: Partial<AuxRow>) => {
                    const newData = [...auxiliaryData];
                    while (newData.length <= i) newData.push({ text: "", position: "footer" });
                    newData[i] = { ...newData[i], ...next };
                    setAuxiliaryData(newData);
                  };
                  return (
                    <div key={i} className="relative">
                      <div className="flex gap-1">
                        <input
                          ref={(el) => { auxInputRefs.current[i] = el; }}
                          type="text"
                          className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                          value={text}
                          onChange={(e) => setRow({ text: e.target.value })}
                          placeholder="Auxiliary Data"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          title="Insert device field"
                          className="px-2 py-1 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer shrink-0"
                          onClick={() => setAuxFieldMenuIdx(auxFieldMenuIdx === i ? null : i)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          title={auxPositionTitle(position)}
                          className={`px-1.5 py-1 text-[10px] font-semibold rounded border cursor-pointer shrink-0 min-w-7 ${
                            position === "gheader"
                              ? "bg-blue-500 border-blue-500 text-white"
                              : position === "hidden"
                                ? "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] italic"
                                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                          }`}
                          onClick={() => setRow({ position: cycleAuxPosition(position) })}
                        >
                          {auxPositionLabel(position)}
                        </button>
                      </div>
                      {hasToken && (
                        <div className="text-[10px] text-[var(--color-text-muted)] pl-1 truncate" title={preview}>
                          → {preview || <span className="italic">(empty)</span>}
                        </div>
                      )}
                      {auxFieldMenuIdx === i && (
                        <div
                          ref={auxMenuRef}
                          className="absolute right-0 z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg"
                        >
                          {AUX_FIELD_GROUPS.map(({ group, fields }) => (
                            <div key={group} className="py-1">
                              <div className="px-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                {group}
                              </div>
                              {fields.map((f) => (
                                <button
                                  key={f.token}
                                  type="button"
                                  className="block w-full text-left px-2 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg)] cursor-pointer"
                                  onClick={() => {
                                    const input = auxInputRefs.current[i];
                                    const token = `{{${f.token}}}`;
                                    const start = input?.selectionStart ?? text.length;
                                    const end = input?.selectionEnd ?? text.length;
                                    const nextText = text.slice(0, start) + token + text.slice(end);
                                    setRow({ text: nextText });
                                    setAuxFieldMenuIdx(null);
                                    // Restore focus + caret after the inserted token
                                    requestAnimationFrame(() => {
                                      const el = auxInputRefs.current[i];
                                      if (el) {
                                        el.focus();
                                        const pos = start + token.length;
                                        el.setSelectionRange(pos, pos);
                                      }
                                    });
                                  }}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </details>

          {/* Flags */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] select-none py-1">
              Flags
            </summary>
            <div className="flex flex-col gap-2 pt-1 pl-2">
              <label className="flex items-center gap-1.5 text-[var(--color-text)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCableAccessory}
                  onChange={(e) => {
                    setIsCableAccessory(e.target.checked);
                    if (!e.target.checked) setIntegratedWithCable(false);
                  }}
                  className="cursor-pointer"
                />
                Cable accessory
              </label>
              {isCableAccessory && (
                <label className="flex items-center gap-1.5 text-[var(--color-text)] cursor-pointer select-none ml-4">
                  <input
                    type="checkbox"
                    checked={integratedWithCable}
                    onChange={(e) => setIntegratedWithCable(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Integrated with cable
                </label>
              )}
              {deviceType === "adapter" && (
                <label className="flex items-center gap-1.5 text-[var(--color-text)] select-none">
                  <span className="text-[var(--color-text-muted)]">Visibility:</span>
                  <select
                    value={adapterVisibility}
                    onChange={(e) => setAdapterVisibility(e.target.value as "default" | "force-show" | "force-hide")}
                    className="text-xs border border-[var(--color-border)] rounded px-1.5 py-0.5 bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="force-show">Always Show</option>
                    <option value="force-hide">Always Hide</option>
                  </select>
                </label>
              )}
              <label className="flex items-center gap-1.5 text-[var(--color-text)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVenueProvided}
                  onChange={(e) => setIsVenueProvided(e.target.checked)}
                  className="cursor-pointer"
                />
                Venue provided (exclude from pack list)
              </label>
            </div>
          </details>
          </div>
          </DeviceEditorSection>
          </>
          )}
        </div>
    </FloatingPanel>
      {showFacePlateEditor && node && (
        <FacePlateEditor
          nodeId={editingNodeId!}
          deviceData={node.data as DeviceData}
          onSave={(layout: FacePlateLayout) => {
            patchDeviceData(editingNodeId!, { facePlateLayout: layout });
            setShowFacePlateEditor(false);
          }}
          onClose={() => setShowFacePlateEditor(false)}
        />
      )}
      {showSyncDialog && drift && editingNodeId && (
        <TemplateSyncDialog
          deviceId={editingNodeId}
          device={node.data}
          template={drift.template}
          edges={edges}
          onConfirm={() => {
            syncDeviceFromTemplate(editingNodeId);
            setShowSyncDialog(false);
          }}
          onCancel={() => setShowSyncDialog(false)}
        />
      )}
      {applyRackPrompt && (
        <ApplyRackMetadataDialog
          prompt={applyRackPrompt}
          onApplyAll={() => finishSave(true)}
          onThisDeviceOnly={() => finishSave(false)}
          onCancel={() => {
            setApplyRackPrompt(null);
            pendingSaveRef.current = null;
            pendingApplyMetaRef.current = null;
          }}
        />
      )}
    </>
  );
}

function DeviceEditorSection({
  sectionId,
  title,
  hint,
  defaultOpen,
  children,
}: {
  sectionId: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const sectionTint: Record<string, SectionTint> = {
    "mount-tower": "sky",
    "device-details": "slate",
    ports: "sand",
    "rack-power-more": "sage",
  };

  return (
    <CollapsibleModuleSection
      title={title}
      hint={hint}
      defaultOpen={defaultOpen}
      persistKey={`device-editor:${sectionId}`}
      tint={sectionTint[sectionId]}
    >
      {children}
    </CollapsibleModuleSection>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function BulkAddForm({
  direction,
  onBulkAdd,
  onClose,
}: {
  direction: PortDirection;
  onBulkAdd: (direction: PortDirection, prefix: string, start: number, count: number, signalType: SignalType, section: string) => void;
  onClose: () => void;
}) {
  const [prefix, setPrefix] = useState("Input");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(8);
  const [signalType, setSignalType] = useState<SignalType>("sdi");
  const [section, setSection] = useState("");

  const handleSubmit = () => {
    const count = end - start + 1;
    if (count < 1 || !prefix.trim()) return;
    onBulkAdd(direction, prefix.trim(), start, count, signalType, section.trim());
    onClose();
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2 space-y-2 mb-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <input
          className="w-20 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Prefix"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-[var(--color-text-muted)]">from</span>
          <input
            type="number"
            className="w-12 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
            value={start}
            onChange={(e) => setStart(parseInt(e.target.value) || 1)}
            min={0}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-[var(--color-text-muted)]">to</span>
          <input
            type="number"
            className="w-12 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
            value={end}
            onChange={(e) => setEnd(parseInt(e.target.value) || 1)}
            min={start}
            max={999}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <select
          className="bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded px-1 py-1 text-xs outline-none focus:border-blue-500 cursor-pointer"
          value={signalType}
          onChange={(e) => setSignalType(e.target.value as SignalType)}
        >
          {ALL_SIGNAL_TYPES.map((t) => (
            <option key={t} value={t}>{SIGNAL_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[var(--color-text-muted)]">Section:</span>
        <input
          className="flex-1 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="(optional)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button
          onClick={handleSubmit}
          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Add
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1 text-xs rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <div className="text-[10px] text-[var(--color-text-muted)]">
        Preview: {prefix} {start}, {prefix} {start + 1}, ... {prefix} {end}
      </div>
    </div>
  );
}

function PortVisibilitySection({
  showAllPorts,
  setShowAllPorts,
  hiddenPorts: _hiddenPorts,
  setHiddenPorts,
  ports,
  node,
  nodes,
  templateHiddenSignals,
  setTemplateHiddenSignals,
}: {
  showAllPorts: boolean;
  setShowAllPorts: (v: boolean) => void;
  hiddenPorts: string[];
  setHiddenPorts: React.Dispatch<React.SetStateAction<string[]>>;
  ports: PortDraft[];
  node: DeviceNode | undefined;
  nodes: import("../types").SchematicNode[];
  templateHiddenSignals: Record<string, SignalType[]>;
  setTemplateHiddenSignals: (templateId: string, hidden: SignalType[]) => void;
}) {
  const templateId = node?.data.templateId;
  const modelLabel = node?.data.model;

  // Signal types present across all devices with this templateId
  const templateSignalTypes = useMemo(() => {
    if (!templateId) return [];
    const types = new Set<SignalType>();
    for (const n of nodes) {
      if (n.type !== "device") continue;
      if ((n.data as DeviceData).templateId !== templateId) continue;
      for (const p of (n.data as DeviceData).ports) types.add(p.signalType);
    }
    return [...types].sort() as SignalType[];
  }, [nodes, templateId]);

  const tplHidden = templateId ? (templateHiddenSignals[templateId] ?? []) : [];

  const namedPorts = ports.filter((p) => p.label.trim());

  return (
    <CollapsibleModuleSection
      title="Port visibility"
      depth={1}
      tint="sand"
      persistKey="device-editor:ports:visibility"
    >
      <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllPorts}
              onChange={(e) => setShowAllPorts(e.target.checked)}
              className="w-3 h-3 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs text-[var(--color-text)]">Show all ports (override filters)</span>
          </label>

          {namedPorts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-[var(--color-text-muted)]">Quick:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHiddenPorts([])}
                    className="text-[9px] text-blue-600 hover:text-blue-500 cursor-pointer"
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => setHiddenPorts(namedPorts.map((p) => p.id))}
                    className="text-[9px] text-blue-600 hover:text-blue-500 cursor-pointer"
                  >
                    Hide All
                  </button>
                </div>
              </div>
            </div>
          )}

          {templateId && templateSignalTypes.length > 0 && (
            <div>
              <div className="text-[9px] text-[var(--color-text-muted)] mb-1">
                Hide on all &ldquo;{modelLabel || "this template"}&rdquo; devices:
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {templateSignalTypes.map((st) => (
                  <label key={st} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!tplHidden.includes(st)}
                      onChange={() => {
                        const next = tplHidden.includes(st)
                          ? tplHidden.filter((s) => s !== st)
                          : [...tplHidden, st];
                        setTemplateHiddenSignals(templateId, next);
                      }}
                      className="w-3 h-3 accent-blue-500 cursor-pointer"
                    />
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: SIGNAL_COLORS[st] }}
                    />
                    <span className="text-[10px] text-[var(--color-text)]">{SIGNAL_LABELS[st]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
      </div>
    </CollapsibleModuleSection>
  );
}

function PortSection({
  title,
  direction,
  deviceType,
  ports,
  onAdd,
  onBulkAdd,
  onRemove,
  onUpdate,
  draggedPortId,
  setDraggedPortId,
  dropTarget,
  setDropTarget,
  onDragEnd,
  hiddenPorts,
  setHiddenPorts,
}: {
  title: string;
  direction: PortDirection;
  deviceType: string;
  ports: PortDraft[];
  onAdd: () => void;
  onBulkAdd: (direction: PortDirection, prefix: string, start: number, count: number, signalType: SignalType, section: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PortDraft>) => void;
  draggedPortId: string | null;
  setDraggedPortId: (id: string | null) => void;
  dropTarget: { direction: PortDirection; index: number } | null;
  setDropTarget: (target: { direction: PortDirection; index: number } | null) => void;
  onDragEnd: () => void;
  hiddenPorts: string[];
  setHiddenPorts: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const handleSectionDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (ports.length === 0) {
      setDropTarget({ direction, index: 0 });
    }
  };

  const handleSectionDrop = (e: DragEvent) => {
    e.preventDefault();
    onDragEnd();
  };

  const handleSectionDragLeave = (e: DragEvent) => {
    if (sectionRef.current && !sectionRef.current.contains(e.relatedTarget as Node)) {
      if (dropTarget?.direction === direction) {
        setDropTarget(null);
      }
    }
  };

  const showDropIndicator = dropTarget?.direction === direction;

  // Group ports by section for visual grouping in editor
  const groups: { section: string | undefined; ports: PortDraft[] }[] = [];
  for (const port of ports) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.section === port.section) {
      lastGroup.ports.push(port);
    } else {
      groups.push({ section: port.section, ports: [port] });
    }
  }

  // Track running index across groups for drop targeting
  let runningIndex = 0;

  return (
    <CollapsibleModuleSection
      title={title}
      depth={1}
      tint="sand"
      persistKey={`device-editor:ports:${direction}`}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className="text-[10px] text-blue-600 hover:text-blue-500 cursor-pointer"
          >
            + Bulk Add
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="text-[10px] text-blue-600 hover:text-blue-500 cursor-pointer"
          >
            + Add
          </button>
        </>
      }
    >
    <div
      ref={sectionRef}
      onDragOver={handleSectionDragOver}
      onDrop={handleSectionDrop}
      onDragLeave={handleSectionDragLeave}
    >

      {showBulkAdd && (
        <BulkAddForm
          direction={direction}
          onBulkAdd={onBulkAdd}
          onClose={() => setShowBulkAdd(false)}
        />
      )}

      {ports.length === 0 && !showDropIndicator && (
        <div className="text-[10px] text-[var(--color-text-muted)] italic px-1 py-2">
          No {title.toLowerCase()} — click &quot;+ Add&quot; or drag a port here
        </div>
      )}
      {ports.length === 0 && showDropIndicator && (
        <div className="h-1 bg-blue-500 rounded-full my-1" />
      )}

      <div className="space-y-0">
        {groups.map((group, gi) => {
          const startIndex = runningIndex;
          runningIndex += group.ports.length;

          return (
            <div key={gi}>
              {group.section && (
                <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-surface)] px-1.5 py-0.5 mt-1 mb-0.5 rounded border-b border-[var(--color-border)]/30">
                  {group.section}
                </div>
              )}
              {group.ports.map((port, i) => (
                <PortRow
                  key={port.id}
                  port={port}
                  index={startIndex + i}
                  direction={direction}
                  deviceType={deviceType}
                  onRemove={() => onRemove(port.id)}
                  onUpdate={(u) => onUpdate(port.id, u)}
                  isDragging={draggedPortId === port.id}
                  setDraggedPortId={setDraggedPortId}
                  dropTarget={dropTarget}
                  setDropTarget={setDropTarget}
                  onDragEnd={onDragEnd}
                  isLast={startIndex + i === ports.length - 1}
                  isHidden={hiddenPorts.includes(port.id)}
                  onToggleVisibility={() => {
                    setHiddenPorts((prev) =>
                      prev.includes(port.id)
                        ? prev.filter((id) => id !== port.id)
                        : [...prev, port.id]
                    );
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
    </CollapsibleModuleSection>
  );
}

function PortRow({
  port,
  index,
  direction,
  deviceType,
  onRemove,
  onUpdate,
  isDragging,
  setDraggedPortId,
  dropTarget,
  setDropTarget,
  onDragEnd,
  isLast,
  isHidden,
  onToggleVisibility,
}: {
  port: PortDraft;
  index: number;
  direction: PortDirection;
  deviceType: string;
  onRemove: () => void;
  onUpdate: (updates: Partial<PortDraft>) => void;
  isDragging: boolean;
  setDraggedPortId: (id: string | null) => void;
  dropTarget: { direction: PortDirection; index: number } | null;
  setDropTarget: (target: { direction: PortDirection; index: number } | null) => void;
  onDragEnd: () => void;
  isLast: boolean;
  isHidden: boolean;
  onToggleVisibility: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showSection, setShowSection] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showRf, setShowRf] = useState(Boolean(port.rf && Object.keys(port.rf).length > 0));
  const [showDbPinout, setShowDbPinout] = useState(
    Boolean(
      port.dbPinout?.length || port.rearDbPinout?.length || port.frontDbPinout?.length,
    ),
  );
  const [showSerial, setShowSerial] = useState(Boolean(port.serial && Object.keys(port.serial).length > 0));

  type DbPinoutField = "dbPinout" | "rearDbPinout" | "frontDbPinout";
  type DbFace = {
    id: string;
    sectionLabel: string;
    connector: string;
    pinout?: DbPinAssignment[];
    field: DbPinoutField;
  };

  const dbFaces = useMemo((): DbFace[] => {
    const faces: DbFace[] = [];
    if (direction !== "passthrough") {
      const ct = port.connectorType ?? DEFAULT_CONNECTOR[port.signalType];
      if (DB_PINOUT_CONNECTORS.has(ct)) {
        faces.push({
          id: "primary",
          sectionLabel: "DB pinout",
          connector: ct,
          pinout: port.dbPinout,
          field: "dbPinout",
        });
      }
      return faces;
    }
    if (port.rearConnectorType && DB_PINOUT_CONNECTORS.has(port.rearConnectorType)) {
      faces.push({
        id: "rear",
        sectionLabel: "Rear DB pinout",
        connector: port.rearConnectorType,
        pinout: port.rearDbPinout,
        field: "rearDbPinout",
      });
    }
    if (port.frontConnectorType && DB_PINOUT_CONNECTORS.has(port.frontConnectorType)) {
      faces.push({
        id: "front",
        sectionLabel: "Front DB pinout",
        connector: port.frontConnectorType,
        pinout: port.frontDbPinout,
        field: "frontDbPinout",
      });
    }
    return faces;
  }, [
    direction,
    port.connectorType,
    port.signalType,
    port.rearConnectorType,
    port.frontConnectorType,
    port.dbPinout,
    port.rearDbPinout,
    port.frontDbPinout,
  ]);

  const isDbConnector = dbFaces.length > 0;
  const dbPinCount = dbFaces.reduce((n, f) => n + (f.pinout?.length ?? 0), 0);
  const isRfMetadataSignal = RF_METADATA_SIGNAL_TYPES.has(port.signalType);
  const isSerialSignal = SERIAL_SIGNAL_TYPES.has(port.signalType);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(MIME, port.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedPortId(port.id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;
    setDropTarget({ direction, index: insertIndex });
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd();
  };

  const showIndicatorBefore =
    dropTarget?.direction === direction && dropTarget.index === index;
  const showIndicatorAfter =
    isLast && dropTarget?.direction === direction && dropTarget.index === index + 1;

  const hasActiveOptional =
    port.isMulticable ||
    port.multiConnect ||
    port.directAttach ||
    port.section ||
    port.notes ||
    (port.rf && Object.keys(port.rf).length > 0) ||
    showDbPinout ||
    dbPinCount > 0 ||
    (port.serial && Object.keys(port.serial).length > 0) ||
    port.flipped ||
    isDbConnector;

  return (
    <>
      {showIndicatorBefore && (
        <div className="h-0.5 bg-blue-500 rounded-full my-0.5" />
      )}
      <div
        ref={rowRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`group py-0.5 ${
          isDragging ? "opacity-30" : ""
        } ${isHidden ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
        {/* Drag handle */}
        <span
          draggable
          onDragStart={handleDragStart}
          onDragEnd={() => {
            setDraggedPortId(null);
            setDropTarget(null);
          }}
          className="text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing text-[10px] select-none shrink-0"
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Eye toggle for port visibility */}
        <button
          onClick={onToggleVisibility}
          className="shrink-0 cursor-pointer transition-colors"
          title={isHidden ? "Show port on schematic" : "Hide port on schematic"}
        >
          {isHidden ? (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2l12 12" />
              <path d="M6.5 6.5a2 2 0 0 0 2.8 2.8" />
              <path d="M4.2 4.2C3 5.1 2 6.4 2 8c1.3 3 3.5 5 6 5 1.2 0 2.3-.4 3.3-1.2M13.4 11.4C14.6 10.4 15.3 9.2 16 8c-1.3-3-3.5-5-6-5-.7 0-1.4.1-2 .4" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--color-text)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8c1.3-3 3.5-5 6-5s4.7 2 6 5c-1.3 3-3.5 5-6 5S3.3 11 2 8z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )}
        </button>

        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: SIGNAL_COLORS[port.signalType] }}
        />

        <input
          className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500"
          value={port.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Port label"
          onKeyDown={(e) => e.stopPropagation()}
        />

        {direction === "passthrough" ? (
          <select
            className="shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer"
            value={port.inheritsSignal ? "" : port.signalType}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onUpdate({ signalType: "custom", inheritsSignal: true });
              } else {
                onUpdate({ signalType: v as SignalType, inheritsSignal: undefined });
              }
            }}
          >
            <option value="">(inherits from connection)</option>
            {ALL_SIGNAL_TYPES.map((t) => (
              <option key={t} value={t}>{SIGNAL_LABELS[t]}</option>
            ))}
          </select>
        ) : (
          <select
            className="shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer"
            value={port.signalType}
            onChange={(e) => {
              const newSignal = e.target.value as SignalType;
              onUpdate({
                signalType: newSignal,
                connectorType: DEFAULT_CONNECTOR[newSignal],
              });
            }}
          >
            {ALL_SIGNAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {SIGNAL_LABELS[t]}
              </option>
            ))}
          </select>
        )}

        {direction !== "passthrough" && (
          <select
            className="shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-1 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer max-w-[80px]"
            value={port.connectorType ?? DEFAULT_CONNECTOR[port.signalType]}
            onChange={(e) => {
              const ct = e.target.value as ConnectorType;
              onUpdate({ connectorType: ct });
              if (DB_PINOUT_CONNECTORS.has(ct)) {
                setShowDbPinout(true);
              }
            }}
            title="Connector type"
          >
            {CONNECTOR_GROUP_ENTRIES.map(([groupName, types]) => (
              <optgroup key={groupName} label={groupName}>
                {types.map((c) => (
                  <option key={c} value={c}>
                    {CONNECTOR_LABELS[c]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* Connector gender — only shown for connectors where M/F genuinely varies */}
        {direction !== "passthrough" && (() => {
          const ct = port.connectorType ?? DEFAULT_CONNECTOR[port.signalType];
          if (!CONNECTORS_WITH_GENDER_VARIATION.has(ct)) return null;
          const resolved = resolvePortGender({
            id: port.id,
            label: port.label,
            signalType: port.signalType,
            direction: port.direction,
            connectorType: ct,
            gender: port.gender,
          });
          const isOverride = port.gender != null;
          return (
            <select
              className={`border border-[var(--color-border)] rounded px-1 py-1 text-[10px] outline-none focus:border-blue-500 cursor-pointer shrink-0 ${
                isOverride
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
              value={port.gender ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onUpdate({ gender: v === "" ? undefined : (v as Gender) });
              }}
              title={`Connector gender${isOverride ? " (overridden)" : ` (auto: ${resolved ?? "—"})`}`}
            >
              <option value="">{resolved ? `${resolved === "male" ? "M" : "F"} (auto)` : "—"}</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          );
        })()}

        <button
          onClick={onRemove}
          className="shrink-0 ml-auto text-red-400/80 hover:text-red-500 text-sm cursor-pointer px-0.5"
          title="Remove port"
        >
          &times;
        </button>
        </div>

        <div
          className={`flex-wrap items-center gap-0.5 pl-8 pt-0.5 ${
            hasActiveOptional ? "flex" : "hidden group-hover:flex"
          }`}
        >
        {/* Multicable trunk toggle */}
        <label
          className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 select-none ${
            port.isMulticable
              ? "bg-purple-100 text-purple-600"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
          title="Multicable trunk port"
        >
          <input
            type="checkbox"
            checked={port.isMulticable ?? false}
            onChange={(e) => onUpdate({ isMulticable: e.target.checked || undefined, channelCount: e.target.checked ? (port.channelCount ?? 0) : undefined })}
            className="hidden"
          />
          {port.isMulticable ? `T${port.channelCount ?? 0}` : "T"}
        </label>

        {port.isMulticable && (
          <input
            type="number"
            min={0}
            className="w-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 shrink-0"
            value={port.channelCount ?? 0}
            onChange={(e) => onUpdate({ channelCount: parseInt(e.target.value) || 0 })}
            title="Channel count"
            onKeyDown={(e) => e.stopPropagation()}
          />
        )}

        {/* Multi-connect toggle */}
        <label
          className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 select-none ${
            port.multiConnect
              ? "bg-amber-100 text-amber-700"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
          title="Multi-connect — port accepts multiple connections (SRT, wireless, custom signals)"
        >
          <input
            type="checkbox"
            checked={port.multiConnect ?? false}
            onChange={(e) => onUpdate({ multiConnect: e.target.checked || undefined })}
            className="hidden"
          />
          M
        </label>

        {/* Direct attach toggle (adapters only) */}
        {deviceType === "adapter" && (
          <label
            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 select-none ${
              port.directAttach
                ? "bg-green-100 text-green-700"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="Direct attach — plugs directly into device, no separate cable"
          >
            <input
              type="checkbox"
              checked={port.directAttach ?? false}
              onChange={(e) => onUpdate({ directAttach: e.target.checked || undefined })}
              className="hidden"
            />
            DA
          </label>
        )}

        {/* Section badge */}
        <button
          onClick={() => setShowSection(!showSection)}
          className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
            port.section
              ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
          title="Set section group"
        >
          {port.section || "§"}
        </button>

        {/* Notes badge */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
            port.notes
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
          title={port.notes || "Add note"}
        >
          {port.notes ? "N" : "N"}
        </button>

        {isRfMetadataSignal && (
          <button
            onClick={() => setShowRf(!showRf)}
            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
              port.rf && Object.keys(port.rf).length > 0
                ? "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="RF / ASI / IF port metadata"
          >
            RF
          </button>
        )}

        {isDbConnector && (
          <button
            onClick={() => setShowDbPinout(!showDbPinout)}
            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
              showDbPinout || port.dbPinout?.length
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-blue-200"
            }`}
            title="DB pin assignments — click to edit pinout table"
          >
            DB{dbPinCount > 0 ? ` (${dbPinCount})` : ""}
          </button>
        )}

        {isSerialSignal && (
          <button
            onClick={() => setShowSerial(!showSerial)}
            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
              port.serial && Object.keys(port.serial).length > 0
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="Serial port configuration"
          >
            SER
          </button>
        )}

        {/* Flip badge */}
        <button
          onClick={() => onUpdate({ flipped: !port.flipped || undefined })}
            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
              port.flipped
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="Flip port to opposite side"
          >
            ⇄
        </button>
        </div>
      </div>

      {showSection && (
        <div className="flex items-center gap-1.5 pl-6 pb-1">
          <span className="text-[9px] text-[var(--color-text-muted)]">Section:</span>
          <input
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
            value={port.section || ""}
            onChange={(e) => onUpdate({ section: e.target.value || undefined })}
            placeholder="e.g. Cameras"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") setShowSection(false);
            }}
            autoFocus
          />
          <button
            onClick={() => setShowSection(false)}
            className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {showNotes && (
        <div className="flex items-center gap-1.5 pl-6 pb-1">
          <span className="text-[9px] text-[var(--color-text-muted)]">Note:</span>
          <input
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
            value={port.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            placeholder="e.g. East wall plate, Drop 3"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") setShowNotes(false);
            }}
            autoFocus
          />
          <button
            onClick={() => setShowNotes(false)}
            className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {showRf && isRfMetadataSignal && (
        <RfPortMetadataEditor
          rf={port.rf}
          onChange={(rf) => onUpdate({ rf })}
        />
      )}

      {showDbPinout &&
        isDbConnector &&
        dbFaces.map((face) => (
          <DbPinoutEditor
            key={face.id}
            pinout={face.pinout}
            connectorType={face.connector}
            sectionLabel={face.sectionLabel}
            onChange={(pinout) => onUpdate({ [face.field]: pinout } as Partial<PortDraft>)}
          />
        ))}

      {showSerial && isSerialSignal && (
        <SerialPortConfigEditor
          serial={port.serial}
          onChange={(serial) => onUpdate({ serial })}
        />
      )}

      {/* Passthrough rear/front connector block */}
      {direction === "passthrough" && (
        <div className="pl-6 pb-1 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="block text-[9px] text-[var(--color-text-muted)] mb-0.5">Rear Connector</span>
            <div className="flex items-center gap-1">
              <select
                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-1 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer"
                value={port.rearConnectorType ?? ""}
                onChange={(e) => {
                  const ct = e.target.value ? (e.target.value as ConnectorType) : undefined;
                  onUpdate({ rearConnectorType: ct });
                  if (ct && DB_PINOUT_CONNECTORS.has(ct)) {
                    setShowDbPinout(true);
                  }
                }}
                title="Rear connector type"
              >
                <option value="">(unset)</option>
                {CONNECTOR_GROUP_ENTRIES.map(([groupName, types]) => (
                  <optgroup key={groupName} label={groupName}>
                    {types.map((c) => (
                      <option key={c} value={c}>{CONNECTOR_LABELS[c]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {port.rearConnectorType && CONNECTORS_WITH_GENDER_VARIATION.has(port.rearConnectorType) && (
                <select
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-1 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer shrink-0"
                  value={port.rearGender ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate({ rearGender: v === "" ? undefined : (v as Gender) });
                  }}
                  title="Rear gender"
                >
                  <option value="">—</option>
                  <option value="male">M</option>
                  <option value="female">F</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <span className="block text-[9px] text-[var(--color-text-muted)] mb-0.5">Front Connector</span>
            <div className="flex items-center gap-1">
              <select
                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-1 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer"
                value={port.frontConnectorType ?? ""}
                onChange={(e) => {
                  const ct = e.target.value ? (e.target.value as ConnectorType) : undefined;
                  onUpdate({ frontConnectorType: ct });
                  if (ct && DB_PINOUT_CONNECTORS.has(ct)) {
                    setShowDbPinout(true);
                  }
                }}
                title="Front connector type"
              >
                <option value="">(unset)</option>
                {CONNECTOR_GROUP_ENTRIES.map(([groupName, types]) => (
                  <optgroup key={groupName} label={groupName}>
                    {types.map((c) => (
                      <option key={c} value={c}>{CONNECTOR_LABELS[c]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {port.frontConnectorType && CONNECTORS_WITH_GENDER_VARIATION.has(port.frontConnectorType) && (
                <select
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-1 text-[10px] text-[var(--color-text-heading)] outline-none focus:border-blue-500 cursor-pointer shrink-0"
                  value={port.frontGender ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate({ frontGender: v === "" ? undefined : (v as Gender) });
                  }}
                  title="Front gender"
                >
                  <option value="">—</option>
                  <option value="male">M</option>
                  <option value="female">F</option>
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Config (collapsible, only for addressable network signal types) */}
      {NETWORK_SIGNAL_TYPES.has(port.signalType) && (
        <>
          <label className="pl-6 flex items-center gap-1 text-[9px] text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={port.addressable !== false}
              onChange={(e) => onUpdate({ addressable: e.target.checked ? undefined : false })}
              className="cursor-pointer"
            />
            Addressable (has IP)
          </label>
          {port.addressable !== false && (
            <PortNetworkSection
              config={port.networkConfig}
              onChange={(nc) => onUpdate({ networkConfig: nc })}
              portId={port.id}
              poeDrawW={port.poeDrawW}
              onPoeDrawChange={(v) => onUpdate({ poeDrawW: v })}
              linkSpeed={port.linkSpeed}
              onLinkSpeedChange={(v) => onUpdate({ linkSpeed: v })}
            />
          )}
        </>
      )}

      {/* Capabilities (collapsible, only for video signal types) */}
      {VIDEO_SIGNAL_TYPES.has(port.signalType) && (
        <PortCapabilitiesSection
          capabilities={port.capabilities}
          onChange={(caps) => onUpdate({ capabilities: caps })}
        />
      )}

      {showIndicatorAfter && (
        <div className="h-0.5 bg-blue-500 rounded-full my-0.5" />
      )}
    </>
  );
}

const LINK_SPEED_OPTIONS = ["", "100M", "1G", "2.5G", "5G", "10G", "25G", "40G", "100G"];

function PortNetworkSection({
  config,
  onChange,
  portId,
  poeDrawW,
  onPoeDrawChange,
  linkSpeed,
  onLinkSpeedChange,
}: {
  config?: PortNetworkConfig;
  onChange: (config: PortNetworkConfig) => void;
  portId: string;
  poeDrawW?: number;
  onPoeDrawChange: (v: number | undefined) => void;
  linkSpeed?: string;
  onLinkSpeedChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = config ?? {};
  const hasData = c.ip || c.subnetMask || c.gateway || c.vlan || c.dhcp;

  // Duplicate IP detection
  const nodes = useSchematicStore((s) => s.nodes);
  const editingNodeId = useSchematicStore((s) => s.editingNodeId);
  const duplicateWarning = useMemo(() => {
    const ip = c.ip?.trim();
    if (!ip) return undefined;
    const dupes = findDuplicateIps(nodes);
    const entries = dupes.get(ip);
    if (!entries) return undefined;
    const others = entries.filter((e) => !(e.nodeId === editingNodeId && e.portId === portId));
    if (others.length === 0) return undefined;
    return `Duplicate IP — also used by: ${others.map((e) => `${e.deviceLabel} (${e.portLabel})`).join(", ")}`;
  }, [nodes, c.ip, editingNodeId, portId]);

  const vlanInvalid = c.vlan != null && !isValidVlan(c.vlan);

  return (
    <div className="pl-6 mb-0.5">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[9px] cursor-pointer transition-colors ${
          hasData ? "text-blue-600" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        {open ? "▾" : "▸"} Network{hasData ? " (configured)" : ""}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          <label className="flex items-center gap-1 col-span-2 text-[9px] text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={c.dhcp ?? false}
              onChange={(e) => onChange({ ...c, dhcp: e.target.checked })}
              className="cursor-pointer"
            />
            DHCP
          </label>
          <IpInput
            value={c.ip ?? ""}
            onChange={(v) => {
              const update: typeof c = { ...c, ip: v || undefined };
              if (v && isValidIpv4(v) && !c.subnetMask) update.subnetMask = "255.255.255.0";
              onChange(update);
            }}
            placeholder="IP Address"
            disabled={c.dhcp}
            duplicateWarning={duplicateWarning}
          />
          <IpInput
            value={c.subnetMask ?? ""}
            onChange={(v) => onChange({ ...c, subnetMask: v || undefined })}
            placeholder="Subnet Mask"
            disabled={c.dhcp}
            validate={isValidSubnetMask}
          />
          <IpInput
            value={c.gateway ?? ""}
            onChange={(v) => onChange({ ...c, gateway: v || undefined })}
            placeholder="Gateway"
            disabled={c.dhcp}
          />
          <input
            className={`bg-[var(--color-surface)] border rounded px-1 py-0.5 text-[10px] outline-none ${
              vlanInvalid ? "border-red-400" : "border-[var(--color-border)] focus:border-blue-500"
            }`}
            type="number"
            value={c.vlan ?? ""}
            onChange={(e) => onChange({ ...c, vlan: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="VLAN"
            title={vlanInvalid ? "VLAN must be 1-4094" : undefined}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <select
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500 cursor-pointer"
            value={linkSpeed ?? ""}
            onChange={(e) => onLinkSpeedChange(e.target.value || undefined)}
          >
            {LINK_SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || "Speed"}</option>
            ))}
          </select>
          <input
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500"
            type="number"
            value={poeDrawW ?? ""}
            onChange={(e) => onPoeDrawChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="PoE (W)"
            min={0}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function DhcpServerSection({
  dhcpServer,
  onChange,
}: {
  dhcpServer: DhcpServerConfig | undefined;
  onChange: (cfg: DhcpServerConfig | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = dhcpServer ?? { enabled: false };
  const enabled = cfg.enabled;

  const startInvalid = cfg.rangeStart ? !isValidIpv4(cfg.rangeStart) : false;
  const endInvalid = cfg.rangeEnd ? !isValidIpv4(cfg.rangeEnd) : false;
  const maskInvalid = cfg.subnetMask ? !isValidSubnetMask(cfg.subnetMask) : false;
  const gatewayInvalid = cfg.gateway ? !isValidIpv4(cfg.gateway) : false;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange({ ...cfg, enabled: true });
    } else {
      onChange({ ...cfg, enabled: false });
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
          enabled
            ? "text-blue-600 hover:text-blue-500"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>DHCP Server{enabled ? " (active)" : ""}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-3 h-3 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs text-[var(--color-text)]">This device serves DHCP on its network</span>
          </label>
          {enabled && (
            <div className="grid grid-cols-2 gap-1">
              <div>
                <IpInput
                  value={cfg.rangeStart ?? ""}
                  onChange={(v) => onChange({ ...cfg, rangeStart: v || undefined })}
                  placeholder="Pool Start"
                />
                {startInvalid && (
                  <div className="text-[9px] text-red-500 mt-0.5">Invalid IP</div>
                )}
              </div>
              <div>
                <IpInput
                  value={cfg.rangeEnd ?? ""}
                  onChange={(v) => onChange({ ...cfg, rangeEnd: v || undefined })}
                  placeholder="Pool End"
                />
                {endInvalid && (
                  <div className="text-[9px] text-red-500 mt-0.5">Invalid IP</div>
                )}
              </div>
              <div>
                <IpInput
                  value={cfg.subnetMask ?? ""}
                  onChange={(v) => onChange({ ...cfg, subnetMask: v || undefined })}
                  placeholder="Subnet Mask"
                  validate={isValidSubnetMask}
                />
                {maskInvalid && (
                  <div className="text-[9px] text-red-500 mt-0.5">Invalid mask</div>
                )}
              </div>
              <div>
                <IpInput
                  value={cfg.gateway ?? ""}
                  onChange={(v) => onChange({ ...cfg, gateway: v || undefined })}
                  placeholder="Gateway"
                />
                {gatewayInvalid && (
                  <div className="text-[9px] text-red-500 mt-0.5">Invalid IP</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotEditSection({
  nodeId,
  installedSlots,
  slotDefs,
}: {
  nodeId: string;
  installedSlots: NonNullable<DeviceData["slots"]>;
  slotDefs: SlotDefinition[];
}) {
  const swapCard = useSchematicStore((s) => s.swapCard);
  const addSlot = useSchematicStore((s) => s.addSlot);
  const updateSlot = useSchematicStore((s) => s.updateSlot);
  const removeSlot = useSchematicStore((s) => s.removeSlot);
  const edges = useSchematicStore((s) => s.edges);
  const customTemplates = useSchematicStore((s) => s.customTemplates);

  const [creatingCardForSlot, setCreatingCardForSlot] = useState<string | null>(null);

  const knownFamilies = useMemo(
    () => [
      ...new Set([
        ...getBundledTemplates().map((t) => t.slotFamily),
        ...customTemplates.map((t) => t.slotFamily),
      ].filter((f): f is string => !!f)),
    ],
    [customTemplates],
  );

  const creatingSlot = creatingCardForSlot ? installedSlots.find((s) => s.slotId === creatingCardForSlot) : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
          Expansion Slots{installedSlots.length > 0 ? ` (${installedSlots.filter((s) => !s.parentSlotId).length})` : ""}
        </div>
        <button
          type="button"
          onClick={() => addSlot(nodeId, { label: `Slot ${installedSlots.filter((s) => !s.parentSlotId).length + 1}`, slotFamily: "" })}
          className="text-[10px] text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add Slot
        </button>
      </div>
      {installedSlots.length === 0 && (
        <div className="text-[10px] text-[var(--color-text-muted)] italic">
          No expansion slots. Add a slot for devices with modular card bays.
        </div>
      )}
      <datalist id={`slot-families-${nodeId}`}>
        {knownFamilies.map((f) => <option key={f} value={f} />)}
      </datalist>
      {installedSlots.map((slot) => {
        // Use slotFamily from the slot itself (works for both top-level and nested)
        const family = slot.slotFamily ?? slotDefs.find((d) => d.id === slot.slotId)?.slotFamily;
        const familyCards = family ? getCardsByFamily(family, customTemplates) : [];
        const isNested = !!slot.parentSlotId;

        // Count connections to this slot's ports (including descendant ports for parent slots)
        const descendantPortIds = isNested ? [] : installedSlots
          .filter((s) => s.parentSlotId?.startsWith(slot.slotId))
          .flatMap((s) => s.portIds);
        const allPortIds = new Set([...slot.portIds, ...descendantPortIds]);
        const connCount = edges.filter((e) => {
          if (e.source === nodeId && allPortIds.has(e.sourceHandle ?? "")) return true;
          if (e.target === nodeId && allPortIds.has(e.targetHandle ?? "")) return true;
          if (e.source === nodeId && allPortIds.has((e.sourceHandle ?? "").replace(/-(in|out|rear|front)$/, ""))) return true;
          if (e.target === nodeId && allPortIds.has((e.targetHandle ?? "").replace(/-(in|out|rear|front)$/, ""))) return true;
          return false;
        }).length;

        return (
          <div
            key={slot.slotId}
            className={`bg-[var(--color-surface)] rounded px-2 py-1.5 border border-[var(--color-border)] ${isNested ? "ml-3 border-dashed" : ""}`}
          >
            {isNested ? (
              <div className="text-[10px] text-[var(--color-text-muted)] mb-1">{slot.label}</div>
            ) : (
              <div className="flex items-center gap-1 mb-1">
                <input
                  value={slot.label}
                  onChange={(e) => updateSlot(nodeId, slot.slotId, { label: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Slot label"
                  className="flex-1 min-w-0 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-500"
                />
                <input
                  value={slot.slotFamily ?? ""}
                  onChange={(e) => updateSlot(nodeId, slot.slotId, { slotFamily: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  list={`slot-families-${nodeId}`}
                  placeholder="family"
                  className="w-24 bg-[var(--color-surface)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const warnConn = connCount > 0 ? `This slot has ${connCount} connection(s) that will be disconnected. ` : "";
                      const warnCard = slot.cardTemplateId ? "The installed card and its ports will be removed. " : "";
                      if (warnConn || warnCard) {
                        const ok = await confirmDialog({
                          title: "Remove slot",
                          message: `${warnConn}${warnCard}Remove slot “${slot.label}”?`,
                          tone: "danger",
                          confirmLabel: "Remove",
                        });
                        if (!ok) return;
                      }
                      removeSlot(nodeId, slot.slotId);
                    })();
                  }}
                  className="text-red-400 hover:text-red-500 text-xs cursor-pointer px-1 leading-none"
                  title="Remove slot"
                >
                  &times;
                </button>
              </div>
            )}
            <select
              value={slot.cardTemplateId ?? ""}
              onChange={(e) => {
                void (async () => {
                  const newCardId = e.target.value || null;
                  if (newCardId === slot.cardTemplateId) return;
                  if (connCount > 0) {
                    const ok = await confirmDialog({
                      title: "Swap card",
                      message: `Swapping this card will disconnect ${connCount} connection(s). Continue?`,
                      confirmLabel: "Continue",
                    });
                    if (!ok) return;
                  }
                  swapCard(nodeId, slot.slotId, newCardId);
                })();
              }}
              disabled={!isNested && !slot.slotFamily}
              className="w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">{!isNested && !slot.slotFamily ? "(set slot family to enable)" : "(empty)"}</option>
              {familyCards.map((card) => (
                <option key={card.id} value={card.id!}>
                  {card.label}
                </option>
              ))}
            </select>
            {slot.cardLabel && (
              <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                {[slot.cardManufacturer, slot.cardModelNumber].filter(Boolean).join(" ")}
              </div>
            )}
            {!isNested && (
              <button
                type="button"
                onClick={() => setCreatingCardForSlot(slot.slotId)}
                className="text-[10px] text-blue-500 hover:text-blue-600 cursor-pointer mt-1"
              >
                + Create custom card...
              </button>
            )}
          </div>
        );
      })}
      {creatingSlot && (
        <CardCreatorDialog
          open
          initialFamily={creatingSlot.slotFamily ?? ""}
          familySuggestions={knownFamilies}
          onClose={() => setCreatingCardForSlot(null)}
          onCreated={(cardId, finalFamily) => {
            // If the slot's family was empty or differs, update it so swapCard resolves the card correctly.
            if ((creatingSlot.slotFamily ?? "") !== finalFamily) {
              updateSlot(nodeId, creatingSlot.slotId, { slotFamily: finalFamily });
            }
            swapCard(nodeId, creatingSlot.slotId, cardId);
            setCreatingCardForSlot(null);
          }}
        />
      )}
    </div>
  );
}

function PortCapabilitiesSection({
  capabilities,
  onChange,
}: {
  capabilities?: PortCapabilities;
  onChange: (caps: PortCapabilities) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = capabilities ?? {};
  const hasData = c.maxResolution || c.maxFrameRate || c.maxBitDepth;

  return (
    <div className="pl-6 mb-0.5">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[9px] cursor-pointer transition-colors ${
          hasData ? "text-blue-600" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        {open ? "▾" : "▸"} Capabilities{hasData ? " (set)" : ""}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          <input
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500"
            value={c.maxResolution ?? ""}
            onChange={(e) => onChange({ ...c, maxResolution: e.target.value || undefined })}
            placeholder="Max Resolution (e.g. 3840x2160)"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500"
            type="number"
            value={c.maxFrameRate ?? ""}
            onChange={(e) => onChange({ ...c, maxFrameRate: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Max FPS"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500"
            type="number"
            value={c.maxBitDepth ?? ""}
            onChange={(e) => onChange({ ...c, maxBitDepth: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Bit Depth"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500"
            value={c.colorSpaces?.join(", ") ?? ""}
            onChange={(e) => onChange({ ...c, colorSpaces: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : undefined })}
            placeholder="Color Spaces (comma sep)"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
