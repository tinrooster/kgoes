import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Nucomm / Cobham UltraScan 2 GHz ENG receive antenna system templates.
 *
 * UltraScan is a motorized dish-and-radome assembly for 2 GHz ENG microwave
 * reception, controlled via a 50-pin cable harness from a site controller
 * (e.g. Troll Systems S750BAS).  RF output goes directly to the MRX receiver.
 *
 * @see https://www.cobham.com/communications-and-connectivity/broadcast-communications/
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-mr-us-0001-0000-4000-8000-000000000001",
    deviceType: "eng-receive-antenna",
    label: "Nucomm UltraScan 2 GHz ENG Receive Antenna",
    shortName: "UltraScan",
    manufacturer: "Nucomm / Cobham",
    modelNumber: "UltraScan",
    referenceUrl:
      "https://www.cobham.com/communications-and-connectivity/broadcast-communications/",

    searchTerms: [
      "Nucomm",
      "Cobham",
      "UltraScan",
      "Ultra Scan",
      "2GHz",
      "2 GHz",
      "ENG receive antenna",
      "BAS antenna",
      "motorized dish",
      "radome",
      "receive site",
      "mountaintop antenna",
      "50 pin control",
      "site controller",
      "kgo-es-deviceadd",
    ],

    mountingClass: "not-rackable",
    rfInstallation: { azimuthDeg: 0, tiltDeg: 0 },

    ports: [
      // 50-pin cable harness to site controller (Troll S750BAS or similar)
      port("50-PIN-CTRL", "control-50pin", "input", "other"),

      // RF output to receiver (MRX4000 or similar)
      port("RF-OUT", "rf", "output", "other"),
    ],

    auxiliaryData: [
      { text: "2 GHz ENG receive dish — motorized azimuth/elevation via 50-pin harness" },
      { text: "RF output: N-connector or DIN 7/16 depending on model; verify on site" },
      { text: "Controlled by Troll Systems S750BAS or equivalent site controller" },
    ],
  },
];
