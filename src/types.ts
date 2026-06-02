import type { Node, Edge } from "@xyflow/react";
import type { FillOrderSummary } from "./rackFillCatalog";

export type ConnectorType =
  | "bnc" | "hdmi" | "displayport" | "vga"
  | "xlr-3" | "xlr-4" | "xlr-5" | "trs-quarter" | "trs-eighth" | "combo-xlr-trs"
  | "rj45" | "ethercon" | "sfp" | "lc" | "sc"
  | "usb-a" | "usb-b" | "usb-c"
  | "db7w2" | "db9" | "db15" | "db25" | "din-5" | "phoenix" | "terminal-block" | "powercon" | "edison" | "iec" | "iec-c5" | "iec-c7" | "iec-c15" | "iec-c20"
  | "speakon" | "socapex" | "multipin" | "rca" | "toslink" | "barrel"
  | "banana" | "binding-post" | "binding-post-banana" | "dvi" | "mini-xlr" | "opticalcon"
  | "l5-20" | "l6-20" | "l6-30" | "l21-30" | "cam-lok" | "powercon-true1"
  | "qsfp" | "qsfp28" | "mpo" | "digilink" | "pcie-6pin"
  | "mini-din-4" | "mini-din-7" | "mini-din-8"
  | "mini-hdmi" | "mini-displayport"
  | "rj11" | "rj12" | "usb-mini" | "usb-micro" | "trs-2.5mm"
  | "reverse-tnc" | "tnc" | "n-connector" | "sma" | "db37" | "db50"
  | "waveguide-flange" | "intercom-2wire" | "intercom-4wire"
  | "d-tap" | "v-mount" | "f-connector"
  | "lemo-2pin" | "lemo-4pin" | "lemo-5pin"
  | "wireless"
  | "solder-cup" | "punch-down-110" | "punch-down-66" | "krone-idc" | "d-hole-insert"
  | "none" | "other";

export interface PortNetworkConfig {
  ip?: string;
  subnetMask?: string;
  gateway?: string;
  vlan?: number;
  dhcp?: boolean;
}

export interface DhcpServerConfig {
  enabled: boolean;
  rangeStart?: string;   // e.g. "192.168.1.100"
  rangeEnd?: string;     // e.g. "192.168.1.200"
  subnetMask?: string;   // e.g. "255.255.255.0"
  gateway?: string;      // e.g. "192.168.1.1"
}

export interface PortCapabilities {
  maxResolution?: string;
  maxFrameRate?: number;
  maxBitDepth?: number;
  colorSpaces?: string[];
}

export interface PortActiveConfig {
  resolution?: string;
  frameRate?: number;
  bitDepth?: number;
  colorSpace?: string;
}

export type SignalType =
  | "sdi"
  | "hdmi"
  | "ndi"
  | "dante"
  | "avb"
  | "analog-audio"
  | "speaker-level"
  | "bluetooth"
  | "aes"
  | "dmx"
  | "madi"
  | "usb"
  | "ethernet"
  | "fiber"
  | "displayport"
  | "hdbaset"
  | "srt"
  | "genlock"
  | "gpio"
  | "contact-closure"
  | "rs422"
  | "serial"
  | "thunderbolt"
  | "composite"
  | "s-video"
  | "vga"
  | "dvi"
  | "power"
  | "power-l1"
  | "power-l2"
  | "power-l3"
  | "power-neutral"
  | "power-ground"
  | "midi"
  | "tally"
  | "spdif"
  | "adat"
  | "ultranet"
  | "aes50"
  | "stageconnect"
  | "wordclock"
  | "aes67"
  | "ydif"
  | "rf"
  | "asi"
  | "if"
  | "intercom"
  | "st2110"
  | "artnet"
  | "sacn"
  | "ir"
  | "timecode"
  | "gigaace"
  | "dx5"
  | "slink"
  | "soundgrid"
  | "fibreace"
  | "dsnake"
  | "dxlink"
  | "gps"
  | "dars"
  | "rtmp"
  | "rtsp"
  | "mpeg-ts"
  | "component-video"
  | "digilink"
  | "ebus"
  | "control-voltage"
  | "control-50pin"
  | "extron-exp"
  | "pots"
  | "blu-link"
  | "cresnet"
  | "sensor"
  | "custom";

export type LineStyle = "solid" | "dashed" | "dotted" | "dash-dot";

export const LINE_STYLE_LABELS: Record<LineStyle, string> = {
  solid: "Solid",
  dashed: "Dashed",
  dotted: "Dotted",
  "dash-dot": "Dash-Dot",
};

export const LINE_STYLE_DASHARRAY: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: "8 4",
  dotted: "2 4",
  "dash-dot": "8 4 2 4",
};

export type PortDirection = "input" | "output" | "bidirectional" | "passthrough";

export type Gender = "male" | "female";

/** RF carrier polarization — aligned with trackIT EsRfPolarization. */
export type RfPolarization = "horizontal" | "vertical" | "lhcp" | "rhcp" | "slant" | "other";

export type RfModulation =
  | "qpsk"
  | "16qam"
  | "64qam"
  | "256qam"
  | "fm"
  | "am"
  | "ofdm"
  | "other";

export type OduMountType = "direct_hub" | "pole_mount";

/** Tower / antenna feedline category (coax, waveguide, network, PoE). */
export type TowerDeviceFeedType = "coax" | "waveguide" | "network" | "network_poe";

export type RfPathMedium = "coax_lmr400" | "coax_rigid" | "waveguide" | "jumper";

/** FCC / ITU station identifier and emission summary. */
export interface RfLicensedMetadata {
  callSign?: string;
  emissionDesignator?: string;
  channelLabel?: string;
}

/** Microwave / STL link parameters (edge or port scope). */
export interface RfLinkMetadata {
  dataRateMbps?: number;
  modulation?: RfModulation | string;
  bandwidthMhz?: number;
  licensed?: RfLicensedMetadata;
}

/** RF port metadata for broadcast/transmission paths (band, power, VSWR). */
export interface RfPortMetadata {
  band?: string;
  centerFrequencyMhz?: number;
  txFrequencyMhz?: number;
  rxFrequencyMhz?: number;
  bandwidthMhz?: number;
  polarization?: RfPolarization;
  txPowerDbm?: number;
  vswr?: number;
  licensed?: RfLicensedMetadata;
}

/** Antenna / tower installation metadata on RF-capable devices. */
export interface RfInstallationMetadata {
  azimuthDeg?: number;
  tiltDeg?: number;
  beamwidthDeg?: number;
  oduMount?: OduMountType;
  feedType?: TowerDeviceFeedType;
}

export interface DbPinAssignment {
  pin: number | string;
  label: string;
  signal?: string;
}

export interface SerialPortConfig {
  protocol?: "rs232" | "rs422" | "rs485";
  baudRate?: number;
  dataBits?: 7 | 8;
  parity?: "none" | "even" | "odd";
  stopBits?: 1 | 2;
  flowControl?: "none" | "rts_cts" | "xon_xoff";
}

export interface SiteNetworkMetadata {
  managementIp?: string;
  subnetMask?: string;
  gateway?: string;
  vlanSummary?: string;
}

/** TX/RX/bidirectional role for RF connection line styling and visibility. */
export type RfPathRole = "tx" | "rx" | "bidirectional";

