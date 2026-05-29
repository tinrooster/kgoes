import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Microwave Radio Communications device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-mr-0001-0000-4000-8000-000000000001",
    deviceType: "eng-receiver-ird",
    label: "MRC MRX4000",
    shortName: "MRX4000",
    manufacturer: "Microwave Radio Communications",
    modelNumber: "MRX4000",
    referenceUrl:
      "https://www.manualslib.com/brand/microwave-radio-communications/receiver.html",
  
    searchTerms: [
      "MRC",
      "Microwave Radio Communications",
      "MRX4000",
      "MRX 4000",
      "Vislink MRC",
      "IRD",
      "integrated receiver decoder",
      "ENG receiver",
      "analog receiver",
      "2GHz",
      "BAS receiver",
      "news gathering", "kgo-es-deviceadd"],
  
    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 355.6,
  
    rackForm: "1U",
    color: "#1a1a1a",
  
    ports: [
      port("RF-IN", "rf", "input"),
  
      port("IF-OUT", "rf", "output", "bnc"),
  
      port("VIDEO-OUT", "sdi", "output", "bnc"),
      port("VIDEO-MON", "sdi", "output", "bnc"),
      port("BB-OUT", "sdi", "output", "bnc"),
  
      port("AUDIO", "analog-audio", "output"),
  
      port("SERIAL-LQ", "rs422", "bidirectional"),
  
      port("CONTROL", "ethernet", "bidirectional", "rj45"),
  
      port("24V-OUT", "power", "output"),
    ],
  },,

  {
    id: "kgo-mr-0002-0000-4000-8000-000000000002",
    deviceType: "eng-receiver-ird",
    label: "MRC MRX4000+",
    shortName: "MRX4000+",
    manufacturer: "Microwave Radio Communications",
    modelNumber: "MRX4000 PLUS",
    referenceUrl:
      "https://www.manualslib.com/manual/946465/Microwave-Radio-Communications-Mrx4000-Plus.html",
  
    searchTerms: [
      "MRC",
      "Microwave Radio Communications",
      "MRX4000",
      "MRX4000 PLUS",
      "MRX4000+",
      "MRX 4000 Plus",
      "Vislink MRC",
      "IRD",
      "integrated receiver decoder",
      "COFDM",
      "DVB-T",
      "ENG receiver",
      "HD-SDI",
      "ASI",
      "2GHz",
      "BAS receiver",
      "news gathering", "kgo-es-deviceadd"],
  
    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 355.6,
  
    rackForm: "1U",
    color: "#1a1a1a",
  
    ports: [
      port("RF-IN", "rf", "input"),
  
      port("IF-IN-900", "rf", "input", "bnc"),
      port("IF-OUT", "rf", "output", "bnc"),
  
      port("VIDEO-OUT", "sdi", "output", "bnc"),
      port("VIDEO-MON", "sdi", "output", "bnc"),
      port("BB-OUT", "sdi", "output", "bnc"),
  
      port("SDI-OUT", "sdi", "output", "bnc"),
      port("ASI-OUT", "sdi", "output", "bnc"),
  
      port("SUM", "sdi", "output", "bnc"),
  
      port("AUDIO", "analog-audio", "output"),
  
      port("SERIAL-LQ", "rs422", "bidirectional"),
  
      port("CONTROL", "ethernet", "bidirectional", "rj45"),
  
      port("ALARM", "gpio", "output"),
  
      port("24V-OUT", "power", "output"),
    ],
  }
];
