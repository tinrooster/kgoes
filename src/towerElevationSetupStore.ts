import { create } from "zustand";
import { useSchematicStore } from "./store";
import {
  buildTowerDraftPageOptsFromSetup,
  defaultTowerElevationSetupOptions,
  towerSetupOptionsFromPage,
  validateTowerElevationSetup,
  type TowerElevationSetupOptions,
} from "./towerElevationSetup";

export interface TowerElevationSetupRequest {
  defaultLabel: string;
  /** When set, apply setup to an existing tower-draft page instead of creating one. */
  pageId?: string;
  onComplete?: (pageId: string) => void;
}

interface TowerElevationSetupStoreState {
  request: TowerElevationSetupRequest | null;
  draft: TowerElevationSetupOptions | null;
  open: (request: TowerElevationSetupRequest) => void;
  openForPage: (page: import("./types").TowerDraftPage) => void;
  close: () => void;
  setDraft: (patch: Partial<TowerElevationSetupOptions>) => void;
  confirm: () => void;
}

export const useTowerElevationSetupStore = create<TowerElevationSetupStoreState>((set, get) => ({
  request: null,
  draft: null,

  open: (request) => {
    set({ request, draft: defaultTowerElevationSetupOptions() });
  },

  openForPage: (page) => {
    set({
      request: { defaultLabel: page.label, pageId: page.id },
      draft: towerSetupOptionsFromPage(page),
    });
  },

  close: () => set({ request: null, draft: null }),

  setDraft: (patch) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, ...patch } });
  },

  confirm: () => {
    const { request, draft } = get();
    if (!request || !draft) return;
    const validation = validateTowerElevationSetup(draft);
    if (!validation.ok) return;
    const opts = buildTowerDraftPageOptsFromSetup(draft);

    if (request.pageId) {
      useSchematicStore.getState().updateTowerDraftPage(request.pageId, opts);
      request.onComplete?.(request.pageId);
    } else {
      const pageId = useSchematicStore.getState().addTowerDraftPage(request.defaultLabel, opts);
      request.onComplete?.(pageId);
    }
    set({ request: null, draft: null });
  },
}));

export function openTowerElevationSetup(request: TowerElevationSetupRequest): void {
  useTowerElevationSetupStore.getState().open(request);
}

export function openTowerElevationSetupForPage(page: import("./types").TowerDraftPage): void {
  useTowerElevationSetupStore.getState().openForPage(page);
}
