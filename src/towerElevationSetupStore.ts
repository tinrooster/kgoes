import { create } from "zustand";
import { useSchematicStore } from "./store";
import {
  buildTowerDraftPageOptsFromSetup,
  defaultTowerElevationSetupOptions,
  validateTowerElevationSetup,
  type TowerElevationSetupOptions,
} from "./towerElevationSetup";

export interface TowerElevationSetupRequest {
  defaultLabel: string;
  onComplete?: (pageId: string) => void;
}

interface TowerElevationSetupStoreState {
  request: TowerElevationSetupRequest | null;
  draft: TowerElevationSetupOptions | null;
  open: (request: TowerElevationSetupRequest) => void;
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
    const pageId = useSchematicStore.getState().addTowerDraftPage(request.defaultLabel, opts);
    request.onComplete?.(pageId);
    set({ request: null, draft: null });
  },
}));

export function openTowerElevationSetup(request: TowerElevationSetupRequest): void {
  useTowerElevationSetupStore.getState().open(request);
}
