import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Imagine Communications Nexio+ AMP.
 * Source: https://imaginecommunications.com/content/uploads/2026/05/NexioAmp-Datasheet_R1.4.pdf
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-im-0001-0000-4000-8000-000000000001",
    deviceType: "media-server",
    label: "Imagine Nexio+ AMP",
    shortName: "Nexio+ AMP",
    manufacturer: "Imagine Communications",
    modelNumber: "Nexio+ AMP",
    referenceUrl:
      "https://imaginecommunications.com/content/uploads/2026/05/NexioAmp-Datasheet_R1.4.pdf",
    searchTerms: [
      "Imagine",
      "Imagine Communications",
      "Nexio",
      "Nexio+",
      "Nexio+ AMP",
      "AMP",
      "playout",
      "channel origination",
      "HPE Gen11",
      "NexioAmp",
      "kgo-es-deviceadd",
    ],
    heightMm: 88.9,
    widthMm: 482.6,
    ports: [
      port("PSU A", "power", "input"),
      port("PSU B", "power", "input"),
      port("GPU Monitor", "hdmi", "output"),
    ],
    rackForm: "full",
    color: "#1a1a1a",
  },
];
