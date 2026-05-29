import { port, ports } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Trango Systems device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-tr-0001-0000-4000-8000-000000000001",
    deviceType: "microwave-radio-idu",
    label: "Trango Giga Orion IDU",
    shortName: "Giga Orion IDU",
    manufacturer: "Trango Systems",
    modelNumber: "Giga Orion IDU",
    referenceUrl:
      "https://support.gotrango.com/hc/en-us/articles/216201763-Giga-Orion-Datasheet",
    searchTerms: [
      "Trango",
      "Giga Orion",
      "GigaOrion",
      "TrangoLINK",
      "18GHz",
      "18 GHz",
      "microwave radio",
      "point-to-point",
      "backhaul",
      "IDU",
      "indoor unit",
      "licensed microwave",
      "IP microwave",
      "ENG", "kgo-es-deviceadd"],
    widthMm: 482.6,
    heightMm: 44.45,
    depthMm: 330.2,
    weightKg: 2.54,
    powerDrawW: 70,
    voltage: "-40.5 to -57 VDC",
    rackForm: "1U",
    color: "#2a2a2a",
  
    ports: [
      ...ports("GE", "ethernet", "bidirectional", 4, "rj45"),
      ...ports("T1", "ethernet", "bidirectional", 8, "rj45"),
  
      port("MGMT", "ethernet", "bidirectional", "rj45"),
  
      port("IF-ODU", "rf", "bidirectional"),
  
      port("CONSOLE", "rs422", "bidirectional"),
  
      port("ALARM-IN-A", "gpio", "input"),
      port("ALARM-IN-B", "gpio", "input"),
      port("ALARM-OUT-A", "gpio", "output"),
      port("ALARM-OUT-B", "gpio", "output"),
  
      port("REDUNDANCY", "gpio", "bidirectional"),
    ],
  },
];
