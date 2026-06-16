import { useCallback, useEffect, useRef, useState } from "react";
import {
  prepareFeedbackSnapshot,
  submitFeedbackReport,
  type FeedbackReportType,
} from "../feedbackReportService";
import { isTrackItPopupOpener } from "../trackitIntegration";
import { useSchematicStore } from "../store";

interface FeedbackReportDialogProps {
  onClose: () => void;
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function FeedbackReportDialog({ onClose }: FeedbackReportDialogProps) {
  const addToast = useSchematicStore((s) => s.addToast);
  const trackItLink = useSchematicStore((s) => s.trackItLink);
  const [notes, setNotes] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const snapshotRef = useRef<{
    screenshotDataUrl: string | null;
    appState: Record<string, unknown>;
  } | null>(null);

  const pageUrl =
    typeof window !== "undefined"
      ? `kgo-es:${window.location.pathname}${window.location.search}${window.location.hash}`
      : "kgo-es:";

  const beginCapture = useCallback(async () => {
    setCapturing(true);
    try {
      snapshotRef.current = await prepareFeedbackSnapshot(pageUrl);
    } finally {
      setCapturing(false);
    }
  }, [pageUrl]);

  useEffect(() => {
    void beginCapture();
  }, [beginCapture]);

  const handleSubmit = async (reportType: FeedbackReportType) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!snapshotRef.current) {
        await beginCapture();
      }
      const snapshot = snapshotRef.current;
      if (!snapshot) {
        addToast("Could not capture app state. Try again.", "error");
        return;
      }

      const result = await submitFeedbackReport({
        reportType,
        notes,
        pageUrl,
        screenshotDataUrl: snapshot.screenshotDataUrl,
        appState: snapshot.appState,
      });

      if (!result.ok) {
        addToast(result.error ?? "Could not submit feedback", "error", 5000);
        return;
      }

      if (result.via === "local" && !isTrackItPopupOpener()) {
        addToast("Feedback saved on this device", "info", 4000);
      } else if (result.via === "local") {
        addToast("Feedback saved locally — open from trackIT to sync", "info", 5000);
      } else {
        addToast(
          reportType === "bug" ? "Bug report submitted" : "Feature request submitted",
          "success",
          4000,
        );
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const contextLabel = trackItLink?.drawingName?.trim()
    || trackItLink?.dwgNumber?.trim()
    || (isTrackItPopupOpener() ? "trackIT session" : "Standalone");

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl w-[min(calc(100vw-1rem),420px)] flex flex-col"
        data-feedback-capture-ignore="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">Send feedback</h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Screen and app context are captured automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] text-lg leading-none cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="kgo-feedback-notes" className="text-xs font-medium text-[var(--color-text)]">
              Notes (optional)
            </label>
            <textarea
              id="kgo-feedback-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened, or what would you like to see?"
              rows={3}
              disabled={submitting}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-blue-500 resize-y min-h-[72px]"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          {capturing ? (
            <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Spinner />
              Capturing screen and app state…
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Snapshot ready · {contextLabel} · {new Date().toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={capturing || submitting}
              onClick={() => void handleSubmit("bug")}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Spinner /> : <span className="text-base" aria-hidden>🐛</span>}
              Bug report
            </button>
            <button
              type="button"
              disabled={capturing || submitting}
              onClick={() => void handleSubmit("feature")}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Spinner /> : <span className="text-base" aria-hidden>💡</span>}
              Feature request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
