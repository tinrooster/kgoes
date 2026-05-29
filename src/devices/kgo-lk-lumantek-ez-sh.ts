import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Lumantek device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-lk-0001-0000-4000-8000-000000000001",
    deviceType: "converter",
    label: "Lumantek ez-SH",
    shortName: "ez-SH",
    manufacturer: "Lumantek",
    modelNumber: "ez-SH",
    referenceUrl: "https://lumantek.com/",
    searchTerms: [
      "Lumantek",
      "LUMANTEK",
      "Lumantek ez-SH",
      "ez-SH",
      "ez-sh",
      "Lumantek EZ-converter",
      "Lumantek SDI to HDMI",
      "3G HD SD-SDI to HDMI converter",
      "Lumantek up down scaler", "kgo-es-deviceadd"],
    widthMm: 86.4,
    depthMm: 66.8,
    heightMm: 28.4,
    weightKg: 0.149,
    powerDrawW: 1.8,
    powerCapacityW: 18,
    voltage: "5 V DC",
    ports: [
      port("SDI In", "sdi", "input", "bnc"),
      port("HDMI Out", "hdmi", "output", "hdmi"),
      port("DC Power In", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-lk-0002-0000-4000-8000-000000000002",
    deviceType: "converter",
    label: "Lumantek ez-HS",
    shortName: "ez-HS",
    manufacturer: "Lumantek",
    modelNumber: "ez-HS",
    referenceUrl: "https://lumantek.com/",
    searchTerms: [
      "Lumantek",
      "LUMANTEK",
      "Lumantek ez-HS",
      "ez-HS",
      "ez-hs",
      "Lumantek EZ-converter",
      "Lumantek HDMI to SDI",
      "HDMI to 3G HD SD-SDI converter",
      "Lumantek up down scaler", "kgo-es-deviceadd"],
    widthMm: 86.4,
    depthMm: 66.8,
    heightMm: 28.4,
    weightKg: 0.159,
    powerDrawW: 2.04,
    powerCapacityW: 18,
    voltage: "5 V DC",
    ports: [
      port("HDMI In", "hdmi", "input", "hdmi"),
      port("SDI Out 1", "sdi", "output", "bnc"),
      port("SDI Out 2", "sdi", "output", "bnc"),
      port("DC Power In", "power", "input"),
    ],
    color: "black",
  },
];
