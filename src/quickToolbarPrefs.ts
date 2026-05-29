import { create } from "zustand";

export const QUICK_TOOLBAR_PREFS_KEY = "kgo-es-quick-toolbar";

export type QuickToolbarActionId =
  | "lockCanvas"
  | "hideUnconnected"
  | "hideAdapters"
  | "hideCableIds"
  | "hideCustomLabels"
  | "hideInstallInfo"
  | "hideAllSignals"
  | "showLineJumps";

export const QUICK_TOOLBAR_ACTIONS: {
  id: QuickToolbarActionId;
  label: string;
  title?: string;
}[] = [
  {
    id: "lockCanvas",
    label: "Lock canvas",
    title: "Disable selection and editing — pan and zoom still work",
  },
  { id: "hideUnconnected", label: "Hide unconnected", title: "Hide ports with no cable attached" },
  { id: "hideAdapters", label: "Hide adapters" },
  { id: "hideCableIds", label: "Hide cable IDs", title: "trackIT / assigned cable numbers on connections" },
  { id: "hideCustomLabels", label: "Hide custom labels", title: "User text labels on connections (not cable IDs)" },
  { id: "hideInstallInfo", label: "Hide install info", title: "Designation, rack, model on device headers" },
  { id: "hideAllSignals", label: "Hide all signals", title: "Toggle visibility of all signal types" },
  { id: "showLineJumps", label: "Line jumps" },
];

export const DEFAULT_QUICK_TOOLBAR_ENABLED: QuickToolbarActionId[] = [
  "lockCanvas",
  "hideUnconnected",
  "hideCustomLabels",
  "hideCableIds",
];

export const DEFAULT_QUICK_TOOLBAR_ORDER: QuickToolbarActionId[] = [
  "lockCanvas",
  "hideUnconnected",
  "hideCustomLabels",
  "hideCableIds",
  "hideAdapters",
  "hideInstallInfo",
  "hideAllSignals",
  "showLineJumps",
];

interface QuickToolbarPrefs {
  enabled: QuickToolbarActionId[];
  order: QuickToolbarActionId[];
  setEnabled: (ids: QuickToolbarActionId[]) => void;
  setOrder: (ids: QuickToolbarActionId[]) => void;
  toggleAction: (id: QuickToolbarActionId) => void;
}

function loadPrefs(): Pick<QuickToolbarPrefs, "enabled" | "order"> {
  try {
    const raw = localStorage.getItem(QUICK_TOOLBAR_PREFS_KEY);
    if (!raw) {
      return {
        enabled: [...DEFAULT_QUICK_TOOLBAR_ENABLED],
        order: [...DEFAULT_QUICK_TOOLBAR_ORDER],
      };
    }
    const parsed = JSON.parse(raw) as { enabled?: string[]; order?: string[] };
    const valid = new Set(QUICK_TOOLBAR_ACTIONS.map((a) => a.id));
    const enabled = (parsed.enabled ?? DEFAULT_QUICK_TOOLBAR_ENABLED).filter((id): id is QuickToolbarActionId =>
      valid.has(id as QuickToolbarActionId),
    );
    const order = (parsed.order ?? DEFAULT_QUICK_TOOLBAR_ORDER).filter((id): id is QuickToolbarActionId =>
      valid.has(id as QuickToolbarActionId),
    );
    let enabledOut = enabled.length ? enabled : [...DEFAULT_QUICK_TOOLBAR_ENABLED];
    let orderOut = order.length ? order : [...DEFAULT_QUICK_TOOLBAR_ORDER];
    if (!orderOut.includes("lockCanvas")) {
      orderOut = ["lockCanvas", ...orderOut];
    }
    if (raw && !enabledOut.includes("lockCanvas")) {
      enabledOut = ["lockCanvas", ...enabledOut];
    }
    return {
      enabled: enabledOut,
      order: orderOut,
    };
  } catch {
    return {
      enabled: [...DEFAULT_QUICK_TOOLBAR_ENABLED],
      order: [...DEFAULT_QUICK_TOOLBAR_ORDER],
    };
  }
}

function persist(enabled: QuickToolbarActionId[], order: QuickToolbarActionId[]): void {
  try {
    localStorage.setItem(QUICK_TOOLBAR_PREFS_KEY, JSON.stringify({ enabled, order }));
  } catch {
    /* ignore */
  }
}

export const useQuickToolbarStore = create<QuickToolbarPrefs>((set, get) => ({
  ...loadPrefs(),

  setEnabled: (enabled) => {
    set({ enabled });
    persist(enabled, get().order);
  },

  setOrder: (order) => {
    set({ order });
    persist(get().enabled, order);
  },

  toggleAction: (id) => {
    const enabled = get().enabled.includes(id)
      ? get().enabled.filter((x) => x !== id)
      : [...get().enabled, id];
    set({ enabled });
    persist(enabled, get().order);
  },
}));
