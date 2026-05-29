import type { DeviceTemplate } from "../types";
import { port } from "./_helpers";

/** Slot family for Evertz 7700-series frame and compatible cards. */
export const EVERTZ_7700_SLOT_FAMILY = "evertz-7700";

export const evertz7700FrCTemplate: DeviceTemplate = {
  id: "kgo-ev-0001-0000-4000-8000-000000000001",
  deviceType: "modular-frame",
  label: "Evertz 7700FR-C",
  shortName: "7700FR-C",
  manufacturer: "Evertz",
  modelNumber: "7700FR-C",
  referenceUrl: "https://evertz.com/resources/manuals/?id=654",
  searchTerms: [
    "Evertz 7700FR-C",
    "7700FR-C",
    "Evertz 7700 frame",
    "Evertz 7700 master frame",
    "Evertz 7700 multiframe",
    "Evertz 7700 series frame",
    "Evertz 7700FR",
    "kgo-es-deviceadd",
  ],
  heightMm: 133.35,
  rackHeightU: 3,
  mountingClass: "rack-full",
  rackForm: "full",
  rackMetadataSource: "library",
  slotFamily: EVERTZ_7700_SLOT_FAMILY,
  ports: [],
  slots: Array.from({ length: 15 }, (_, i) => ({
    id: `slot-${i + 1}`,
    label: `Slot ${i + 1}`,
    slotFamily: EVERTZ_7700_SLOT_FAMILY,
  })),
  color: "black",
};

export const evertz7700Da7HdTemplate: DeviceTemplate = {
  id: "kgo-ev-0002-0000-4000-8000-000000000002",
  deviceType: "distribution-amplifier",
  label: "Evertz 7700DA7-HD",
  shortName: "7700DA7-HD",
  manufacturer: "Evertz",
  modelNumber: "7700DA7-HD",
  referenceUrl: "https://evertz.com/products/7700DA7-HD",
  searchTerms: [
    "Evertz 7700DA7-HD",
    "7700DA7-HD",
    "Evertz DA7",
    "Evertz SDI DA",
    "Evertz HD SDI distribution amplifier",
    "Evertz 1x7 DA",
    "Evertz 7700 DA",
    "kgo-es-deviceadd",
  ],
  powerDrawW: 5,
  voltage: "+12V DC via 7700 frame",
  slotFamily: EVERTZ_7700_SLOT_FAMILY,
  ports: [
    port("SDI In", "sdi", "input", "bnc"),
    port("SDI Out 1", "sdi", "output", "bnc"),
    port("SDI Out 2", "sdi", "output", "bnc"),
    port("SDI Out 3", "sdi", "output", "bnc"),
    port("SDI Out 4", "sdi", "output", "bnc"),
    port("SDI Out 5", "sdi", "output", "bnc"),
    port("SDI Out 6", "sdi", "output", "bnc"),
    port("SDI Out 7", "sdi", "output", "bnc"),
  ],
  color: "black",
};

export const evertz7721Ae8DeeHdTemplate: DeviceTemplate = {
  id: "kgo-ev-0003-0000-4000-8000-000000000003",
  deviceType: "embedder",
  label: "Evertz 7721AE8-DEE-HD",
  shortName: "7721AE8-DEE-HD",
  manufacturer: "Evertz",
  modelNumber: "7721AE8-DEE-HD",
  referenceUrl: "https://evertz.com/resources/manuals/?id=67",
  searchTerms: [
    "Evertz 7721AE8-DEE-HD",
    "7721AE8-DEE-HD",
    "Evertz embedder de-embedder",
    "Evertz SDI audio embedder",
    "Evertz SDI audio disembedder",
    "Evertz 7700 embedder",
    "Evertz Dolby E embedder",
    "kgo-es-deviceadd",
  ],
  slotFamily: EVERTZ_7700_SLOT_FAMILY,
  ports: [
    port("SDI In", "sdi", "input", "bnc"),
    port("SDI Out", "sdi", "output", "bnc"),
    port("AES Audio In 1-8", "aes", "input", "db25"),
    port("AES Audio Out 1-8", "aes", "output", "db25"),
  ],
  color: "black",
};

export const evertz7746FsTemplate: DeviceTemplate = {
  id: "kgo-ev-0004-0000-4000-8000-000000000004",
  deviceType: "frame-synchronizer",
  label: "Evertz 7746FS",
  shortName: "7746FS",
  manufacturer: "Evertz",
  modelNumber: "7746FS",
  referenceUrl: "https://evertz.com/resources/manuals/?id=73",
  searchTerms: [
    "Evertz 7746FS",
    "7746FS",
    "Evertz frame synchronizer",
    "Evertz 7700 frame sync",
    "Evertz 7746",
    "Evertz 7746FS frame sync",
    "kgo-es-deviceadd",
  ],
  slotFamily: EVERTZ_7700_SLOT_FAMILY,
  ports: [
    port("SDI In", "sdi", "input", "bnc"),
    port("SDI Out", "sdi", "output", "bnc"),
    port("Reference In", "genlock", "input", "bnc"),
  ],
  color: "black",
};

/** Required by deviceLibrary.ts — aggregates this file's templates. */
export const templates: DeviceTemplate[] = [
  evertz7700FrCTemplate,
  evertz7700Da7HdTemplate,
  evertz7721Ae8DeeHdTemplate,
  evertz7746FsTemplate,
];
