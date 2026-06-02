import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadTowerDraftViewport,
  loadTowerDraftViewportForView,
  saveTowerDraftViewport,
  towerDraftViewportStorageKey,
} from "../towerDraftViewportStorage";

function mockSessionStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
  };
}

describe("towerDraftViewportStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", mockSessionStorage());
  });

  it("round-trips pan/zoom per page and view", () => {
    const key = towerDraftViewportStorageKey("page-1", "profile");
    saveTowerDraftViewport(key, { zoom: 1.75, pan: { x: -120, y: 40 } });
    expect(loadTowerDraftViewport(key)).toEqual({
      zoom: 1.75,
      pan: { x: -120, y: 40 },
    });
    expect(loadTowerDraftViewport(towerDraftViewportStorageKey("page-1", "all-faces"))).toBeNull();
  });

  it("single face inherits all-faces viewport until customized", () => {
    saveTowerDraftViewport(towerDraftViewportStorageKey("p1", "all-faces"), {
      zoom: 2,
      pan: { x: 10, y: 20 },
    });
    expect(loadTowerDraftViewportForView("p1", "N")).toEqual({
      zoom: 2,
      pan: { x: 10, y: 20 },
    });
    saveTowerDraftViewport(towerDraftViewportStorageKey("p1", "N"), {
      zoom: 3,
      pan: { x: 0, y: 0 },
    });
    expect(loadTowerDraftViewportForView("p1", "N")?.zoom).toBe(3);
  });
});
