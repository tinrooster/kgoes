import { port, ports } from "./_helpers";
import type { DeviceTemplate } from "../types";

/** Explicit full-width rack panel metadata (height U from spec). */
function fullRackMeta(rackHeightU: number) {
  return {
    rackHeightU,
    mountingClass: "rack-full" as const,
    rackForm: "full" as const,
    rackMetadataSource: "library" as const,
  };
}

/**
 * KGO/DET broadcast-specific device library.
 * Maintained separately from the upstream ES community library; IDs are prefixed
 * with "kgo-rv-" (Ross Video), "kgo-ev-" (Evertz), etc. to avoid upstream collisions.
 * Format is identical to ES DeviceTemplate — can be submitted upstream as-is.
 */
export const templates: DeviceTemplate[] = [

  // ═══════════════════════════════════════════════════════════════
  // ROSS VIDEO — ULTRIX ROUTING FRAMES
  // Hyperconverged routing/processing platform.
  // Blades (HDX-IO, IPX-IO, SFP-IO) populate the numbered slots.
  // ═══════════════════════════════════════════════════════════════

  {
    id: "kgo-rv-0001-0000-4000-8000-000000000001",
    deviceType: "router",
    label: "Ross Ultrix FR5",
    shortName: "Ultrix FR5",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-FR5",
    referenceUrl: "https://www.rossvideo.com/products/routing-systems/ultrix/",
    searchTerms: ["ross", "ultrix", "fr5", "router", "hyperconverged", "routing", "sdi", "ip", "kgo-es-deviceadd"],
    heightMm: 221,   // 5RU (8.7")
    widthMm: 445,    // 17.5"
    depthMm: 201,    // 7.9" chassis only; blades extend further
    weightKg: 6.4,   // 14 lbs, empty chassis
    ...fullRackMeta(5),
    slots: [
      { id: "slot-1",    label: "Slot 1",              slotFamily: "ultrix" },
      { id: "slot-2",    label: "Slot 2",              slotFamily: "ultrix" },
      { id: "slot-3",    label: "Slot 3",              slotFamily: "ultrix" },
      { id: "slot-4",    label: "Slot 4",              slotFamily: "ultrix" },
      { id: "slot-5",    label: "Slot 5",              slotFamily: "ultrix" },
      { id: "slot-6",    label: "Slot 6",              slotFamily: "ultrix" },
      { id: "slot-7",    label: "Slot 7",              slotFamily: "ultrix" },
      { id: "slot-8",    label: "Slot 8",              slotFamily: "ultrix" },
      { id: "slot-flex", label: "Flex Slot (I/O only)", slotFamily: "ultrix-io" },
    ],
    ports: [
      port("Ref In 1",  "genlock",  "input",         "bnc"),
      port("Ref In 2",  "genlock",  "input",         "bnc"),
      port("Mgmt 1",    "ethernet", "bidirectional", "rj45"),
      port("Mgmt 2",    "ethernet", "bidirectional", "rj45"),
    ],
  },

  {
    id: "kgo-rv-0002-0000-4000-8000-000000000002",
    deviceType: "router",
    label: "Ross Ultrix FR12",
    shortName: "Ultrix FR12",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-FR12",
    referenceUrl: "https://www.rossvideo.com/products/routing-systems/ultrix/",
    searchTerms: ["ross", "ultrix", "fr12", "router", "hyperconverged", "288x288", "sdi", "ip", "kgo-es-deviceadd"],
    heightMm: 534,    // 12RU (21.0")
    widthMm: 480,     // 18.90"
    depthMm: 404,     // 15.91"
    weightKg: 55.3,   // 122 lbs fully loaded
    powerDrawW: 2400, // min 2× 1200W Ultripower PSUs; can be higher at full load
    ...fullRackMeta(12),
    slots: [
      ...Array.from({ length: 16 }, (_, i) => ({
        id: `slot-${i + 1}`,
        label: `Slot ${i + 1}`,
        slotFamily: "ultrix",
      })),
    ],
    ports: [
      port("Ref In 1",  "genlock",  "input",         "bnc"),
      port("Ref In 2",  "genlock",  "input",         "bnc"),
      port("Mgmt 1",    "ethernet", "bidirectional", "rj45"),
      port("Mgmt 2",    "ethernet", "bidirectional", "rj45"),
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ROSS VIDEO — ULTRIX I/O BLADES
  // Expansion cards that populate Ultrix FR5/FR12 chassis slots.
  // slotFamily: "ultrix" fits standard slots; "ultrix-io" also fits flex slot.
  // ═══════════════════════════════════════════════════════════════

  {
    id: "kgo-rv-0010-0000-4000-8000-000000000010",
    deviceType: "expansion-card",
    label: "Ultrix HDX-IO Blade",
    shortName: "HDX-IO",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-HDX-IO",
    referenceUrl: "https://www.rossvideo.com/products/routing-systems/ultrix/",
    searchTerms: ["ross", "ultrix", "hdx", "io", "blade", "sdi", "3g", "12g", "hdbnc", "kgo-es-deviceadd"],
    slotFamily: "ultrix",
    ports: [
      ...ports("SDI In",  "sdi", "input",  16, "bnc"),
      ...ports("SDI Out", "sdi", "output", 16, "bnc"),
    ],
  },

  {
    id: "kgo-rv-0011-0000-4000-8000-000000000011",
    deviceType: "expansion-card",
    label: "Ultrix IPX-IO Blade",
    shortName: "IPX-IO",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-IPX-IO",
    referenceUrl: "https://www.rossvideo.com/products/routing-systems/ultrix/",
    searchTerms: ["ross", "ultrix", "ipx", "io", "blade", "st2110", "ip", "100ge", "25ge", "qsfp28", "sfp28", "kgo-es-deviceadd"],
    slotFamily: "ultrix",
    ports: [
      port("25GE SFP28 1", "st2110", "bidirectional", "sfp"),
      port("25GE SFP28 2", "st2110", "bidirectional", "sfp"),
      port("25GE SFP28 3", "st2110", "bidirectional", "sfp"),
      port("25GE SFP28 4", "st2110", "bidirectional", "sfp"),
    ],
  },

  {
    id: "kgo-rv-0012-0000-4000-8000-000000000012",
    deviceType: "expansion-card",
    label: "Ultrix SFP-IO Blade",
    shortName: "SFP-IO",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-SFP-IO",
    referenceUrl: "https://www.rossvideo.com/products/routing-systems/ultrix/",
    searchTerms: ["ross", "ultrix", "sfp", "io", "blade", "fiber", "multi-format", "bidirectional", "kgo-es-deviceadd"],
    slotFamily: "ultrix",
    ports: [
      ...ports("SFP",     "sdi", "bidirectional", 16, "sfp"),
      port("Aux SFP 1",   "sdi", "bidirectional", "sfp"),
      port("Aux SFP 2",   "sdi", "bidirectional", "sfp"),
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ROSS VIDEO — ULTRIX ACUITY PRODUCTION SWITCHER
  // Ultrix frames configured for live production with SDPE blades.
  // FR5: max 4 SDPE blades (1 ME each, 6 keyers).
  // FR12: more SDPE capacity, larger I/O complement.
  // ═══════════════════════════════════════════════════════════════

  {
    id: "kgo-rv-0020-0000-4000-8000-000000000020",
    deviceType: "switcher",
    label: "Ross Ultrix Acuity FR5",
    shortName: "Acuity FR5",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-ACU-FR5",
    referenceUrl: "https://www.rossvideo.com/live-production/production-switchers/ultrix-acuity/",
    searchTerms: ["ross", "ultrix", "acuity", "fr5", "production switcher", "hyperconverged", "me", "keyer", "kgo-es-deviceadd"],
    heightMm: 221,
    widthMm: 445,
    depthMm: 201,
    weightKg: 6.4,
    ...fullRackMeta(5),
    slots: [
      { id: "slot-1",    label: "Slot 1 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-2",    label: "Slot 2 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-3",    label: "Slot 3 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-4",    label: "Slot 4 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-5",    label: "Slot 5 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-6",    label: "Slot 6 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-7",    label: "Slot 7 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-8",    label: "Slot 8 (IO or SDPE)", slotFamily: "ultrix" },
      { id: "slot-flex", label: "Flex Slot (I/O only)", slotFamily: "ultrix-io" },
    ],
    ports: [
      port("Ref In 1",  "genlock",  "input",         "bnc"),
      port("Ref In 2",  "genlock",  "input",         "bnc"),
      port("Tally/GPI", "gpio",     "bidirectional", "db25"),
      port("Mgmt 1",    "ethernet", "bidirectional", "rj45"),
      port("Mgmt 2",    "ethernet", "bidirectional", "rj45"),
    ],
  },

  {
    id: "kgo-rv-0021-0000-4000-8000-000000000021",
    deviceType: "switcher",
    label: "Ross Ultrix Acuity FR12",
    shortName: "Acuity FR12",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-ACU-FR12",
    referenceUrl: "https://www.rossvideo.com/live-production/production-switchers/ultrix-acuity/",
    searchTerms: ["ross", "ultrix", "acuity", "fr12", "production switcher", "hyperconverged", "288x288", "kgo-es-deviceadd"],
    heightMm: 534,
    widthMm: 480,
    depthMm: 404,
    weightKg: 55.3,
    powerDrawW: 2400,
    ...fullRackMeta(12),
    slots: [
      ...Array.from({ length: 16 }, (_, i) => ({
        id: `slot-${i + 1}`,
        label: `Slot ${i + 1}`,
        slotFamily: "ultrix",
      })),
    ],
    ports: [
      port("Ref In 1",  "genlock",  "input",         "bnc"),
      port("Ref In 2",  "genlock",  "input",         "bnc"),
      port("Tally/GPI", "gpio",     "bidirectional", "db25"),
      port("Mgmt 1",    "ethernet", "bidirectional", "rj45"),
      port("Mgmt 2",    "ethernet", "bidirectional", "rj45"),
    ],
  },

  {
    id: "kgo-rv-0022-0000-4000-8000-000000000022",
    deviceType: "expansion-card",
    label: "Ultrix Acuity SDPE Blade",
    shortName: "SDPE",
    manufacturer: "Ross Video",
    modelNumber: "ULTRIX-SDPE",
    referenceUrl: "https://www.rossvideo.com/live-production/production-switchers/ultrix-acuity/",
    searchTerms: ["ross", "ultrix", "acuity", "sdpe", "processing", "me", "keyer", "blade", "kgo-es-deviceadd"],
    slotFamily: "ultrix",
    ports: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // ROSS VIDEO — GRAPHITE ALL-IN-ONE PRODUCTION SYSTEM
  // 4RU chassis: Carbonite production switcher + XPression graphics
  // + RAVE 48-channel audio mixer + XPression Clips.
  // Six configurations: 1ME or 2ME × 5/9/13 inputs.
  // Outputs are identical across all configs: 6× SDI + 2× HDMI.
  // ═══════════════════════════════════════════════════════════════

  {
    id: "kgo-rv-0030-0000-4000-8000-000000000030",
    deviceType: "switcher",
    label: "Ross Graphite 4RU (1ME / 5-In)",
    shortName: "Graphite 1ME-5",
    manufacturer: "Ross Video",
    modelNumber: "GRAPHITE-4RU-1ME-5IN",
    referenceUrl: "https://www.rossvideo.com/products/production-switchers/graphite/",
    searchTerms: ["ross", "graphite", "production switcher", "carbonite", "xpression", "rave", "1me", "5in", "4ru", "integrated", "kgo-es-deviceadd"],
    heightMm: 178,   // 4RU
    widthMm: 483,    // 19" rack
    depthMm: 432,    // ~17" estimated
    weightKg: 28.1,  // 62 lbs
    ...fullRackMeta(4),
    ports: [
      ...ports("SDI In",    "sdi",      "input",         4,   "bnc"),
      port("HDMI In",       "hdmi",     "input"),
      ...ports("SDI Out",   "sdi",      "output",        6,   "bnc"),
      port("HDMI Out 1",    "hdmi",     "output"),
      port("HDMI Out 2",    "hdmi",     "output"),
      port("Ref In",        "genlock",  "input",             "bnc"),
      port("LTC In",        "timecode", "input",             "bnc"),
      port("Ethernet 1",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 2",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 3",    "ethernet", "bidirectional",     "rj45"),
    ],
  },

  {
    id: "kgo-rv-0031-0000-4000-8000-000000000031",
    deviceType: "switcher",
    label: "Ross Graphite 4RU (1ME / 9-In)",
    shortName: "Graphite 1ME-9",
    manufacturer: "Ross Video",
    modelNumber: "GRAPHITE-4RU-1ME-9IN",
    referenceUrl: "https://www.rossvideo.com/products/production-switchers/graphite/",
    searchTerms: ["ross", "graphite", "production switcher", "carbonite", "xpression", "rave", "1me", "9in", "4ru", "kgo-es-deviceadd"],
    heightMm: 178,
    widthMm: 483,
    depthMm: 432,
    weightKg: 28.1,
    ...fullRackMeta(4),
    ports: [
      ...ports("SDI In",    "sdi",      "input",         8,   "bnc"),
      port("HDMI In",       "hdmi",     "input"),
      ...ports("SDI Out",   "sdi",      "output",        6,   "bnc"),
      port("HDMI Out 1",    "hdmi",     "output"),
      port("HDMI Out 2",    "hdmi",     "output"),
      port("Ref In",        "genlock",  "input",             "bnc"),
      port("LTC In",        "timecode", "input",             "bnc"),
      port("Ethernet 1",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 2",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 3",    "ethernet", "bidirectional",     "rj45"),
    ],
  },

  {
    id: "kgo-rv-0032-0000-4000-8000-000000000032",
    deviceType: "switcher",
    label: "Ross Graphite 4RU (2ME / 13-In)",
    shortName: "Graphite 2ME-13",
    manufacturer: "Ross Video",
    modelNumber: "GRAPHITE-4RU-2ME-13IN",
    referenceUrl: "https://www.rossvideo.com/products/production-switchers/graphite/",
    searchTerms: ["ross", "graphite", "production switcher", "carbonite", "xpression", "rave", "2me", "13in", "4ru", "kgo-es-deviceadd"],
    heightMm: 178,
    widthMm: 483,
    depthMm: 432,
    weightKg: 28.1,
    ...fullRackMeta(4),
    ports: [
      ...ports("SDI In",    "sdi",      "input",         12,  "bnc"),
      port("HDMI In",       "hdmi",     "input"),
      ...ports("SDI Out",   "sdi",      "output",        6,   "bnc"),
      port("HDMI Out 1",    "hdmi",     "output"),
      port("HDMI Out 2",    "hdmi",     "output"),
      port("Ref In",        "genlock",  "input",             "bnc"),
      port("LTC In",        "timecode", "input",             "bnc"),
      port("Ethernet 1",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 2",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 3",    "ethernet", "bidirectional",     "rj45"),
    ],
  },

  // ─────────────────────────────────────────
  // ROSS VIDEO — GRAPHITE PPC (Portable Production Center)
  // Same Carbonite/XPression/RAVE engine in a portable carrying case.
  // Not rack-mount; dimensions are the external case.
  // ─────────────────────────────────────────

  {
    id: "kgo-rv-0033-0000-4000-8000-000000000033",
    deviceType: "switcher",
    label: "Ross Graphite PPC",
    shortName: "Graphite PPC",
    manufacturer: "Ross Video",
    modelNumber: "GRAPHITE-PPC",
    referenceUrl: "https://www.rossvideo.com/products/production-switchers/all-in-one-production-systems/",
    searchTerms: ["ross", "graphite", "ppc", "portable", "production center", "2me", "carbonite", "xpression", "kgo-es-deviceadd"],
    mountingClass: "tabletop",
    rackForm: "shelf-only",
    rackMetadataSource: "library",
    heightMm: 372,   // 14.63" (portable case, not standard RU)
    widthMm: 434,    // 17.09"
    depthMm: 230,    // 9.05"
    weightKg: 19.1,  // 42 lbs
    powerDrawW: 185,
    ports: [
      ...ports("SDI In",    "sdi",      "input",         12,  "bnc"),
      port("HDMI In",       "hdmi",     "input"),
      ...ports("SDI Out",   "sdi",      "output",        6,   "bnc"),
      port("HDMI Out 1",    "hdmi",     "output"),
      port("HDMI Out 2",    "hdmi",     "output"),
      port("Ref In",        "genlock",  "input",             "bnc"),
      port("LTC In",        "timecode", "input",             "bnc"),
      port("Ethernet 1",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 2",    "ethernet", "bidirectional",     "rj45"),
      port("Ethernet 3",    "ethernet", "bidirectional",     "rj45"),
    ],
  },
];
