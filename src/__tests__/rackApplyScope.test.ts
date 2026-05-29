import { describe, it, expect, beforeEach } from "vitest";
import { useSchematicStore } from "../store";
import type { DeviceData } from "../types";

const CUSTOM_TPL_ID = "custom-test-tpl";

function resetStore() {
  useSchematicStore.setState({
    nodes: [],
    edges: [],
    customTemplates: [
      {
        id: CUSTOM_TPL_ID,
        deviceType: "switch",
        label: "Test Switch",
        ports: [{ id: "p1", label: "SDI 1", signalType: "sdi", direction: "input" }],
        rackHeightU: 1,
        mountingClass: "rack-full",
      },
    ],
    deviceDefinitionRackMetadata: {},
    facePlateDefinitionLayouts: {},
  });
}

function deviceNode(id: string, patch: Partial<DeviceData> = {}) {
  return {
    id,
    type: "device" as const,
    position: { x: 0, y: 0 },
    data: {
      label: `Device ${id}`,
      deviceType: "switch",
      templateId: CUSTOM_TPL_ID,
      ports: [{ id: "p1", label: "SDI 1", signalType: "sdi" as const, direction: "input" as const }],
      rackHeightU: 1,
      mountingClass: "rack-full" as const,
      ...patch,
    },
  };
}

describe("saveDeviceRackMetadata apply scope", () => {
  beforeEach(() => {
    resetStore();
  });

  it("apply all updates siblings, definition map, and custom template", () => {
    useSchematicStore.setState({
      nodes: [deviceNode("a"), deviceNode("b")],
    });
    const patch = {
      rackHeightU: 2,
      mountingClass: "shelf" as const,
      rackMetadataSource: "explicit" as const,
      rackForm: "shelf-only" as const,
    };

    useSchematicStore.getState().saveDeviceRackMetadata("a", patch, {
      applyToMatching: true,
      updateDefinition: true,
    });

    const state = useSchematicStore.getState();
    expect(state.nodes.find((n) => n.id === "a")?.data.mountingClass).toBe("shelf");
    expect(state.nodes.find((n) => n.id === "b")?.data.mountingClass).toBe("shelf");
    expect(state.deviceDefinitionRackMetadata[`tpl:${CUSTOM_TPL_ID}`]?.mountingClass).toBe("shelf");
    expect(state.customTemplates.find((t) => t.id === CUSTOM_TPL_ID)?.mountingClass).toBe("shelf");
  });

  it("this device only must not update siblings, definition map, or custom template", () => {
    useSchematicStore.setState({
      nodes: [deviceNode("a"), deviceNode("b")],
    });
    const patch = {
      rackHeightU: 2,
      mountingClass: "shelf" as const,
      rackMetadataSource: "explicit" as const,
      rackForm: "shelf-only" as const,
    };

    useSchematicStore.getState().saveDeviceRackMetadata("a", patch, {
      applyToMatching: false,
      updateDefinition: false,
    });

    const state = useSchematicStore.getState();
    expect(state.nodes.find((n) => n.id === "a")?.data.mountingClass).toBe("shelf");
    expect(state.nodes.find((n) => n.id === "b")?.data.mountingClass).toBe("rack-full");
    expect(state.deviceDefinitionRackMetadata[`tpl:${CUSTOM_TPL_ID}`]).toBeUndefined();
    expect(state.customTemplates.find((t) => t.id === CUSTOM_TPL_ID)?.mountingClass).toBe("rack-full");
  });
});