export interface Port {
  id: string;
  label: string;
  signalType: SignalType;
  direction: PortDirection;
  /** When true, this port's effective signal type is inherited from the connected edge at
   *  runtime (via effectiveSignalType). Used for passthrough ports where the signal is not
   *  fixed at design time. signalType is stored as "custom" as a placeholder. */
  inheritsSignal?: boolean;
  section?: string;
  connectorType?: ConnectorType;
  /** Connector gender override. Omit to derive from connector + direction convention. */
  gender?: Gender;
  /** For passthrough ports: rear-face connector type (the field-termination side). */
  rearConnectorType?: ConnectorType;
  /** For passthrough ports: rear-face gender override. */
  rearGender?: Gender;
  /** For passthrough ports: front-face connector type (the patch side). */
  frontConnectorType?: ConnectorType;
  /** For passthrough ports: front-face gender override. */
  frontGender?: Gender;
  /** ID of another passthrough port in the same device that this port is normalled to. */
  normalledTo?: string;
  /** Normalling type. Only meaningful when normalledTo is set. */
  normalling?: "full" | "half" | "none";
  capabilities?: PortCapabilities;
  networkConfig?: PortNetworkConfig;
  addressable?: boolean;
  activeConfig?: PortActiveConfig;
  isMulticable?: boolean;
  channelCount?: number;
  /** When true, this port accepts multiple connections (e.g. SRT receiver, wireless mic RX, custom logical signals). */
  multiConnect?: boolean;
  /** When true, this port attaches directly to the connected device (no separate cable needed in pack list) */
  directAttach?: boolean;
  /** When true, port renders on the opposite side of the device (input on right, output on left) */
  flipped?: boolean;
  notes?: string;
  /** PoE power draw in watts for this port (consumed when powered by switch) */
  poeDrawW?: number;
  /** Link speed for network ports */
  linkSpeed?: string;
  /** Stable link back to the template port this was cloned from — used for template-sync reconciliation. */
  templatePortId?: string;
  /** RF transmission metadata when signalType is rf, if, or asi. */
  rf?: RfPortMetadata;
  /** DB breakout pin assignments when connectorType is db9/db25/db37/db50. */
  dbPinout?: DbPinAssignment[];
  /** Passthrough: rear-face HD50/DB pinout (field side). */
  rearDbPinout?: DbPinAssignment[];
  /** Passthrough: front-face DB pinout (patch side). */
  frontDbPinout?: DbPinAssignment[];
  /** Serial port configuration when signalType is serial or rs422. */
  serial?: SerialPortConfig;
}

export interface SlotDefinition {
  id: string;
  label: string;               // "Slot 1", "VFC Slot A"
  slotFamily: string;           // e.g. "disguise-vfc", "yamaha-my"
  defaultCardId?: string;       // pre-populated when placed on canvas
  /** When true, an empty instance of this slot is hidden on the canvas node.
   *  Default false — preserves the existing "(empty)" rendering for active expansion slots.
   *  Set true on storage-media slots (SD card bays etc.) where empty rows would be visual noise. */
  hideWhenEmpty?: boolean;
}

export interface InstalledSlot {
  slotId: string;
  label: string;
  slotFamily?: string;          // denormalized for UI card lookup (especially nested slots)
  parentSlotId?: string;        // links to parent slot for nested cards (e.g. SFP in a network module)
  cardTemplateId?: string;      // undefined = empty slot
  cardLabel?: string;           // denormalized for display/pack list
  cardManufacturer?: string;
  cardModelNumber?: string;
  cardUnitCost?: number;
  /** Denormalized from SlotDefinition.hideWhenEmpty so the canvas renderer doesn't have
   *  to walk the template tree on every paint. */
  hideWhenEmpty?: boolean;
  portIds: string[];            // tracks which ports in device.ports belong to this slot
}

export interface DeviceData {
  [key: string]: unknown;
  label: string;
  /** Short alternative name (e.g. "HDC-5500" instead of "Sony HDC-5500 Studio Camera").
   *  Initialized from template.shortName at placement; editable per-instance. */
  shortName?: string;
  /** Per-instance override for using shortName on this device.
   *  undefined = inherit SchematicFile.useShortNames (which itself defaults false). */
  useShortName?: boolean;
  /** Per-instance override for wrapping the device label across multiple lines.
   *  undefined = inherit SchematicFile.wrapDeviceLabels. */
  wrapLabel?: boolean;
  hostname?: string;
  deviceType: string;
  ports: Port[];
  color?: string;
  /** Custom header background color (#9) */
  headerColor?: string;
  /** Original template label — present while device participates in auto-numbering.
   *  Cleared when the user gives the device a custom name. */
  baseLabel?: string;
  /** Permanent template identity — what the device *is* (e.g. "BMD SDI→HDMI").
   *  Never cleared on rename. Used for pack list grouping. */
  model?: string;
  templateId?: string;
  templateVersion?: number;
  manufacturer?: string;
  modelNumber?: string;
  /** Manufacturer spec sheet / product page URL — inherited from the source template but editable per-device */
  referenceUrl?: string;
  /** Device category (e.g. "video", "audio") — meaningful for custom templates and community submissions */
  category?: string;
  showAllPorts?: boolean;
  hiddenPorts?: string[];
  dhcpServer?: DhcpServerConfig;
  isCableAccessory?: boolean;
  integratedWithCable?: boolean;
  slots?: InstalledSlot[];
  powerDrawW?: number;
  powerCapacityW?: number;
  voltage?: string;
  /** Thermal load in BTU/h for HVAC sizing; auto-derived from powerDrawW × 3.412 if omitted */
  thermalBtuh?: number;
  /** PoE budget in watts (for network switches — power this device *supplies* over PoE) */
  poeBudgetW?: number;
  /** PoE draw in watts (power this device *consumes* over PoE, e.g. a camera or AP) */
  poeDrawW?: number;
  /** Unit cost in dollars (optional, for BOM/quoting) */
  unitCost?: number;
  isVenueProvided?: boolean;
  /** Physical height in millimeters — reserved for future rack management */
  heightMm?: number;
  /** Physical width in millimeters — reserved for future rack management */
  widthMm?: number;
  /** Physical depth in millimeters — reserved for future rack management */
  depthMm?: number;
  /** Device weight in kilograms — reserved for future rack management */
  weightKg?: number;
  /** Authoritative rack occupancy in whole U (1–60). Takes precedence over heightMm heuristics. */
  rackHeightU?: number;
  /** How this device mounts in a rack elevation. */
  mountingClass?: import("./rackMount").MountingClass;
  /** Whether rack U / mounting came from library, user entry, or port-count estimate. */
  rackMetadataSource?: import("./rackMount").RackMetadataSource;
  /** Optional rack-form override — when set, bypasses the size heuristic in `inferRackForm`.
   *  Use for edge cases (e.g., desktop unit with optional rack ears, oddly-sized half-rack gear). */
  rackForm?: "full" | "half" | "shelf-only";
  /** Facility designation on drawing (e.g. DSK-01B, TC-03 DA C) — distinct from marketing `label`. */
  designation?: string;
  /** Rack / location code (e.g. RK CB03, TH-03). */
  rackLocation?: string;
  /** Frame and slot text (e.g. FRAME 1 SLOT 3/4). */
  frameSlot?: string;
  /** Device type code for housename (DA, RSW, FS, …). */
  deviceTypeCode?: string;
  /** Primary management IP when not inferred from ports. */
  managementIp?: string;
  /** VLAN summary for header display (e.g. "VLAN 10, 20"). */
  vlanSummary?: string;
  /** Per-instance override for installation block under device name. */
  showInstallationBlock?: boolean;
  /** Adapter visibility override — only meaningful for deviceType "adapter" */
  adapterVisibility?: "default" | "force-show" | "force-hide";
  /** User-customizable auxiliary data rows. Each row carries its own slot (header vs
   *  footer) and text; blank text entries within a slot render as separator gaps. */
  auxiliaryData?: AuxRow[];
  /** Search terms used to find this device in the library; editable per-placement so
   *  improved terms can ride the "save as template" submission flow. */
  searchTerms?: string[];
  /** Custom face-plate connector layout (overrides auto-layout) */
  facePlateLayout?: FacePlateLayout;
  /** Antenna azimuth/tilt/beamwidth for tower stack drawings. */
  rfInstallation?: RfInstallationMetadata;
  /** Parabolic dish diameter in metres (microwave-dish instances). */
  dishDiameterM?: number;
}

