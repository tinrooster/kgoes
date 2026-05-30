import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Bolin Technology device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-bo-0001-0000-4000-8000-000000000001",
    deviceType: "camera",
    label: "Bolin EXU248F Outdoor Long Range PTZ Camera",
    shortName: "EXU248F",
    manufacturer: "Bolin",
    modelNumber: "EXU248F",
    referenceUrl:
      "https://bolintechnology.com/product/exu248f-outdoor-long-range-professional-ptz-camera",
    searchTerms: [
      "Bolin",
      "EXU248F",
      "EXU248",
      "EX-Ultra",
      "outdoor PTZ",
      "long range PTZ",
      "48x zoom",
      "1 inch sensor",
      "PTZ camera",
      "Sony image block",
      "IP67",
      "kgo-es-deviceadd",
    ],
    weightKg: 10,
    powerDrawW: 85, // max: heater on, fully loaded; min static 35W
    mountingClass: "not-rackable",
    rackMetadataSource: "library",
    color: "dark-gray",
    ports: [
      port("SDI 1 (Clean)", "sdi", "output", "bnc"),
      port("SDI 2 (OSD/PM)", "sdi", "output", "bnc"),
      port("SFP Optical SDI", "sdi", "output", "sfp"),
      port("HDMI", "hdmi", "output", "hdmi"),
      port("LAN / IP Stream / PoE++", "ethernet", "bidirectional", "rj45"),
      port("Genlock", "genlock", "input", "bnc"),
      port("Audio In L", "analog-audio", "input", "mini-xlr"),
      port("Audio In R", "analog-audio", "input", "mini-xlr"),
      port("Audio Out L", "analog-audio", "output", "mini-xlr"),
      port("Audio Out R", "analog-audio", "output", "mini-xlr"),
      port("RS422 Control", "rs422", "bidirectional", "rj45"),
      port("DC 36V / AC 24V In", "power", "input"),
      port("DC 12V Out", "power", "output"),
    ],
    auxiliaryData: [
      { text: "Sensor: Sony 1.0-type Exmor R CMOS (back-illuminated), 14.2MP" },
      { text: "Lens: Zeiss Vario-Sonnar T, 48x zoom @ FHD / 18x zoom @ 4K, F2.8 constant (wide)" },
      { text: "IP stream: FAST HEVC FPGA; H.264/H.265/MJPEG; RTSP, RTMP, RTMPS, SRT, MPEG-TS, ONVIF; dual stream" },
      { text: "Control: VISCA, VISCA over IP, PELCO P/D, ONVIF, FreeD (AR/VR tracking)" },
      { text: "Pan/Tilt: Pan 340° (±170°), Tilt 205° (−35° to +170°); 255 presets" },
      { text: "Op temp: −40°C to +60°C" },
      { text: "Power: DC 36V / AC 24V or PoE++ (IEEE 802.3bt Type 4 Class 8)" },
      { text: "Housing: IP67 weatherproof; C5 corrosion-resistant coating; heater + defroster + hidden wiper" },
      { text: "Swing Ø: Pan Φ400mm, Tilt Φ480mm" },
      { text: "NDAA Section 889 compliant" },
    ],
  },
];
