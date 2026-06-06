import { describe, expect, it } from "vitest";
import { normalizeSchematicPages } from "../drawingPageUtils";
import { migrateSchematic } from "../migrations";

describe("normalizeSchematicPages", () => {
  it("backfills drawing viewports and rack page arrays", () => {
    const pages = normalizeSchematicPages([
      {
        id: "drawing-1",
        label: "Drawing",
        type: "drawing",
        nodes: [],
        edges: [],
      } as never,
      {
        id: "rackpage-1",
        label: "Racks",
        type: "rack-elevation",
      } as never,
    ]);

    expect(pages[0].type).toBe("drawing");
    if (pages[0].type === "drawing") {
      expect(pages[0].viewports.length).toBeGreaterThan(0);
      expect(pages[0].nodes).toEqual([]);
      expect(pages[0].edges).toEqual([]);
    }

    expect(pages[1].type).toBe("rack-elevation");
    if (pages[1].type === "rack-elevation") {
      expect(pages[1].racks).toEqual([]);
      expect(pages[1].placements).toEqual([]);
      expect(pages[1].accessories).toEqual([]);
      expect(pages[1].viewports?.length).toBeGreaterThan(0);
    }
  });

  it("runs at end of migrateSchematic for schema-43 files missing viewports", () => {
    const migrated = migrateSchematic({
      version: 43,
      name: "Legacy",
      nodes: [],
      edges: [],
      pages: [
        {
          id: "drawing-1",
          label: "Drawing",
          type: "drawing",
          nodes: [],
          edges: [],
        },
      ],
    });

    const drawing = migrated.pages[0];
    expect(drawing.type).toBe("drawing");
    expect(drawing.viewports?.length).toBeGreaterThan(0);
  });
});
