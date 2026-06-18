import { useKgoSaveFeedbackStore, clearKgoSaveFeedback } from "../kgoSaveFeedbackStore";
import { KgoDialogFormFeedback } from "./KgoDialogFormFeedback";
import { TiIconButton } from "./ti/TiBase";

/** Persistent save/action feedback below the menu bar (toasts alone are easy to miss). */
export default function KgoSaveFeedbackBanner() {
  const feedback = useKgoSaveFeedbackStore((s) => s.feedback);
  if (!feedback) return null;

  return (
    <div
      data-print-hide
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--ti-divider)",
        background: "var(--ti-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, maxWidth: 960, margin: "0 auto" }}>
        <KgoDialogFormFeedback
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
          className="flex-1"
        />
        <TiIconButton
          icon="x"
          variant="ghost"
          size="sm"
          title="Dismiss"
          onClick={clearKgoSaveFeedback}
        />
      </div>
    </div>
  );
}
