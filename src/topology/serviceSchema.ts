/**
 * Media / signal categories for MDF matrix patching (broadcast plant).
 */

import type { SignalType } from "../types";

export type ServiceType = "ETHERNET_DATA" | "FIBER" | "VIDEO" | "GPIO";

export interface ServiceStyle {
  label: string;
  stroke: string;
  fill: string;
  hoverFill: string;
  badgeColor: string;
  /** Schematic edge signal when syncing to Drawing. */
  signalType: SignalType;
}

export const SERVICE_REGISTRY: Record<ServiceType, ServiceStyle> = {
  ETHERNET_DATA: {
    label: "Ethernet data",
    stroke: "#2563eb",
    fill: "#eff6ff",
    hoverFill: "#dbeafe",
    badgeColor: "bg-blue-600",
    signalType: "ethernet",
  },
  FIBER: {
    label: "Fiber",
    stroke: "#0891b2",
    fill: "#ecfeff",
    hoverFill: "#cffafe",
    badgeColor: "bg-cyan-600",
    signalType: "fiber",
  },
  VIDEO: {
    label: "Video",
    stroke: "#c026d3",
    fill: "#fdf4ff",
    hoverFill: "#fae8ff",
    badgeColor: "bg-fuchsia-600",
    signalType: "sdi",
  },
  GPIO: {
    label: "GPIO",
    stroke: "#65a30d",
    fill: "#f7fee7",
    hoverFill: "#ecfccb",
    badgeColor: "bg-lime-600",
    signalType: "gpio",
  },
};

export const SERVICE_TYPES = Object.keys(SERVICE_REGISTRY) as ServiceType[];

const LEGACY_SERVICE_ALIASES: Record<string, ServiceType> = {
  DATA_NETWORK: "ETHERNET_DATA",
  VOIP_VOICE: "ETHERNET_DATA",
  SECURITY_IPCAM: "VIDEO",
  WIFI_AP: "ETHERNET_DATA",
  DMZ_EXTERNAL: "ETHERNET_DATA",
};

export function normalizeServiceType(raw?: string): ServiceType {
  if (!raw) return "ETHERNET_DATA";
  if (raw in SERVICE_REGISTRY) return raw as ServiceType;
  if (LEGACY_SERVICE_ALIASES[raw]) return LEGACY_SERVICE_ALIASES[raw];
  if (raw === "ethernet") return "ETHERNET_DATA";
  if (raw === "fiber") return "FIBER";
  if (raw === "gpio") return "GPIO";
  if (raw === "sdi" || raw === "hdmi" || raw === "video") return "VIDEO";
  return "ETHERNET_DATA";
}

export function resolveServiceStyle(serviceType?: string): ServiceStyle {
  return SERVICE_REGISTRY[normalizeServiceType(serviceType)];
}

export function signalTypeForService(serviceType?: string): SignalType {
  return resolveServiceStyle(serviceType).signalType;
}
