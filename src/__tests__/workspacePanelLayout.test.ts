import { describe, expect, it } from "vitest";
import {
  DEFAULT_PANEL_LAYOUTS,
  LEGACY_CANVAS_TOOLBAR_FLOAT,
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

  it("defaults canvas toolbar to the top edge", () => {
    expect(DEFAULT_PANEL_LAYOUTS.canvasToolbar.edge).toBe("top");
  });

  it("migrates legacy floated canvas toolbar default to top edge", () => {
    const layouts = normalizePanelLayouts({
      canvasToolbar: {
        edge: "float",
        floatX: LEGACY_CANVAS_TOOLBAR_FLOAT.floatX,
        floatY: LEGACY_CANVAS_TOOLBAR_FLOAT.floatY,
      },
    });
    expect(layouts.canvasToolbar.edge).toBe("top");
  });

  it("keeps a user-moved floated canvas toolbar", () => {
    const layouts = normalizePanelLayouts({
      canvasToolbar: { edge: "float", floatX: 240, floatY: 120 },
    });
    expect(layouts.canvasToolbar.edge).toBe("float");
  });
});

describe("resolveInspectorPlacement", () => {
  it("keeps inspector on the left dock", () => {
    expect(resolveInspectorPlacement("left")).toBe("left");
  });

  it("keeps inspector floating in place", () => {
    expect(resolveInspectorPlacement("float")).toBe("float");
  });

  it("uses right dock by default", () => {
    expect(resolveInspectorPlacement("right")).toBe("right");
  });
});
