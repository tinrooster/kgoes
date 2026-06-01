import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Troll Systems device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-ts-0001-0000-4000-8000-000000000001",
    deviceType: "remote-site-controller",
    label: "Troll Systems TouchStar S750",
    shortName: "S750",
    manufacturer: "Troll Systems",
    modelNumber: "S750",
    referenceUrl:
      "https://trollsystems.com/command-and-control/remote-site-control/",
    searchTerms: [
      "Troll Systems",
      "Troll",
      "S750",
      "TouchStar",
      "remote site controller",
      "ENG",
      "antenna controller",
      "broadcast receive site",
      "BAS",
      "microwave receive site", "kgo-es-deviceadd"],
  
    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 304.8,
  
    rackForm: "full",
    rackHeightU: 1,
    color: "#1c1c1c",
  
    ports: [
      port("ETH", "ethernet", "bidirectional", "rj45"),
  
      port("SERIAL-A", "rs422", "bidirectional"),
      port("SERIAL-B", "rs422", "bidirectional"),
  
      port("USB", "ethernet", "bidirectional"),
  
      port("COMM-2W", "analog-audio", "bidirectional"),
      port("COMM-4W", "analog-audio", "bidirectional"),
    ],
  },

  {
    id: "kgo-ts-0002-0000-4000-8000-000000000002",
    deviceType: "remote-site-controller",
    label: "Troll Systems X750 VanLink Controller",
    shortName: "X750",
    manufacturer: "Troll Systems",
    modelNumber: "X750 / V750",
    referenceUrl:
      "https://trollsystems.com/command-and-control/remote-site-control/",
    searchTerms: [
      "Troll Systems",
      "Troll",
      "X750",
      "V750",
      "VanLink",
      "TouchStar",
      "ENG van controller",
      "remote site controller",
      "broadcast",
      "news gathering", "kgo-es-deviceadd"],
  
    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 304.8,
  
    rackForm: "full",
    rackHeightU: 1,
    color: "#1c1c1c",
  
    ports: [
      port("ETH", "ethernet", "bidirectional", "rj45"),
  
      port("SERIAL-A", "rs422", "bidirectional"),
      port("SERIAL-B", "rs422", "bidirectional"),
  
      port("USB", "ethernet", "bidirectional"),
  
      port("COMM-2W", "analog-audio", "bidirectional"),
      port("COMM-4W", "analog-audio", "bidirectional"),
    ],
  },

  {
    id: "kgo-ts-0003-0000-4000-8000-000000000003",
    deviceType: "remote-site-controller",
    label: "Troll Systems S750BAS (Slave / Base Station)",
    shortName: "S750BAS",
    manufacturer: "Troll Systems",
    modelNumber: "S750BAS",
    referenceUrl:
      "https://trollsystems.com/command-and-control/remote-site-control/",
    searchTerms: [
      "Troll Systems",
      "Troll",
      "S750BAS",
      "S750 BAS",
      "S750 Slave",
      "base station",
      "remote site slave",
      "receive site controller",
      "antenna controller",
      "ENG receive site",
      "BAS",
      "kgo-es-deviceadd",
    ],

    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 304.8,

    rackForm: "full",
    rackHeightU: 1,
    color: "#1c1c1c",

    ports: [
      // 50-pin dish control interface → UltraScan / antenna positioner
      port("50-PIN-CTRL", "control-50pin", "output", "other"),

      // Serial ports for receiver LQ link and auxiliary comms
      port("COM-2", "rs422", "output", "db9"),
      port("COM-4", "rs422", "output", "db9"),

      // NavTrack GPS/positioning serial loop
      port("NAVTRACK", "rs422", "output", "db9"),

      // 90 MHz IF input — monitors signal level from MRX receiver's IF output
      port("90MHZ-IN", "if", "input", "other"),

      // Ethernet link to van (X750) over network
      port("X750-ETH", "ethernet", "bidirectional", "rj45"),
    ],
  },
];
