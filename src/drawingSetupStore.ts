import { create } from "zustand";
import { applyDrawingSetup } from "./applyDrawingSetup";
import {
  defaultSheetNameForMode,
  getDrawingSetupSkip,
  loadLastDrawingSetup,
  mergeSetupWithRequest,
  resolveBundledTemplate,
  type DrawingSetupOptions,
  type DrawingSetupRequest,
} from "./drawingSetupDefaults";

interface DrawingSetupStoreState {
  request: DrawingSetupRequest | null;
  draft: DrawingSetupOptions | null;
  open: (request: DrawingSetupRequest) => void;
  close: () => void;
  setDraft: (patch: Partial<DrawingSetupOptions>) => void;
  confirm: () => void;
}

export const useDrawingSetupStore = create<DrawingSetupStoreState>((set, get) => ({
  request: null,
  draft: null,

  open: (request) => {
    const base = loadLastDrawingSetup();
    const draft = mergeSetupWithRequest(request, {
      ...base,
      sheetName:
        request.defaultSheetName?.trim() ||
        base.sheetName ||
        defaultSheetNameForMode(request.mode),
    });

    if (getDrawingSetupSkip()) {
      applyDrawingSetup(request.mode, draft, request.trackItLink ?? null);
      request.onComplete?.(undefined);
      return;
    }

    set({ request, draft });
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
    if (draft.templateId === "import-file" && !draft.importFile) return;
    if (
      draft.templateId.startsWith("user:") &&
      !resolveBundledTemplate(draft.templateId)
    ) {
      return;
    }
    const pageId = applyDrawingSetup(request.mode, draft, request.trackItLink ?? null);
    request.onComplete?.(pageId);
    set({ request: null, draft: null });
  },
}));

/** Open setup UI or apply skip defaults. */
export function openNewDrawingSetup(request: DrawingSetupRequest): void {
  useDrawingSetupStore.getState().open(request);
}
