import { create } from "zustand";

export type KgoSaveFeedbackVariant = "error" | "success";

export interface KgoSaveFeedback {
  variant: KgoSaveFeedbackVariant;
  title?: string;
  message: string;
}

interface KgoSaveFeedbackState {
  feedback: KgoSaveFeedback | null;
  setFeedback: (feedback: KgoSaveFeedback | null) => void;
  clearFeedback: () => void;
}

export const useKgoSaveFeedbackStore = create<KgoSaveFeedbackState>((set) => ({
  feedback: null,
  setFeedback: (feedback) => set({ feedback }),
  clearFeedback: () => set({ feedback: null }),
}));

export function publishKgoSaveFeedback(
  message: string,
  variant: KgoSaveFeedbackVariant,
  options?: { title?: string; keepToast?: boolean },
): void {
  useKgoSaveFeedbackStore.getState().setFeedback({
    variant,
    message,
    title: options?.title,
  });
}

export function clearKgoSaveFeedback(): void {
  useKgoSaveFeedbackStore.getState().clearFeedback();
}
