import { describe, expect, it } from "vitest";
import {
  displayMdfPortLabel,
  inferMdfGrid,
  migrateMdfDevicePorts,
  mdfRowPortLabel,
  normalizeMdfPortLabel,
} from "../mdfPortLabels";
import type { DeviceData } from "../types";

describe("mdfPortLabels", () => {
  it("maps Pair N to row-port in row-major order", () => {
    expect(normalizeMdfPortLabel("Pair 1", 1, 6)).toBe("1-1");
    expect(normalizeMdfPortLabel("Pair 6", 6, 6)).toBe("1-6");
    expect(normalizeMdfPortLabel("Pair 7", 7, 6)).toBe("2-1");
    expect(normalizeMdfPortLabel("Pair 14", 14, 6)).toBe("3-2");
  });

  it("migrates legacy MDF device ports on load", () => {
    const ports = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i + 1}`,
      label: `Pair ${i + 1}`,
      signalType: "sdi" as const,
      direction: "passthrough" as const,
      connectorType: "bnc" as const,
    }));
    const device: DeviceData = {
      label: "MDF",
      deviceType: "mdf",
      ports,
    };
    const migrated = migrateMdfDevicePorts(device);
    expect(migrated.ports?.[0].label).toBe("1-1");
    expect(migrated.ports?.[5].label).toBe("1-6");
    expect(migrated.ports?.[6].label).toBe("2-1");
    expect(migrated.ports?.[11].label).toBe("2-6");
    expect(migrated.mdfRows).toBe(2);
    expect(migrated.mdfPortsPerRow).toBe(6);
  });

  it("infers 2×6 grid for 12-pair panels", () => {
    expect(inferMdfGrid(12)).toEqual({ rows: 2, portsPerRow: 6 });
    expect(mdfRowPortLabel(12, 6)).toBe("2-6");
  });

  it("displays row-port for canvas labels", () => {
    const device: DeviceData = {
      label: "MDF",
      deviceType: "mdf",
      mdfRows: 2,
      mdfPortsPerRow: 6,
      ports: [
        {
          id: "p1",
          label: "Pair 5",
          signalType: "sdi",
          direction: "passthrough",
          connectorType: "bnc",
        },
      ],
    };
    expect(displayMdfPortLabel(device, device.ports![0], 5)).toBe("1-5");
  });
});
