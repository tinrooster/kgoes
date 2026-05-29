import { port } from "./_helpers";
import type { DeviceTemplate } from "../types";

const CALREC_MODULAR_IO_SLOT_FAMILY = "calrec-modular-io";
const CALREC_TYPE_R_SYSTEM_SLOT_FAMILY = "calrec-type-r-system";

/**
 * KGO-ES — Calrec device templates.
 */
export const templates: DeviceTemplate[] = [
  {
    id: "kgo-cr-0001-0000-4000-8000-000000000001",
    deviceType: "audio-engine",
    label: "Calrec Type R Core",
    shortName: "Type R Core",
    manufacturer: "Calrec",
    modelNumber: "Type R Core",
    referenceUrl: "https://calrec.com/shop/broadcast-audio-consoles/type-r-for-tv/",
    searchTerms: [
      "Calrec Type R",
      "Calrec Type R Core",
      "Type R Core",
      "Calrec Type R system",
      "Calrec IP core",
      "Calrec ST 2110 core",
      "Calrec TV core", "kgo-es-deviceadd"],
    ports: [
      port("AoIP Network 1", "st2110", "bidirectional", "rj45"),
      port("AoIP Network 2", "st2110", "bidirectional", "rj45"),
      port("Control Network", "ethernet", "bidirectional", "rj45"),
      port("GPIO", "gpio", "bidirectional"),
      // GPIO connection is documented in Calrec system docs, but connector type was not confirmed from surfaced sources.
      port("Power In A", "power", "input"),
      port("Power In B", "power", "input"),
    ],
    slotFamily: CALREC_TYPE_R_SYSTEM_SLOT_FAMILY,
    color: "black",
  },

  {
    id: "kgo-cr-0002-0000-4000-8000-000000000002",
    deviceType: "audio-console",
    label: "Calrec Brio 12",
    shortName: "Brio 12",
    manufacturer: "Calrec",
    modelNumber: "Brio 12",
    referenceUrl: "https://calrec.com/shop/broadcast-audio-consoles/brio/",
    searchTerms: [
      "Calrec Brio",
      "Calrec Brio 12",
      "Brio 12",
      "Calrec compact console",
      "Calrec self contained console", "kgo-es-deviceadd"],
    ports: [
      port("Ethernet", "ethernet", "bidirectional", "rj45"),
      port("Hydra2 / I/O Network", "ethernet", "bidirectional", "rj45"),
      port("Headphones", "analog-audio", "output"),
      // Headphone connector type not confirmed from surfaced product page/manual snippets.
      port("Power In", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0003-0000-4000-8000-000000000003",
    deviceType: "audio-console",
    label: "Calrec Brio 36",
    shortName: "Brio 36",
    manufacturer: "Calrec",
    modelNumber: "Brio 36",
    referenceUrl: "https://calrec.com/shop/broadcast-audio-consoles/brio/",
    searchTerms: [
      "Calrec Brio",
      "Calrec Brio 36",
      "Brio 36",
      "Brio 36 Duet",
      "Brio 36 Medley",
      "Calrec compact console",
      "Calrec self contained console", "kgo-es-deviceadd"],
    ports: [
      port("Analog Audio In 1-24", "analog-audio", "input"),
      // Brio 36 built-in 24 analogue inputs confirmed; connector type not exposed in surfaced source.
      port("Analog Audio Out 1-16", "analog-audio", "output"),
      // Brio 36 built-in 16 analogue outputs confirmed; connector type not exposed in surfaced source.
      port("AES In 1-8", "aes", "input"),
      // Brio 36 built-in 8 AES inputs confirmed; connector type not exposed in surfaced source.
      port("AES Out 1-8", "aes", "output"),
      // Brio 36 built-in 8 AES outputs confirmed; connector type not exposed in surfaced source.
      port("Ethernet", "ethernet", "bidirectional", "rj45"),
      port("Hydra2 / I/O Network", "ethernet", "bidirectional", "rj45"),
      port("Headphones", "analog-audio", "output"),
      // Headphone connector type not confirmed from surfaced product page/manual snippets.
      port("Power In", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0004-0000-4000-8000-000000000004",
    deviceType: "audio-engine",
    label: "Calrec RP1",
    shortName: "RP1",
    manufacturer: "Calrec",
    modelNumber: "RP1",
    referenceUrl: "https://calrec.com/shop/broadcast-audio-consoles/rp1/",
    searchTerms: [
      "Calrec RP1",
      "RP1",
      "Calrec remote production",
      "Calrec RP1 engine",
      "Calrec 2U engine",
      "Calrec remote production processor", "kgo-es-deviceadd"],
    heightMm: 88.9,
    rackForm: "full",
    rackHeightU: 2,
    ports: [
      port("Hydra2 Network 1", "ethernet", "bidirectional", "rj45"),
      port("Hydra2 Network 2", "ethernet", "bidirectional", "rj45"),
      port("Control Network", "ethernet", "bidirectional", "rj45"),
      port("GPIO", "gpio", "bidirectional"),
      // GPIO is documented in RP1 manuals, but connector type was not confirmed from surfaced sources.
      port("Headphones", "analog-audio", "output"),
      // Headphone connector type was not confirmed from surfaced sources.
      port("Power In A", "power", "input"),
      port("Power In B", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0005-0000-4000-8000-000000000005",
    deviceType: "audio-engine",
    label: "Calrec ImPulse Core",
    shortName: "ImPulse Core",
    manufacturer: "Calrec",
    modelNumber: "ImPulse Core",
    referenceUrl: "https://calrec.com/wp-content/uploads/2020/02/Impulse-Core-Installation-Manual-926-288-Iss5-Lo.pdf",
    searchTerms: [
      "Calrec ImPulse",
      "Calrec ImPulse Core",
      "ImPulse Core",
      "Calrec IP core",
      "Calrec AoIP core",
      "Calrec AES67 core", "kgo-es-deviceadd"],
    ports: [
      port("AoIP / AES67 Network 1", "aes67", "bidirectional", "rj45"),
      port("AoIP / AES67 Network 2", "aes67", "bidirectional", "rj45"),
      port("Fiber Network Port 1", "fiber", "bidirectional", "sfp"),
      port("Fiber Network Port 2", "fiber", "bidirectional", "sfp"),
      port("Control Network", "ethernet", "bidirectional", "rj45"),
      port("GPIO", "gpio", "bidirectional"),
      // GPIO/control are documented in system materials, but connector types were not confirmed from surfaced sources.
      port("Power In A", "power", "input"),
      port("Power In B", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0006-0000-4000-8000-000000000006",
    deviceType: "modular-frame",
    label: "Calrec Modular I/O 3U",
    shortName: "Modular I/O 3U",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O 3U",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O",
      "Calrec Modular IO",
      "Calrec Modular I/O 3U",
      "Calrec 3U I/O box",
      "Calrec Hydra2 I/O",
      "Calrec stagebox", "kgo-es-deviceadd"],
    heightMm: 133.35,
    rackForm: "full",
    rackHeightU: 3,
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    slots: Array.from({ length: 20 }, (_, i) => ({
      id: `slot-${i + 1}`,
      label: `Slot ${i + 1}`,
      slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    })),
    ports: [
      port("Hydra2 Network A", "ethernet", "bidirectional", "rj45"),
      port("Hydra2 Network B", "ethernet", "bidirectional", "rj45"),
      port("Power In A", "power", "input"),
      port("Power In B", "power", "input"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0007-0000-4000-8000-000000000007",
    deviceType: "audio-io-card",
    label: "Calrec Modular I/O Analog Input Card",
    shortName: "Analog In Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O Analog Input Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O analog input",
      "Calrec analog input card",
      "Calrec Modular IO analog in",
      "Calrec stagebox analog in", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("Analog Audio In 1-8", "analog-audio", "input"),
      // Calrec Modular I/O supports analog input cards; exact channel count and connector type should be verified per card variant.
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0008-0000-4000-8000-000000000008",
    deviceType: "audio-io-card",
    label: "Calrec Modular I/O Analog Output Card",
    shortName: "Analog Out Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O Analog Output Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O analog output",
      "Calrec analog output card",
      "Calrec Modular IO analog out",
      "Calrec stagebox analog out", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("Analog Audio Out 1-8", "analog-audio", "output"),
      // Calrec Modular I/O supports analog output cards; exact channel count and connector type should be verified per card variant.
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0009-0000-4000-8000-000000000009",
    deviceType: "audio-io-card",
    label: "Calrec Modular I/O AES Card",
    shortName: "AES Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O AES Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O AES",
      "Calrec AES card",
      "Calrec Modular IO AES",
      "Calrec stagebox AES", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("AES In 1-8", "aes", "input"),
      port("AES Out 1-8", "aes", "output"),
      // Exact AES card connector type and channel count vary by card option and should be verified per module.
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0010-0000-4000-8000-000000000010",
    deviceType: "audio-io-card",
    label: "Calrec Modular I/O MADI Card",
    shortName: "MADI Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O MADI Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O MADI",
      "Calrec MADI card",
      "Calrec Modular IO MADI",
      "Calrec stagebox MADI", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("MADI In", "madi", "input"),
      port("MADI Out", "madi", "output"),
      // Connector type omitted: Calrec Modular I/O MADI options may be BNC, fiber, or SFP-based depending on card variant.
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0011-0000-4000-8000-000000000011",
    deviceType: "audio-io-card",
    label: "Calrec Modular I/O Dante Card",
    shortName: "Dante Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O Dante Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O Dante",
      "Calrec Dante card",
      "Calrec Modular IO Dante",
      "Calrec stagebox Dante", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("Dante Network 1", "dante", "bidirectional", "rj45"),
      port("Dante Network 2", "dante", "bidirectional", "rj45"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0012-0000-4000-8000-000000000012",
    deviceType: "gpio-card",
    label: "Calrec Modular I/O GPIO Card",
    shortName: "GPIO Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O GPIO Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O GPIO",
      "Calrec GPIO card",
      "Calrec Modular IO GPIO",
      "Calrec stagebox GPIO", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("GPIO", "gpio", "bidirectional"),
      // Connector type omitted: Calrec product pages list GPIO card availability, but not the physical connector in surfaced sources.
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0013-0000-4000-8000-000000000013",
    deviceType: "embedder",
    label: "Calrec Modular I/O SDI Embedder Card",
    shortName: "SDI Embed Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O SDI Embedder Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O SDI embed",
      "Calrec SDI embedder card",
      "Calrec Modular IO SDI embed",
      "Calrec stagebox SDI embedder", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("SDI In", "sdi", "input", "bnc"),
      port("SDI Out", "sdi", "output", "bnc"),
    ],
    color: "black",
  },

  {
    id: "kgo-cr-0014-0000-4000-8000-000000000014",
    deviceType: "disembedder",
    label: "Calrec Modular I/O SDI De-Embedder Card",
    shortName: "SDI De-Embed Card",
    manufacturer: "Calrec",
    modelNumber: "Modular I/O SDI De-Embedder Card",
    referenceUrl: "https://calrec.com/shop/audio-networking/modular-i-o/",
    searchTerms: [
      "Calrec Modular I/O SDI de-embed",
      "Calrec SDI deembedder card",
      "Calrec Modular IO SDI deembed",
      "Calrec stagebox SDI de-embedder", "kgo-es-deviceadd"],
    slotFamily: CALREC_MODULAR_IO_SLOT_FAMILY,
    ports: [
      port("SDI In", "sdi", "input", "bnc"),
      port("SDI Out", "sdi", "output", "bnc"),
    ],
    color: "black",
  },
];
