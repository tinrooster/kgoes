import { useState } from "react";
import { TiIcon } from "./ti/TiBase";
import FeedbackReportDialog from "./FeedbackReportDialog";

interface FeedbackReportButtonProps {
  /** Desktop titlebar vs compact mobile */
  variant?: "desktop" | "mobile";
}

/** Titlebar control — opens bug / feature feedback dialog with auto-capture. */
export default function FeedbackReportButton({ variant = "desktop" }: FeedbackReportButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Report a bug or request a feature"
          aria-label="Report a bug or request a feature"
          className="p-2 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
        >
          <TiIcon name="alert" size={18} color="currentColor" />
        </button>
        {open && <FeedbackReportDialog onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a bug or request a feature"
        aria-label="Report a bug or request a feature"
        style={{
          width: 30,
          height: 30,
          display: "grid",
          placeItems: "center",
          border: 0,
          background: "transparent",
          borderRadius: 7,
          cursor: "pointer",
          color: "var(--ti-ink-2)",
          transition: "background 100ms",
        }}
        className="hover:bg-[var(--ti-surface-2,#f0eeea)]"
      >
        <TiIcon name="alert" size={16} color="var(--ti-ink-2)" />
      </button>
      {open && <FeedbackReportDialog onClose={() => setOpen(false)} />}
    </>
  );
}
