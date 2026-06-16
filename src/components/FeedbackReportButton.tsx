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
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--ti-border)",
          background: "var(--ti-surface)",
          borderRadius: 7,
          cursor: "pointer",
          color: "var(--ti-ink)",
          boxShadow: "0 1px 2px color-mix(in oklab, var(--ti-ink) 8%, transparent)",
          transition: "background 100ms, border-color 100ms",
        }}
        className="hover:bg-[var(--ti-surface-2,#f0eeea)] hover:border-[color-mix(in_oklab,var(--ti-accent)_35%,var(--ti-border))]"
      >
        <TiIcon name="alert" size={17} color="currentColor" />
      </button>
      {open && <FeedbackReportDialog onClose={() => setOpen(false)} />}
    </>
  );
}
