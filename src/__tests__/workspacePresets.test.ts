import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  deleteWorkspacePreset,
  emptyWorkspaceSnapshot,
  listWorkspacePresets,
  loadWorkspacePreset,
  saveWorkspacePreset,
  WORKSPACE_PRESETS_KEY,
} from "../workspacePresets";

describe("workspacePresets", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    localStorage.removeItem(WORKSPACE_PRESETS_KEY);
  });

  it("saves and loads a named layout", () => {
    const layout = emptyWorkspaceSnapshot();
    layout.panelLayouts.inspector.edge = "left";
    saveWorkspacePreset("Left inspector", layout);
    const loaded = loadWorkspacePreset("Left inspector");
    expect(loaded?.panelLayouts.inspector.edge).toBe("left");
    expect(listWorkspacePresets()).toHaveLength(1);
  });

  it("overwrites presets with the same name", () => {
    const layout = emptyWorkspaceSnapshot();
    saveWorkspacePreset("Focus", layout);
    layout.panelsVisible.cadTools = true;
    saveWorkspacePreset("Focus", layout);
    expect(listWorkspacePresets()).toHaveLength(1);
    expect(loadWorkspacePreset("Focus")?.panelsVisible.cadTools).toBe(true);
  });

  it("deletes a preset", () => {
    saveWorkspacePreset("Temp", emptyWorkspaceSnapshot());
    expect(deleteWorkspacePreset("Temp")).toBe(true);
    expect(listWorkspacePresets()).toHaveLength(0);
  });
});
