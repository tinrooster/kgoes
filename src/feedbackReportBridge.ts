/**
 * KGO-ES → trackIT feedback postMessage bridge (popup opener).
 * trackIT handles Launch/StudioShare persistence via kgoEsFeedbackBridge.
 */

import { isTrackItPopupOpener } from "./trackitIntegration";

export const KGO_ES_FEEDBACK_REPORT_MESSAGE = "KGO_ES_FEEDBACK_REPORT";
export const TRACKIT_FEEDBACK_REPORT_RESULT_MESSAGE = "TRACKIT_FEEDBACK_REPORT_RESULT";

export type FeedbackReportType = "bug" | "feature";

export type KgoEsFeedbackReportPayload = {
  requestId: string;
  reportType: FeedbackReportType;
  notes?: string;
  pageUrl: string;
  screenshotDataUrl: string | null;
  appState: Record<string, unknown>;
};

export type TrackItFeedbackReportResultPayload = {
  requestId: string;
  ok: boolean;
  error?: string;
};

const pending = new Map<string, (result: { ok: boolean; error?: string }) => void>();

let listenerStarted = false;

/** Listen for trackIT submit acknowledgements. */
export function startFeedbackReportBridgeListener(): void {
  if (listenerStarted || typeof window === "undefined") return;
  listenerStarted = true;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type !== TRACKIT_FEEDBACK_REPORT_RESULT_MESSAGE) return;
    const payload = event.data.payload as TrackItFeedbackReportResultPayload | undefined;
    const requestId = payload?.requestId?.trim();
    if (!requestId) return;
    const resolve = pending.get(requestId);
    if (!resolve) return;
    pending.delete(requestId);
    resolve({ ok: !!payload?.ok, error: payload?.error });
  });
}

function randomRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Submit feedback via trackIT opener (Launch auth + org scope). Returns null when not in popup. */
export async function submitFeedbackViaTrackItParent(
  payload: Omit<KgoEsFeedbackReportPayload, "requestId">,
): Promise<{ ok: boolean; error?: string } | null> {
  if (!isTrackItPopupOpener()) return null;

  const requestId = randomRequestId();
  const message = {
    type: KGO_ES_FEEDBACK_REPORT_MESSAGE,
    payload: { ...payload, requestId },
  };

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      resolve({ ok: false, error: "trackIT did not respond in time" });
    }, 20_000);

    pending.set(requestId, (result) => {
      window.clearTimeout(timer);
      resolve(result);
    });

    try {
      const opener = window.opener;
      if (!opener || opener.closed) {
        window.clearTimeout(timer);
        pending.delete(requestId);
        resolve({ ok: false, error: "trackIT window is not available" });
        return;
      }
      opener.postMessage(message, "*");
    } catch {
      window.clearTimeout(timer);
      pending.delete(requestId);
      resolve({ ok: false, error: "Could not reach trackIT" });
    }
  });
}