/** One row of auxiliary data shown on a device node. */
export interface AuxRow {
  /** Display text — may contain `{{token}}` placeholders (e.g. `{{modelNumber}}`). */
  text: string;
  /** Whether the row renders above the ports (header) or below them (footer).
   *  Defaults to "footer" when omitted. */
  position?: "header" | "footer";
}

export interface FacePlateLayout {
  positions: Record<string, { x: number; y: number }>;
  labels?: FacePlateLabel[];
  /** Custom device label position and size (defaults to top-center) */
  deviceLabel?: { x: number; y: number; fontSize?: number };
  /** Override which rack face (front/rear) a port is drawn on. Passthrough ports ignore this. */
  panelAssignments?: Record<string, "front" | "rear">;
}

export interface FacePlateLabel {
  id: string;
  text: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  /** Optional label text size in editor face-plate units. */
  fontSize?: number;
}

export type DeviceNode = Node<DeviceData, "device">;

export interface RoomData {
  [key: string]: unknown;
  label: string;
  color?: string;
  borderColor?: string;
  borderStyle?: "dashed" | "solid" | "dotted";
  labelSize?: number;
  locked?: boolean;
  isEquipmentRack?: boolean;
  linkedRackPageId?: string;
  linkedRackId?: string;
}

export type RoomNode = Node<RoomData, "room">;

export interface NoteData {
  [key: string]: unknown;
  /** HTML content from contentEditable */
  html: string;
  /** CAD SVG wireframe — view-only until unlocked (Insert / CAD toolbar). */
  cadLocked?: boolean;
  cadWireframe?: boolean;
}

export type NoteNode = Node<NoteData, "note">;

export interface AnnotationData {
  [key: string]: unknown;
  /** Shape type for the annotation (#24) */
  shape:
    | "rectangle"
    | "ellipse"
    | "circle"
    | "diamond"
    | "triangle"
    | "hline"
    | "vline"
    | "dline"
    | "frame-dashed"
    | "dimension"
    | "north-arrow"
    | "scale-bar"
    | "leader";
  /** Fill color */
  color?: string;
  /** Border color */
  borderColor?: string;
  /** Optional text label */
  label?: string;
  /** Font size for the label in px */
  fontSize?: number;
}

export type AnnotationNode = Node<AnnotationData, "annotation">;

export interface StubLabelData {
  [key: string]: unknown;
  /** Signal type — controls border color, matches the linked connection */
  signalType: SignalType;
  /** Shared with the partner stub node + both stub-leg edges. Identifies one logical cable. */
  linkedConnectionId: string;
  /** Which end of the logical connection this stub represents */
  side: "source" | "target";
  /** When true, append [PortName] to the label text (per-stub override; falls back to global setting) */
  showPort?: boolean;
  /** When true, append (RoomName) to the label text (per-stub override; falls back to global setting) */
  showRoom?: boolean;
  /** When/whether to append page number (per-stub override; falls back to global setting) */
  pageMode?: StubLabelPageMode;
  /** True once one-shot auto-placement has aligned this stub with its port. Skips the
   *  align-Y / clear-overlap pass on every subsequent mount so user-dragged positions
   *  survive page refresh. New stubs from convertEdgeToStubs get auto-placed once and
   *  flipped to true; legacy stubs are flipped true wholesale by the v33→v34 migration. */
  placed?: boolean;
}

export type StubLabelNode = Node<StubLabelData, "stub-label">;

export type FlyDirection = "in" | "out";

/** Cross-drawing fly-in / fly-off endpoint (references remote plant_drawings.dwg_number). */
export interface FlyEndpointData {
  [key: string]: unknown;
  direction: FlyDirection;
  signalType: SignalType;
  /** Local housename (e.g. TC-03 DA C). */
  designation: string;
  /** Port / IN/OUT notation (e.g. OUT 3). */
  notation: string;
  /** Remote sheet index — trackIT dwg_number. */
  remoteDwgNumber: string;
  remoteDrawingId?: string;
  remoteDesignation?: string;
  remoteNotation?: string;
  deviceNodeId?: string;
  portId?: string;
  cableId?: string;
  pairedFlyId?: string;
  placed?: boolean;
}

export type FlyEndpointNode = Node<FlyEndpointData, "fly-endpoint">;

export interface WaypointData {
  [key: string]: unknown;
  /** The connection edge this waypoint belongs to. */
  edgeId: string;
  /** Position within the edge's manualWaypoints array. */
  index: number;
}

export type WaypointNode = Node<WaypointData, "waypoint">;

export type SchematicNode = DeviceNode | RoomNode | NoteNode | AnnotationNode | StubLabelNode | FlyEndpointNode | WaypointNode;

export interface ConnectionData {
  [key: string]: unknown;
  signalType: SignalType;
  manualWaypoints?: { x: number; y: number }[];
  /** When true, manualWaypoints were auto-generated from A* route and can be overwritten on re-route */
  autoRouteWaypoints?: boolean;
  connectorMismatch?: boolean;
  cableId?: string;
  cableLength?: string;
  multicableLabel?: string;
  /** User-defined label displayed on the connection line (#5) */
  label?: string;
  /** Per-end label at the source side. Overrides `label` at the source endpoint. (#114) */
  sourceLabel?: string;
  /** Per-end label at the target side. Overrides `label` at the target endpoint. (#114) */
  targetLabel?: string;
  /** When set, this edge is one half of a logical cable that has been split into two
   *  stub-leg edges connected via stub-label nodes. Both halves share the same id. */
  linkedConnectionId?: string;
  /** @deprecated v31+: stubs are real nodes now. Kept on the type so the v30→v31 migration can read it. */
  stubbed?: boolean;
  /** @deprecated v31+: replaced by StubLabelNode position. */
  stubSourceEnd?: { x: number; y: number };
  /** @deprecated v31+: replaced by StubLabelNode position. */
  stubTargetEnd?: { x: number; y: number };
  /** @deprecated v31+: migrated to the source-leg edge's manualWaypoints. */
  stubSourceWaypoints?: { x: number; y: number }[];
  /** @deprecated v31+: migrated to the target-leg edge's manualWaypoints. */
  stubTargetWaypoints?: { x: number; y: number }[];
  /** Allow connection between incompatible connector types (#6) */
  allowIncompatible?: boolean;
  /** @deprecated Use hideCableId instead. Migrated in schema v25. */
  hideLabel?: boolean;
  /** Per-edge: hide cable ID label (#61) */
  hideCableId?: boolean;
  /** Per-edge: cable ID endpoint spacing override in pixels (#61) */
  cableIdGap?: number;
  /** Per-edge: cable ID midpoint offset along path in pixels (#61) */
  cableIdMidOffset?: number;
  /** Per-edge: cable ID label display mode override (#61) */
  cableIdLabelMode?: "endpoint" | "midpoint";
  /** @deprecated v31+: moved to StubLabelData.showPort. */
  stubLabelShowPort?: boolean;
  /** @deprecated v31+: moved to StubLabelData.pageMode. */
  stubLabelPageMode?: StubLabelPageMode;
  /** Edge represents a direct physical attachment, not a separate cable */
  directAttach?: boolean;
  /** Visual line style — solid (default), dashed, dotted, or dash-dot */
  lineStyle?: LineStyle;
  /** RF path role — drives default line style and visibility toggles for tower drawings. */
  rfPathRole?: RfPathRole;
  /** Physical medium for RF/tower path-loss annotations. */
  rfPathMedium?: RfPathMedium;
  /** Microwave STL / licensed link parameters. */
  rfLink?: RfLinkMetadata;
  /** Comms backhaul role when signal is ethernet/fiber. */
  pathRole?: "comms_backhaul";
  /** Per-connection color override (CSS color). Falls back to signal-type color. Ignored for direct-attach. */
  color?: string;
}

