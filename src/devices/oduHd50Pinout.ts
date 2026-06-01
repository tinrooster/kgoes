import type { DbPinAssignment } from "../types";

/**
 * Generic HD50 ODU ↔ IDU control harness pinout for microwave STL drawings.
 * Functional names follow common PTP/ODU practice — verify against vendor datasheet
 * (Cambium, Trango, MRC, etc.) before field use.
 */
export const GENERIC_ODU_HD50_PINOUT: DbPinAssignment[] = [
  { pin: 1, label: "+48V DC", signal: "power" },
  { pin: 2, label: "DC Return", signal: "power" },
  { pin: 3, label: "Chassis GND", signal: "ground" },
  { pin: 4, label: "Shield GND", signal: "ground" },
  { pin: 5, label: "Alarm Summary", signal: "alarm" },
  { pin: 6, label: "Major Alarm", signal: "alarm" },
  { pin: 7, label: "Minor Alarm", signal: "alarm" },
  { pin: 8, label: "Remote Reset", signal: "control" },
  { pin: 9, label: "TX Mute", signal: "control" },
  { pin: 10, label: "RX Mute", signal: "control" },
  { pin: 11, label: "PA Enable", signal: "control" },
  { pin: 12, label: "Loop Enable", signal: "control" },
  { pin: 13, label: "RS-422 TX+", signal: "rs422" },
  { pin: 14, label: "RS-422 TX−", signal: "rs422" },
  { pin: 15, label: "RS-422 RX+", signal: "rs422" },
  { pin: 16, label: "RS-422 RX−", signal: "rs422" },
  { pin: 17, label: "RS-422 GND", signal: "rs422" },
  { pin: 18, label: "IF Monitor+", signal: "if" },
  { pin: 19, label: "IF Monitor−", signal: "if" },
  { pin: 20, label: "10 MHz Ref In", signal: "ref" },
  { pin: 21, label: "10 MHz Ref GND", signal: "ref" },
  { pin: 22, label: "Status LED Drive", signal: "status" },
  { pin: 23, label: "Fan Alarm", signal: "alarm" },
  { pin: 24, label: "Door / Tamper", signal: "alarm" },
  { pin: 25, label: "External Mute In", signal: "control" },
  { pin: 26, label: "External Mute GND", signal: "ground" },
  { pin: 27, label: "AUX Out 1", signal: "gpio" },
  { pin: 28, label: "AUX Out 2", signal: "gpio" },
  { pin: 29, label: "AUX In 1", signal: "gpio" },
  { pin: 30, label: "AUX In 2", signal: "gpio" },
  ...Array.from({ length: 20 }, (_, i) => ({
    pin: 31 + i,
    label: `Spare ${31 + i}`,
    signal: "spare",
  })),
];

/** Deep clone for template port assignment. */
export function cloneOduHd50Pinout(): DbPinAssignment[] {
  return GENERIC_ODU_HD50_PINOUT.map((row) => ({ ...row }));
}
