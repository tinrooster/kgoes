import { describe, expect, it } from "vitest";
import { patchPanelPorts } from "../devices/_helpers";
import { upgradeJackFieldDeviceData } from "../rackJackFieldDevice";
import type { DeviceData } from "../types";

describe("upgradeJackFieldDeviceData", () => {
  it("expands legacy 6+6 in/out patch panel to 12 passthrough circuits", () => {
    const legacyPorts = patchPanelPorts("Port ", "ethernet", 6, { connectorType: "rj45" });
    const data = {
      label: "MDF / Datacom · EJF 1",
      deviceType: "patch-panel",
      ports: legacyPorts,
      auxiliaryData: [
        { text: "Source: MDF / Datacom", position: "header" },
        { text: "12P Ethernet MDF", position: "footer" },
      ],
    } as DeviceData;

    const up = upgradeJackFieldDeviceData(data, 12);
    expect(up.ports).toHaveLength(12);
    expect(up.ports?.every((p) => p.direction === "passthrough")).toBe(true);
    expect(up.ports?.every((p) => p.frontConnectorType === "rj45")).toBe(true);
  });
});
