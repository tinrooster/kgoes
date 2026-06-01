/**
 * Build-time / seed catalog — aggregates live `src/devices/*.ts` modules.
 * The running app loads `deviceLibrary.fallback.json` via `deviceLibraryRuntime.ts`
 * so one broken template file does not black-screen the UI.
 */
import type { DeviceTemplate } from "./types";
import { templates as sources } from "./devices/sources";
import { templates as switching } from "./devices/switching";
import { templates as monitoring } from "./devices/monitoring";
import { templates as audio } from "./devices/audio";
import { templates as processing } from "./devices/processing";
import { templates as networking } from "./devices/networking";
import { templates as recording } from "./devices/recording";
import { templates as distribution } from "./devices/distribution";
import { templates as projection } from "./devices/projection";
import { templates as peripherals } from "./devices/peripherals";
import { templates as kvmExtenders } from "./devices/kvm-extenders";
import { templates as wireless } from "./devices/wireless";
import { templates as control } from "./devices/control";
import { templates as infrastructure } from "./devices/infrastructure";
import { templates as speakersAmps } from "./devices/speakers-amps";
import { templates as ledVideo } from "./devices/led-video";
import { templates as mediaServers } from "./devices/media-servers";
import { templates as lighting } from "./devices/lighting";
import { templates as cableAccessories } from "./devices/cable-accessories";
import { templates as cloudServices } from "./devices/cloud-services";
import { templates as codecs } from "./devices/codecs";
import { templates as vjf } from "./devices/vjf";
import { templates as rfTransmission } from "./devices/rf-transmission";
import { templates as expansionCards } from "./devices/expansion-cards";
import { templates as storageMedia } from "./devices/storage-media";
import { templates as kgoBroadcast } from "./devices/kgo-broadcast";
import { templates as kgoDaletBrio } from "./devices/kgo-da-brio";

import { templates as kgoImNexioAmp } from "./devices/kgo-im-nexio-amp";

import { templates as kgoAjAjaFs1 } from "./devices/kgo-aj-aja-fs1";

import { templates as kgoBmMultiview4 } from "./devices/kgo-bm-multiview-4";

import { templates as kgoLkLumantekEzSh } from "./devices/kgo-lk-lumantek-ez-sh";

import { templates as kgoEvEvertz7700frC } from "./devices/kgo-ev-evertz-7700fr-c";

import { templates as kgoCrRCore } from "./devices/kgo-cr-r-core";

import { templates as kgoTrOrionIdu } from "./devices/kgo-tr-orion-idu";

import { templates as kgoTsTouchstarS750 } from "./devices/kgo-ts-touchstar-s750";

import { templates as kgoMrMrcMrx4000 } from "./devices/kgo-mr-mrc-mrx4000";

import { templates as kgoErHdEncoder } from "./devices/kgo-er-hd-encoder";
import { templates as rfMicrowaveStl } from "./devices/rf-microwave-stl";
import { templates as kgoTowerSite } from "./devices/kgo-tower-site";
import { templates as kgoBoPtzCamera } from "./devices/kgo-bo-ptz-camera";
import { templates as kgoMrUltrascan } from "./devices/kgo-mr-ultrascan";

import { DEVICE_TYPE_TO_CATEGORY } from "./deviceTypeCategories";
export { DEVICE_TYPE_TO_CATEGORY };

export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  ...sources,
  ...switching,
  ...monitoring,
  ...audio,
  ...processing,
  ...networking,
  ...recording,
  ...distribution,
  ...projection,
  ...peripherals,
  ...kvmExtenders,
  ...wireless,
  ...control,
  ...infrastructure,
  ...speakersAmps,
  ...ledVideo,
  ...mediaServers,
  ...lighting,
  ...cableAccessories,
  ...cloudServices,
  ...codecs,
  ...vjf,
  ...rfTransmission,
  ...kgoBroadcast.filter(t => t.deviceType !== "expansion-card"),
  ...kgoDaletBrio,
  ...kgoImNexioAmp.filter(t => t.deviceType !== "expansion-card"),

  ...kgoAjAjaFs1.filter(t => t.deviceType !== "expansion-card"),

  ...kgoBmMultiview4.filter(t => t.deviceType !== "expansion-card"),

  ...kgoLkLumantekEzSh.filter(t => t.deviceType !== "expansion-card"),

  ...kgoEvEvertz7700frC.filter(t => t.deviceType !== "expansion-card"),

  ...kgoCrRCore.filter(t => t.deviceType !== "expansion-card"),

  ...kgoTrOrionIdu.filter(t => t.deviceType !== "expansion-card"),

  ...kgoTsTouchstarS750.filter(t => t.deviceType !== "expansion-card"),

  ...kgoMrMrcMrx4000.filter(t => t.deviceType !== "expansion-card"),

  ...kgoErHdEncoder.filter(t => t.deviceType !== "expansion-card"),

  ...rfMicrowaveStl,
  ...kgoTowerSite,
  ...kgoBoPtzCamera,
  ...kgoMrUltrascan,

];

export const CARD_TEMPLATES: DeviceTemplate[] = [
  ...expansionCards,
  ...storageMedia,
  ...kgoBroadcast.filter(t => t.deviceType === "expansion-card"),
  ...kgoImNexioAmp.filter(t => t.deviceType === "expansion-card"),

  ...kgoAjAjaFs1.filter(t => t.deviceType === "expansion-card"),

  ...kgoBmMultiview4.filter(t => t.deviceType === "expansion-card"),

  ...kgoLkLumantekEzSh.filter(t => t.deviceType === "expansion-card"),

  ...kgoEvEvertz7700frC.filter(t => t.deviceType === "expansion-card"),

  ...kgoCrRCore.filter(t => t.deviceType === "expansion-card"),

  ...kgoTrOrionIdu.filter(t => t.deviceType === "expansion-card"),

  ...kgoTsTouchstarS750.filter(t => t.deviceType === "expansion-card"),

  ...kgoMrMrcMrx4000.filter(t => t.deviceType === "expansion-card"),

  ...kgoErHdEncoder.filter(t => t.deviceType === "expansion-card"),

];

for (const t of [...DEVICE_TEMPLATES, ...CARD_TEMPLATES]) {
  (t as { category?: string }).category = DEVICE_TYPE_TO_CATEGORY[t.deviceType] ?? "Other";
}
