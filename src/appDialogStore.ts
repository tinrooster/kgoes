import { create } from "zustand";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

export interface PromptDialogOptions {
  title?: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
}

type PendingDialog =
  | { kind: "confirm"; opts: ConfirmDialogOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; opts: PromptDialogOptions; resolve: (value: string | null) => void };

interface AppDialogStoreState {
  active: PendingDialog | null;
  queue: PendingDialog[];
  showConfirm: (opts: ConfirmDialogOptions) => Promise<boolean>;
  showPrompt: (opts: PromptDialogOptions) => Promise<string | null>;
  resolveConfirm: (value: boolean) => void;
  resolvePrompt: (value: string | null) => void;
}

function enqueue(get: () => AppDialogStoreState, set: (partial: Partial<AppDialogStoreState>) => void, item: PendingDialog) {
  const { active, queue } = get();
  if (!active) {
    set({ active: item });
    return;
  }
  set({ queue: [...queue, item] });
}

function popNext(get: () => AppDialogStoreState, set: (partial: Partial<AppDialogStoreState>) => void) {
  const { queue } = get();
  if (queue.length === 0) {
    set({ active: null });
    return;
  }
  const [next, ...rest] = queue;
  set({ active: next, queue: rest });
}

export const useAppDialogStore = create<AppDialogStoreState>((set, get) => ({
  active: null,
  queue: [],

  showConfirm: (opts) =>
    new Promise((resolve) => {
      enqueue(get, set, { kind: "confirm", opts, resolve });
    }),

  showPrompt: (opts) =>
    new Promise((resolve) => {
      enqueue(get, set, { kind: "prompt", opts, resolve });
    }),

  resolveConfirm: (value) => {
    const a = get().active;
    if (a?.kind === "confirm") a.resolve(value);
    popNext(get, set);
  },

  resolvePrompt: (value) => {
    const a = get().active;
    if (a?.kind === "prompt") a.resolve(value);
    popNext(get, set);
  },
}));

export function confirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  return useAppDialogStore.getState().showConfirm(opts);
}

export function promptDialog(opts: PromptDialogOptions): Promise<string | null> {
  return useAppDialogStore.getState().showPrompt(opts);
}
