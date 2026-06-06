import { describe, expect, it } from "vitest";
import {
  normalizePanelLayouts,
  resolveInspectorPlacement,
  resolveSnapEdge,
} from "../workspacePanelLayout";

describe("resolveSnapEdge", () => {
  const rect = { left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 } as DOMRect;

  it("snaps devices panel to left edge", () => {
    expect(resolveSnapEdge(10, 400, rect, "devices")).toBe("left");
  });

  it("snaps inspector to right edge", () => {
    expect(resolveSnapEdge(990, 400, rect, "inspector")).toBe("right");
  });

  it("floats when away from edges", () => {
    expect(resolveSnapEdge(500, 400, rect, "viewOptions")).toBe("float");
  });

  it("allows canvas toolbar on top edge", () => {
    expect(resolveSnapEdge(500, 8, rect, "canvasToolbar")).toBe("top");
  });
});

describe("normalizePanelLayouts", () => {
  it("fills missing panels with defaults", () => {
    const layouts = normalizePanelLayouts({
      devices: { edge: "float", floatX: 40, floatY: 50 },
    });
    expect(layouts.devices.edge).toBe("float");
    expect(layouts.inspector.edge).toBe("right");
  });

  it("resets off-screen floated inspector to the right dock", () => {
    const layouts = normalizePanelLayouts({
      inspector: { edge: "float", floatX: 4000, floatY: 2000 },
    });
    expect(layouts.inspector.edge).toBe("right");
  });
});

describe("resolveInspectorPlacement", () => {
  it("pins collapsed inspector to the right rail", () => {
    expect(resolveInspectorPlacement("float", false)).toBe("right");
  });

  it("honors float when expanded", () => {
    expect(resolveInspectorPlacement("float", true)).toBe("float");
  });
});
