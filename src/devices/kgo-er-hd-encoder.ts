import { port, ports } from "./_helpers";
import type { DeviceTemplate } from "../types";

/**
 * KGO-ES — Ericsson device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-er-0001-0000-4000-8000-000000000001",
    deviceType: "video-encoder",
    label: "Ericsson E5780 HD Encoder",
    shortName: "E5780",
    manufacturer: "Ericsson",
    modelNumber: "E5780",
    referenceUrl:
      "https://www.broadcaststore.com/store/prod_detail.cfm?eq_id=700363",
  
    searchTerms: [
      "Ericsson",
      "Tandberg",
      "E5780",
      "E5782",
      "Evolution 5000",
      "MPEG-2 encoder",
      "HD encoder",
      "HD-SDI encoder",
      "ASI",
      "DVB-T",
      "ATSC",
      "broadcast encoder",
      "contribution encoder",
      "ENG encoder", "kgo-es-deviceadd"],
  
    widthMm: 482.6,
    heightMm: 88.9,
    depthMm: 406.4,
  
    rackForm: "full",
    rackHeightU: 2,
    color: "#222222",
  
    ports: [
      port("HDSDI-IN", "sdi", "input", "bnc"),
      port("SDI-IN", "sdi", "input", "bnc"),
  
      ...ports("ASI-OUT", "sdi", "output", 3, "bnc"),
  
      port("AUDIO-IN-A", "analog-audio", "input"),
      port("AUDIO-IN-B", "analog-audio", "input"),
  
      port("SERIAL", "rs422", "bidirectional"),
  
      port("MGMT", "ethernet", "bidirectional", "rj45"),
  
      port("MON-OUT", "sdi", "output", "bnc"),
  
      port("ALARM", "gpio", "output"),
    ],
  },
];