export type ConnectionEdge = Edge<ConnectionData>;

export interface DeviceTemplate {
  id?: string;
  version?: number;
  deviceType: string;
  category?: string;
  label: string;
  /** Optional short name (e.g. model number without manufacturer prefix). When the
   *  schematic's "use short names" setting is on, this is shown instead of label. */
  shortName?: string;
  hostname?: string;
  ports: Port[];
  color?: string;
  searchTerms?: string[];
  manufacturer?: string;
  modelNumber?: string;
  imageUrl?: string;
  referenceUrl?: string;
  slots?: SlotDefinition[];
  slotFamily?: string;           // only set on expansion card templates
  powerDrawW?: number;           // Max power consumption in watts
  powerCapacityW?: number;       // Total supply capacity in watts (distros only)
  voltage?: string;              // Informational: "100-240V", "208V", "120V"
  thermalBtuh?: number;          // Thermal load in BTU/h for HVAC sizing; auto-derived from powerDrawW × 3.412 if omitted
  isVenueProvided?: boolean;     // Venue-owned gear — excluded from pack list
  poeBudgetW?: number;           // PoE budget in watts (switches/PSEs supplying PoE)
  poeDrawW?: number;             // PoE draw in watts (PDs consuming PoE — cameras, APs, etc.)
  unitCost?: number;             // MSRP / default unit cost in dollars
  heightMm?: number;             // Physical height in millimeters
  widthMm?: number;              // Physical width in millimeters
  depthMm?: number;              // Physical depth in millimeters
  weightKg?: number;             // Device weight in kilograms
  rackHeightU?: number;
  mountingClass?: import("./rackMount").MountingClass;
  rackMetadataSource?: import("./rackMount").RackMetadataSource;
  rackForm?: "full" | "half" | "shelf-only"; // Optional override for the size-based rack-form heuristic
  /** Preset for patch/VJF face-plate layout generation. */
  panelLayoutPreset?: "vjf-2x32" | "patch-1u-24";
  auxiliaryData?: AuxRow[];      // Aux rows shown on the node (each row carries its own header/footer slot)
  facePlateLayout?: FacePlateLayout; // Custom face-plate connector positions
  rfInstallation?: RfInstallationMetadata;
  /** Parabolic dish diameter in metres (microwave-dish templates). */
  dishDiameterM?: number;
}

export interface CustomTemplateGroup {
  id: string;
  label: string;
  collapsed?: boolean;
}

export interface CustomTemplateMeta {
  groups: CustomTemplateGroup[];
  order: string[];                          // template key (id ?? deviceType) in display order
  groupAssignments: Record<string, string>; // template key -> groupId
}

export interface TemplatePreset {
  ports: Port[];
  hiddenPorts?: string[];
  color?: string;
}

export interface OwnedGearItem {
  template: DeviceTemplate;
  quantity: number;
}

