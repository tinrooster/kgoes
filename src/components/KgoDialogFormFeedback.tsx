import type { KgoSaveFeedbackVariant } from "../kgoSaveFeedbackStore";

interface KgoDialogFormFeedbackProps {
  variant: KgoSaveFeedbackVariant;
  title?: string;
  message: string;
  className?: string;
}

/** Inline alert for dialogs and save banners — visible when corner toasts are easy to miss. */
export function KgoDialogFormFeedback({
  variant,
  title,
  message,
  className,
}: KgoDialogFormFeedbackProps) {
  const isError = variant === "error";
  const defaultTitle = isError ? "Action failed" : "Saved";

  return (
    <div
      role="alert"
      className={className}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${isError ? "color-mix(in oklab, var(--ti-danger) 45%, var(--ti-border))" : "color-mix(in oklab, var(--ti-success) 40%, var(--ti-border))"}`,
        background: isError ? "var(--ti-danger-soft)" : "var(--ti-success-soft)",
        color: "var(--ti-ink)",
        fontFamily: "var(--ti-font-sans)",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 18,
          height: 18,
          marginTop: 1,
          borderRadius: 999,
          background: isError ? "var(--ti-danger)" : "var(--ti-success)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {isError ? "!" : "✓"}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title ?? defaultTitle}</div>
        <div style={{ color: "var(--ti-ink-2)", fontSize: 12.5 }}>{message}</div>
      </div>
    </div>
  );
}