export interface OwnedGearFile {
  version: 1;
  ownedGear: OwnedGearItem[];
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface TitleBlock {
  showName: string;
  venue: string;
  designer: string;
  engineer: string;
  date: string;
  drawingTitle: string;
  company: string;
  revision: string;
  logo: string;
  customFields: CustomField[];
}

export type CellContentType = "field" | "static" | "logo" | "pageNumber";

export interface TitleBlockCell {
  id: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  content:
    | { type: "field"; field: string }
    | { type: "static"; text: string }
    | { type: "logo" }
    | { type: "pageNumber" };
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontFamily: "sans-serif" | "serif" | "monospace";
  align: "left" | "center" | "right";
  color: string;
}

export interface TitleBlockLayout {
  columns: number[];
  rows: number[];
  cells: TitleBlockCell[];
  widthIn: number;
  heightIn: number;
}

// ── Rack Builder Types ──────────────────────────────────────────────

export type RackType = "floor-19" | "wall-mount" | "desktop" | "open-2post" | "open-4post";

export const RACK_TYPE_LABELS: Record<RackType, string> = {
  "floor-19": "19\" Floor Standing",
  "wall-mount": "Wall Mount",
  "desktop": "Desktop / Tabletop",
  "open-2post": "Open Frame (2-Post)",
  "open-4post": "Open Frame (4-Post)",
};

export interface RackData {
  id: string;
  label: string;
  rackType: RackType;
  /** Rack height in rack units (e.g. 42, 25, 12) */
  heightU: number;
  /** Rack depth in mm (600, 800, 1000, 1200) */
  depthMm: number;
  /** Width class — 19" standard or half-rack */
  widthClass: "19in" | "half";
  /** Position on the rack page canvas */
  position: { x: number; y: number };
  linkedRoomId?: string;
  /** Short plant/cable code (e.g. RACK07, STR01); auto-filled from label when preset applies. */
  designation?: string;
}

export interface RackDevicePlacement {
  id: string;
  rackId: string;
  /** Links to the device's node ID in the schematic */
  deviceNodeId: string;
  /** Bottom U position (1-based, bottom-up numbering) */
  uPosition: number;
  /** Which face of the rack the device is mounted on */
  face: "front" | "rear";
  /** For half-rack-width devices mounted in a 19" rack */
  halfRackSide?: "left" | "right";
  /** When set, this device sits on the shelf accessory with that ID; uPosition/face are
   *  inherited from the shelf and `halfRackSide` is ignored. */
  mountedOnShelfId?: string;
  /** Only meaningful when mountedOnShelfId is set: device is laid on its side
   *  (90° rotation around the depth axis). Width and height swap when rendered. */
  rotated?: boolean;
  /** Only meaningful when mountedOnShelfId is set: free-form position on the shelf,
   *  in mm. `x` is offset from the shelf's left inner-rail; `y` is height above the
   *  shelf surface (for stacking). Default {x:0, y:0} when undefined. */
  shelfOffsetMm?: { x: number; y: number };
  /** When set, placement was created by a distribution preset (supports replace-on-reapply). */
  distributionPresetId?: string;
  distributionPresetRole?: "jack-field";
}

/** A front + rear pair whose summed depth exceeds the rack's internal depth at overlapping U positions. */
export interface RackDepthConflict {
  aId: string;
  bId: string;
  uOverlapStart: number;
  uOverlapEnd: number;
  depthOverhangMm: number;
}

export type RackAccessoryType = "blank-panel" | "vent-panel" | "shelf" | "drawer" | "cable-manager" | "fan-unit";

export const RACK_ACCESSORY_LABELS: Record<RackAccessoryType, string> = {
  "blank-panel": "Blank Panel",
  "vent-panel": "Vent Panel",
  "shelf": "Shelf",
  "drawer": "Drawer",
  "cable-manager": "Cable Manager",
  "fan-unit": "Fan Unit",
};

export interface RackAccessory {
  id: string;
  rackId: string;
  type: RackAccessoryType;
  uPosition: number;
  heightU: number;
  face: "front" | "rear";
  label?: string;
  /** Usable depth for shelf-mounted gear in mm (only meaningful when type === "shelf").
   *  Defaults to ~60% of rack.depthMm when unset. */
  shelfDepthMm?: number;
  /** When set, item was created by a distribution preset (supports replace-on-reapply). */
  distributionPresetId?: string;
  distributionPresetRole?: "jack-field" | "blank-fill" | "vent-fill";
}

/** Documentation arrow between racks on a facility elevation sheet (not a cable edge). */
export interface RackCrossLink {
  id: string;
  fromRackId: string;
  toRackId: string;
  label: string;
  fromDeviceNodeId?: string;
  toDeviceNodeId?: string;
  /** When set, item was created by a distribution preset (supports replace-on-reapply). */
  distributionPresetId?: string;
  distributionPresetRole?: "eth-trunk" | "fiber-trunk";
}

export interface RackElevationPage {
  id: string;
  label: string;
  type: "rack-elevation";
  racks: RackData[];
  placements: RackDevicePlacement[];
  accessories: RackAccessory[];
  /** Cross-rack callouts (e.g. FIREWALL → ETHERNET PATCH). */
  crossLinks?: RackCrossLink[];
  /** When false, preset-tagged trunk callouts are hidden (manual cross-links still show). */
  showTrunkCallouts?: boolean;
  /** Last rack-fill-order preset summary (procurement BOM). */
  fillOrderSummary?: FillOrderSummary;
}

export type TowerDraftTowerType = "self_support" | "guyed" | "monopole";

/** Horizontal guide at a mount height (ft AGL) on tower draft pages. */
export interface TowerGuideBandFt {
  ftAgl: number;
  label?: string;
  plantLocationId?: string;
}

/** Device/antenna placed at a height on the tower draft elevation. */
export type TowerFace = "N" | "S" | "E" | "W";

export interface TowerDraftPlacement {
  id: string;
  deviceNodeId: string;
  mountHeightFtAgl: number;
  /** Horizontal offset from tower centerline (px). */
  offsetX?: number;
  /** Tower face when viewing N/S/E/W elevation (explicit override). */
  towerFace?: TowerFace;
  /** Flip aimable glyph 180° (dish/horn mount orientation on elevation). */
  mountFlip?: boolean;
  /** trackIT plant_locations.id (antenna_level). */
  plantLocationId?: string;
  cadLayer?: "generated" | "user";
}

export type TowerDraftLineStyle = "solid" | "dashed" | "dotted";

/** Photographic / line-art elevation underlay (trackIT mountaintop reference art). */
export interface TowerElevationReferenceImage {
  url: string;
  detailUrl?: string;
  label?: string;
  opacity?: number;
  align?: "center" | "left";
  fullBleed?: boolean;
  blendMode?: "normal" | "lighten" | "screen" | "multiply";
  contentScale?: number;
  /** Natural width ÷ height of reference art (e.g. Sutro PNG 260÷1080). */
  imageAspectRatio?: number;
}

/** User-drawn polyline segment (tower leg, guy wire, callout line). */
export interface TowerDraftPolyline {
  id: string;
  points: { x: number; y: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: TowerDraftLineStyle;
  cadLayer?: "generated" | "user";
  /** Optional source/target device node ids for generated feedlines. */
  feedlineFromNodeId?: string;
  feedlineToNodeId?: string;
}

/** Structured vertical tower elevation / section draft (ft-AGL axis). */
export interface TowerDraftPage {
  id: string;
  label: string;
  type: "tower-draft";
  towerHeightFtAgl: number;
  towerType?: TowerDraftTowerType;
  guideBandsFt: TowerGuideBandFt[];
  placements: TowerDraftPlacement[];
  polylines: TowerDraftPolyline[];
  /** Profile underlay — preferred over generated lattice polylines. */
  elevationReferenceImage?: TowerElevationReferenceImage;
  labelLayers?: { designation?: boolean; azimuth?: boolean; band?: boolean };
}

export interface PrintViewport {
  id: string;
  kind: "rack-front" | "rack-rear" | "rack-side" | "drawing" | "tower-draft";
  /** Rack elevation page + rack id (rack viewports only). */
  rackRefPageId?: string;
  rackRefId?: string;
  /** Tower draft page id (tower-draft viewports only). */
  towerDraftPageId?: string;
  positionMm: { x: number; y: number };
  sizeMm: { w: number; h: number };
  scale?: number;
  showLabel?: boolean;
  showStats?: boolean;
  /** Optional crop in flow coordinates (drawing viewports). Omit to fit all nodes. */
  drawingRegion?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface PrintSheetPage {
  id: string;
  label: string;
  type: "print-sheet";
  paperId: string;
  orientation: "landscape" | "portrait";
  customWidthIn?: number;
  customHeightIn?: number;
  viewports: PrintViewport[];
  showTitleBlock: boolean;
}

/** Named saved view of the main signal-flow canvas (overview, room, or custom pan/zoom). */
export interface DrawingViewportPreset {
  id: string;
  label: string;
  fit: "all" | "room" | "custom";
  roomNodeId?: string;
  viewport?: { x: number; y: number; zoom: number };
}

/** Tabbed main drawing sheet — own schematic graph plus saved viewports. */
export interface DrawingPage {
  id: string;
  label: string;
  type: "drawing";
  viewports: DrawingViewportPreset[];
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
}

export type SchematicPage = RackElevationPage | PrintSheetPage | TowerDraftPage | DrawingPage;

export interface SchematicFile {
  version: number;
  name: string;
  nodes: SchematicNode[];
  edges: ConnectionEdge[];
  customTemplates?: DeviceTemplate[];
  ownedGear?: OwnedGearItem[];
  signalColors?: Partial<Record<SignalType, string>>;
  signalLineStyles?: Partial<Record<SignalType, LineStyle>>;
  printPaperId?: string;
  printOrientation?: "landscape" | "portrait";
  printScale?: number;
  printCustomWidthIn?: number;
  printCustomHeightIn?: number;
  printOriginOffsetX?: number;
  printOriginOffsetY?: number;
  titleBlock?: TitleBlock;
  titleBlockLayout?: TitleBlockLayout;
  hiddenSignalTypes?: SignalType[];
  hiddenPinSignalTypes?: SignalType[];
  /** Comma-separated rfPathRole values hidden on canvas (tx, rx, bidirectional). */
  hiddenRfPathRoles?: RfPathRole[];
  /** Canvas layers panel — show room/rack container frames (default true). */
  showContainers?: boolean;
  /** Solo one signal type on canvas (dims other edges). */
  sigSolo?: SignalType | string;
  /** Solo one room container (dims nodes outside). */
  roomSolo?: string;
  /** Room node ids hidden via layers panel. */
  hiddenRoomIds?: string[];
  /** Display order for container layers in the left panel. */
  roomLayerOrder?: string[];
  /** Per-room frame opacity (0–1) from layers panel. */
  roomLayerOpacity?: Record<string, number>;
  /** @deprecated Replaced in schema v27 by the {{deviceType}} auxiliary row. Kept on the file
   *  shape so the migration can honor the user's prior suppression intent. */
  hideDeviceTypes?: boolean;
  hideUnconnectedPorts?: boolean;
  /** Show designation, rack, model block on device headers (default true for new files). */
  showInstallationInfo?: boolean;
  showPortCounts?: boolean;
  templateHiddenSignals?: Record<string, SignalType[]>;
  templatePresets?: Record<string, TemplatePreset>;
  favoriteTemplates?: string[];
  // Report layout preferences (pack list PDF, etc.) keyed by report ID
  reportLayouts?: Record<string, unknown>;
  globalReportHeaderLayout?: TitleBlockLayout;
  globalReportFooterLayout?: TitleBlockLayout;
  /** @deprecated Use scrollConfig instead. Kept for backwards compatibility on import. */
  scrollBehavior?: "zoom" | "pan";
  /** Per-modifier scroll wheel action mapping (#19) */
  scrollConfig?: ScrollConfig;
  /** Cable naming scheme for cable schedule (#1) */
  cableNamingScheme?: "sequential" | "type-prefix";
  /** Show line jump arcs where connections cross (#18) */
  showLineJumps?: boolean;
  /** @deprecated Use showCableIdLabels instead. Kept for backwards compatibility. */
  showConnectionLabels?: boolean;
  /** Show cable ID labels at connection endpoints (#61) */
  showCableIdLabels?: boolean;
  /** Show custom labels on connections (#61) */
  showCustomLabels?: boolean;
  /** Cable ID endpoint spacing in pixels (#61) */
  cableIdGap?: number;
  /** Cable ID midpoint offset along path in pixels (#61) */
  cableIdMidOffset?: number;
  /** Cable ID label display mode — at endpoints or midpoint (#61) */
  cableIdLabelMode?: "endpoint" | "midpoint";
  /** Global toggle: when true, all adapters default to hidden on schematic */
  hideAdapters?: boolean;
  /** When false, edges use simple orthogonal L-shapes instead of A* routing */
  autoRoute?: boolean;
  /** Edge interaction hitbox width in pixels (default 10, React Flow default is 20) */
  edgeHitboxSize?: number;
  /** User-preferred device category display order (#62) */
  categoryOrder?: string[];
  /** Show the owned-gear tab in the left library panel */
  showOwnedGearPane?: boolean;
  /** Active tab in the left library panel */
  libraryActiveTab?: "devices" | "owned";
  /** Color key / signal legend for print view (#70) */
  colorKeyEnabled?: boolean;
  colorKeyCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  colorKeyColumns?: number;
  colorKeyPage?: "first" | "last" | "all";
  colorKeyOverrides?: Partial<Record<SignalType, boolean>>;
  /** Rack elevation pages */
  pages?: SchematicPage[];
  /** Saved face-plate layouts keyed by rackDeviceDefinitionKey (template or model). */
  facePlateDefinitionLayouts?: Record<string, FacePlateLayout>;
  /** Rack U / mounting defaults keyed by rackDeviceDefinitionKey. */
  deviceDefinitionRackMetadata?: Record<string, import("./rackMount").RackMetadataPatch>;
  /** Show connector-level face-plate detail in rack views (default off; advanced) */
  showFacePlateDetail?: boolean;
  /** Cable unit costs keyed by "cableType|signalType|cableLength" */
  cableCosts?: Record<string, number>;
  /** Force-case device/port/slot labels on write (normal = leave as-typed) */
  labelCase?: LabelCaseMode;
  /** Pairwise distances between top-level rooms; key is canonical pairKey("idA","idB"). */
  roomDistances?: Record<string, number>;
  /** Unit + slack settings for converting room distance → estimated cable length (#146). */
  distanceSettings?: DistanceSettings;
  /** ISO 4217 currency code for cost display in reports (#158). Defaults to "USD". */
  currency?: string;
  /** Left-drag canvas behavior — select box (default) or pan viewport */
  panMode?: PanMode;
  /** Show the destination port name on stub labels (e.g. "→ Projector [HDMI In 1]") */
  stubLabelShowPort?: boolean;
  /** Show the destination room name on stub labels (e.g. "→ Projector (Room A)") */
  stubLabelShowRoom?: boolean;
  /** When to show "Pg N" on stub labels: always | only when ends are on different pages | never */
  stubLabelPageMode?: StubLabelPageMode;
  /** Render device labels using their shortName when available. Defaults false;
   *  user opt-in via Preferences. */
  useShortNames?: boolean;
  /** Metric (source data) vs imperial display for heights and distances. */
  measurementSystem?: MeasurementSystem;
  /** Wrap long device labels across two lines instead of truncating with ellipsis.
   *  New files default true; undefined on loaded files = legacy single-line truncate. */
  wrapDeviceLabels?: boolean;
  /** Cable number blocks synced from trackIT numbering suggester (write-back). */
  trackItNumbering?: TrackItNumberingState;
  /** Facility locations from trackIT (rack / room autocomplete). */
  trackItLocations?: TrackItLocationSnapshotEntry[];
  /** When opened from trackIT Plant → Drawings, links save target to plant_drawings row. */
  trackItLink?: TrackItLinkContext;
  /** Default licensed station metadata for tower / transmission drawings. */
  siteLicensed?: RfLicensedMetadata;
  /** Site-level management network block (title block / compound). */
  siteNetwork?: SiteNetworkMetadata;
}

/** trackIT plant drawing this schematic belongs to (popup / embed integration). */
export type MeasurementSystem = "metric" | "imperial";

export type TrackItLinkContext = {
  drawingId: string;
  organizationId: string | null;
  dwgNumber: string;
  drawingName?: string;
  /** trackIT plant_drawings.drawing_type — drives CAD toolbar visibility. */
  drawingType?: string;
  /** Display preference pushed from trackIT settings. */
  measurementSystem?: MeasurementSystem;
};

export type TrackItTowerSiteContext = {
  siteCode: string;
  siteName: string;
  towerHeightFt: number;
  measurementSystem?: MeasurementSystem;
  accessNotes?: string;
  towerCompany?: string;
  latitude?: number;
  longitude?: number;
  callSign?: string;
  antennaLevels: {
    id: string;
    code: string;
    name: string;
    mountHeightM?: number;
    sectorLabel?: string;
    azimuthDeg?: number;
  }[];
  rfLinks?: {
    id: string;
    label: string;
    kind: string;
    azimuthDeg: number;
    distanceMi?: number;
    band?: string;
  }[];
  linkedDrawings?: {
    drawingId: string;
    dwgNumber: string;
    title?: string;
    drawingType?: string;
  }[];
  elevationReferenceImage?: TowerElevationReferenceImage;
  elevationViewport?: {
    tallTowerMode: boolean;
    tallTowerThresholdFt?: number;
    defaultViewportSpanFt?: number;
    initialFocusFtAgl?: number;
    workingZoomRatio?: number;
    minPxPerFt?: number;
    guideBandsFt?: { ftAgl: number; label?: string }[];
  };
};

/** Persisted trackIT numbering sync (see trackitBridge.ts). */
export type TrackItNumberBlock = {
  reservationId: string | null;
  start: number;
  end: number;
  blockSize: number;
  offset: number;
  project: string;
  projectCls: string;
  flag?: string;
  status: "reserved" | "allocated" | "released";
  usedNumbers?: number[];
  releasedNumbers?: number[];
  updatedAt: string;
};

export type TrackItNumberingState = {
  organizationId?: string;
  blocks: TrackItNumberBlock[];
  lastEventId?: string;
  lastEventAt?: string;
};

/** plant_locations facility row pushed from trackIT for rack/room matching. */
export type TrackItLocationSnapshotEntry = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  parentId?: string | null;
};

export type LabelCaseMode = "as-typed" | "uppercase" | "lowercase" | "capitalize";
export const DEFAULT_LABEL_CASE: LabelCaseMode = "as-typed";

export type PanMode = "select-first" | "pan-first";
export const DEFAULT_PAN_MODE: PanMode = "select-first";

export type StubLabelPageMode = "always" | "cross-page" | "never";
export const DEFAULT_STUB_LABEL_SHOW_PORT = false;
export const DEFAULT_STUB_LABEL_SHOW_ROOM = true;
export const DEFAULT_STUB_LABEL_PAGE_MODE: StubLabelPageMode = "cross-page";

export interface DistanceSettings {
  unit: "m" | "ft";
  /** Additional slack as a percentage of the room-to-room distance (e.g. 15 = +15%). */
  slackPercent: number;
  /** Additional slack added after percent (same unit as distance). */
  slackFixed: number;
}

export const DEFAULT_DISTANCE_SETTINGS: DistanceSettings = {
  unit: "ft",
  slackPercent: 15,
  slackFixed: 0,
};

export type ScrollAction = "zoom" | "pan-x" | "pan-y";

export interface ScrollConfig {
  /** Scroll wheel with no modifier key */
  scroll: ScrollAction;
  /** Shift + scroll wheel */
  shiftScroll: ScrollAction;
  /** Ctrl + scroll wheel */
  ctrlScroll: ScrollAction;
  /** Zoom speed multiplier (default 1.0, range 0.25–3.0) */
  zoomSpeed: number;
  /** Pan speed multiplier (default 1.0, range 0.25–3.0) */
  panSpeed: number;
  /** Enable automatic trackpad detection (default true) */
  trackpadEnabled: boolean;
}

export const DEFAULT_SCROLL_CONFIG: ScrollConfig = {
  scroll: "zoom",
  shiftScroll: "pan-x",
  ctrlScroll: "pan-y",
  zoomSpeed: 1,
  panSpeed: 1,
  trackpadEnabled: true,
};

export const SIGNAL_COLORS: Record<SignalType, string> = {
  sdi: "var(--color-sdi)",
  hdmi: "var(--color-hdmi)",
  ndi: "var(--color-ndi)",
  dante: "var(--color-dante)",
  avb: "var(--color-avb)",
  "analog-audio": "var(--color-analog-audio)",
  "speaker-level": "var(--color-speaker-level)",
  bluetooth: "var(--color-bluetooth)",
  aes: "var(--color-aes)",
  dmx: "var(--color-dmx)",
  madi: "var(--color-madi)",
  usb: "var(--color-usb)",
  ethernet: "var(--color-ethernet)",
  fiber: "var(--color-fiber)",
  displayport: "var(--color-displayport)",
  hdbaset: "var(--color-hdbaset)",
  srt: "var(--color-srt)",
  genlock: "var(--color-genlock)",
  gpio: "var(--color-gpio)",
  "contact-closure": "var(--color-contact-closure)",
  rs422: "var(--color-rs422)",
  serial: "var(--color-serial)",
  thunderbolt: "var(--color-thunderbolt)",
  composite: "var(--color-composite)",
  "component-video": "var(--color-component-video)",
  "s-video": "var(--color-s-video)",
  vga: "var(--color-vga)",
  dvi: "var(--color-dvi)",
  power: "var(--color-power)",
  "power-l1": "var(--color-power-l1)",
  "power-l2": "var(--color-power-l2)",
  "power-l3": "var(--color-power-l3)",
  "power-neutral": "var(--color-power-neutral)",
  "power-ground": "var(--color-power-ground)",
  midi: "var(--color-midi)",
  tally: "var(--color-tally)",
  spdif: "var(--color-spdif)",
  adat: "var(--color-adat)",
  ultranet: "var(--color-ultranet)",
  aes50: "var(--color-aes50)",
  stageconnect: "var(--color-stageconnect)",
  wordclock: "var(--color-wordclock)",
  aes67: "var(--color-aes67)",
  ydif: "var(--color-ydif)",
  rf: "var(--color-rf)",
  asi: "var(--color-sdi)",
  if: "var(--color-rf)",
  intercom: "var(--color-analog-audio)",
  st2110: "var(--color-st2110)",
  artnet: "var(--color-artnet)",
  sacn: "var(--color-sacn)",
  ir: "var(--color-ir)",
  timecode: "var(--color-timecode)",
  gigaace: "var(--color-gigaace)",
  dx5: "var(--color-dx5)",
  slink: "var(--color-slink)",
  soundgrid: "var(--color-soundgrid)",
  fibreace: "var(--color-fibreace)",
  dsnake: "var(--color-dsnake)",
  dxlink: "var(--color-dxlink)",
  gps: "var(--color-gps)",
  dars: "var(--color-dars)",
  rtmp: "var(--color-rtmp)",
  rtsp: "var(--color-rtsp)",
  "mpeg-ts": "var(--color-mpeg-ts)",
  digilink: "var(--color-digilink)",
  ebus: "var(--color-ebus)",
  "control-voltage": "var(--color-control-voltage)",
  "control-50pin": "var(--color-control-50pin)",
  "extron-exp": "var(--color-extron-exp)",
  pots: "var(--color-pots)",
  "blu-link": "var(--color-blu-link)",
  cresnet: "var(--color-cresnet)",
  sensor: "var(--color-sensor)",
  custom: "var(--color-custom)",
};

export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  bnc: "BNC",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  vga: "VGA (DB15)",
  "xlr-3": "XLR-3",
  "xlr-4": "XLR-4",
  "xlr-5": "XLR-5",
  "trs-quarter": '1/4" TRS',
  "trs-eighth": '3.5mm TRS',
  "combo-xlr-trs": "XLR/TRS Combo",
  rj45: "RJ45",
  ethercon: "EtherCon",
  sfp: "SFP/SFP+",
  lc: "Fiber - LC",
  sc: "Fiber - SC",
  "usb-a": "USB-A",
  "usb-b": "USB-B",
  "usb-c": "USB-C",
  db7w2: "D-Sub 7W2",
  db9: "DB9",
  db15: "DB15",
  db25: "DB25",
  "din-5": "DIN-5",
  phoenix: "Phoenix",
  "terminal-block": "Terminal Block",
  powercon: "powerCON",
  edison: "Edison",
  iec: "IEC C14",
  "iec-c5": "IEC C5",
  "iec-c7": "IEC C7",
  "iec-c15": "IEC C15",
  "iec-c20": "IEC C20",
  speakon: "speakON",
  socapex: "Socapex",
  multipin: "Multi-pin",
  rca: "RCA",
  toslink: "TOSLINK",
  barrel: "DC Barrel",
  banana: "Banana",
  "binding-post": "Binding Post",
  "binding-post-banana": "Binding Post (Banana)",
  dvi: "DVI",
  "mini-din-4": "Mini-DIN 4-pin",
  "mini-din-7": "Mini-DIN 7-pin",
  "mini-din-8": "Mini-DIN 8-pin",
  "mini-hdmi": "Mini HDMI",
  "mini-displayport": "Mini DisplayPort",
  "mini-xlr": "Mini XLR",
  opticalcon: "Fiber - opticalCON",
  "l5-20": "NEMA L5-20",
  "l6-20": "NEMA L6-20",
  "l6-30": "NEMA L6-30",
  "l21-30": "NEMA L21-30",
  "cam-lok": "Cam-Lok",
  "powercon-true1": "powerCON TRUE1",
  rj11: "RJ11",
  rj12: "RJ12",
  qsfp: "QSFP+",
  qsfp28: "QSFP28",
  mpo: "Fiber - MPO/MTP",
  digilink: "DigiLink",
  "pcie-6pin": "PCIe 6-pin Aux",
  "lemo-2pin": "LEMO 2-pin",
  "lemo-4pin": "LEMO 4-pin",
  "lemo-5pin": "LEMO 5-pin",
  "usb-mini": "Mini USB",
  "usb-micro": "Micro USB",
  "trs-2.5mm": "2.5mm TRS",
  "reverse-tnc": "Reverse TNC",
  tnc: "TNC",
  "n-connector": "N-Type",
  sma: "SMA",
  db37: "DB37",
  db50: "DB50 (50-pin)",
  "waveguide-flange": "Waveguide",
  "intercom-2wire": "Intercom 2-wire",
  "intercom-4wire": "Intercom 4-wire",
  "d-tap": "D-Tap",
  "v-mount": "V-Mount",
  "f-connector": "F-Connector",
  wireless: "Wireless",
  "solder-cup": "Solder Cup",
  "punch-down-110": "Punch-down (110)",
  "punch-down-66": "Punch-down (66)",
  "krone-idc": "Krone IDC",
  "d-hole-insert": "D-Hole Insert",
  none: "None",
  other: "Other",
};

/** Which visual side of the device a port appears on (respects flip). */
export function portSide(p: Port): "left" | "right" {
  if (p.direction === "input") return p.flipped ? "right" : "left";
  if (p.direction === "output") return p.flipped ? "left" : "right";
  // bidirectional and passthrough: default left; flipped swaps side
  return p.flipped ? "right" : "left";
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  sdi: "SDI",
  hdmi: "HDMI",
  ndi: "NDI",
  dante: "Dante",
  avb: "AVB",
  "analog-audio": "Analog",
  "speaker-level": "Speaker",
  bluetooth: "Bluetooth",
  aes: "AES",
  dmx: "DMX",
  madi: "MADI",
  usb: "USB",
  ethernet: "Ethernet",
  fiber: "Fiber",
  displayport: "DisplayPort",
  hdbaset: "HDBaseT",
  srt: "SRT",
  genlock: "Genlock",
  gpio: "GPIO",
  "contact-closure": "Contact Closure",
  rs422: "RS-422",
  serial: "Serial",
  thunderbolt: "Thunderbolt",
  composite: "Composite",
  "s-video": "S-Video",
  vga: "VGA",
  dvi: "DVI",
  power: "Power",
  "power-l1": "L1 (Phase A)",
  "power-l2": "L2 (Phase B)",
  "power-l3": "L3 (Phase C)",
  "power-neutral": "Neutral",
  "power-ground": "Ground",
  midi: "MIDI",
  tally: "Tally",
  spdif: "S/PDIF",
  adat: "ADAT",
  ultranet: "Ultranet",
  aes50: "AES50",
  stageconnect: "StageConnect",
  wordclock: "Word Clock",
  aes67: "AES67",
  ydif: "YDIF",
  rf: "RF",
  asi: "ASI",
  if: "IF",
  intercom: "Intercom",
  st2110: "ST 2110",
  artnet: "Art-Net",
  sacn: "sACN",
  ir: "IR",
  timecode: "Timecode",
  gigaace: "GigaACE",
  dx5: "DX5",
  slink: "SLink",
  soundgrid: "SoundGrid",
  fibreace: "fibreACE",
  dsnake: "dSnake",
  dxlink: "DX Link",
  gps: "GPS",
  dars: "DARS",
  rtmp: "RTMP",
  rtsp: "RTSP",
  "mpeg-ts": "MPEG-TS",
  "component-video": "Component Video",
  digilink: "DigiLink",
  ebus: "eBUS",
  "control-voltage": "0-10V Control",
  "control-50pin": "50-Pin Control",
  "extron-exp": "Extron EXP",
  pots: "POTS",
  "blu-link": "BLU link",
  cresnet: "Cresnet",
  sensor: "Sensor",
  custom: "Custom",
};

/** Signal types organized by functional group (for searchable dropdowns) */
export const SIGNAL_GROUPS: Record<string, SignalType[]> = {
  "Video": ["sdi", "hdmi", "displayport", "dvi", "composite", "component-video", "s-video", "vga"],
  "Video over IP": ["ndi", "srt", "hdbaset", "st2110"],
  "Audio": ["analog-audio", "speaker-level", "bluetooth", "aes", "dante", "avb", "aes67", "madi", "spdif", "adat", "ultranet", "aes50", "stageconnect", "ydif", "soundgrid", "gigaace", "dx5", "dsnake", "slink", "fibreace", "digilink", "extron-exp", "pots", "blu-link"],
  "Network": ["ethernet", "fiber"],
  "Control / Data": ["dmx", "artnet", "sacn", "rs422", "serial", "gpio", "contact-closure", "ir", "midi", "tally", "usb", "thunderbolt", "dxlink", "ebus", "control-voltage", "control-50pin", "cresnet", "sensor"],
  "Sync / Clock": ["genlock", "wordclock", "timecode", "dars", "gps"],
  "Power": ["power", "power-l1", "power-l2", "power-l3", "power-neutral", "power-ground"],
  "Streaming": ["rtmp", "rtsp", "mpeg-ts", "asi", "rf", "if"],
  "RF / Tower": ["intercom"],
  "Other": ["custom"],
};

/** Connector types organized by functional group (for searchable dropdowns) */
export const CONNECTOR_GROUPS: Record<string, ConnectorType[]> = {
  "Video": ["bnc", "hdmi", "mini-hdmi", "displayport", "mini-displayport", "dvi", "vga"],
  "Audio": ["xlr-3", "xlr-4", "xlr-5", "mini-xlr", "combo-xlr-trs", "trs-quarter", "trs-eighth", "trs-2.5mm", "rca", "din-5", "mini-din-4", "mini-din-7", "mini-din-8", "toslink"],
  "Network / Data": ["rj45", "ethercon", "sfp", "lc", "sc", "opticalcon", "qsfp", "qsfp28", "mpo", "rj11", "rj12"],
  "USB": ["usb-a", "usb-b", "usb-c", "usb-mini", "usb-micro"],
  "D-Sub / Serial": ["db9", "db15", "db25", "db37", "db50", "db7w2", "lemo-5pin"],
  "Power": ["iec", "iec-c5", "iec-c7", "iec-c15", "iec-c20", "powercon", "powercon-true1", "edison", "barrel", "l5-20", "l6-20", "l6-30", "l21-30", "cam-lok", "socapex", "pcie-6pin", "lemo-2pin", "lemo-4pin", "d-tap", "v-mount"],
  "Speaker": ["speakon", "banana", "binding-post", "binding-post-banana"],
  "Terminal": ["phoenix", "terminal-block", "multipin", "solder-cup", "punch-down-110", "punch-down-66", "krone-idc"],
  "RF": ["reverse-tnc", "tnc", "n-connector", "sma", "f-connector", "bnc", "waveguide-flange"],
  "Intercom": ["intercom-2wire", "intercom-4wire"],
  "Other": ["wireless", "digilink", "d-hole-insert", "none", "other"],
};
