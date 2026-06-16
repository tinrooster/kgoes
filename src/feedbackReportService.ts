import { toJpeg } from "html-to-image";
import { getAppBuildHash, getAppVersion } from "./buildVersion";
import { KGO_ES_NAME } from "./branding";
import { useSchematicStore } from "./store";
import { getTrackItEditorMode } from "./trackitIntegration";
import {
  submitFeedbackViaTrackItParent,
  type FeedbackReportType,
} from "./feedbackReportBridge";
import { isLaunchPlantApiEnabled } from "./plantApiOrigin";
import { submitLaunchFeedbackReport } from "./launchFeedbackClient";

export type { FeedbackReportType };

export type FeedbackSubmitVia = "trackit" | "launch" | "local";

const LOCAL_REPORTS_KEY = "kgo-es:feedback-reports-local";
const MAX_SCREENSHOT_CHARS = 600_000;

export interface FeedbackReportPayload {
  reportType: FeedbackReportType;
  notes?: string;
  pageUrl: string;
  screenshotDataUrl: string | null;
  appState: Record<string, unknown>;
}

function collectKgoEsAppState(pageUrl: string): Record<string, unknown> {
  const store = useSchematicStore.getState();
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const activePage = store.pages.find((p) => p.id === store.activePage);

  return {
    sourceApp: "kgo-es",
    productName: KGO_ES_NAME,
    capturedAt: new Date().toISOString(),
    pageUrl,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    userAgent: navigator.userAgent,
    theme,
    schematicName: store.schematicName,
    trackItLink: store.trackItLink ?? null,
    trackItEditorMode: getTrackItEditorMode(),
    activePageId: store.activePage,
    activePageType: activePage?.type ?? null,
    nodeCount: store.nodes.length,
    edgeCount: store.edges.length,
    pageCount: store.pages?.length ?? 0,
    trackItUnsavedChanges: store.trackItUnsavedChanges,
    appVersion: getAppVersion(),
    appCommit: getAppBuildHash(),
  };
}

async function captureScreenshot(): Promise<string | null> {
  try {
    let dataUrl = await toJpeg(document.body, {
      quality: 0.55,
      pixelRatio: Math.min(1, window.devicePixelRatio || 1),
      cacheBust: true,
      filter: (node) => {
        if (node instanceof Element && node.getAttribute?.("data-feedback-capture-ignore") === "true") {
          return false;
        }
        return true;
      },
    });
    if (dataUrl.length > MAX_SCREENSHOT_CHARS) {
      dataUrl = await toJpeg(document.body, {
        quality: 0.35,
        pixelRatio: Math.min(0.75, window.devicePixelRatio || 1),
        cacheBust: true,
        filter: (node) => {
          if (node instanceof Element && node.getAttribute?.("data-feedback-capture-ignore") === "true") {
            return false;
          }
          return true;
        },
      });
    }
    if (dataUrl.length > MAX_SCREENSHOT_CHARS) return null;
    return dataUrl;
  } catch {
    return null;
  }
}

function persistLocalReport(payload: FeedbackReportPayload): void {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    const existing = raw ? (JSON.parse(raw) as FeedbackReportPayload[]) : [];
    const next = [
      { ...payload, screenshotDataUrl: payload.screenshotDataUrl?.slice(0, 2000) ?? null },
      ...existing,
    ].slice(0, 50);
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export async function prepareFeedbackSnapshot(
  pageUrl: string,
): Promise<Pick<FeedbackReportPayload, "screenshotDataUrl" | "appState">> {
  const [screenshotDataUrl, appState] = await Promise.all([
    captureScreenshot(),
    Promise.resolve(collectKgoEsAppState(pageUrl)),
  ]);
  return { screenshotDataUrl, appState };
}

export async function submitFeedbackReport(
  payload: FeedbackReportPayload,
): Promise<{ ok: boolean; error?: string; via?: FeedbackSubmitVia }> {
  persistLocalReport(payload);

  const trackItResult = await submitFeedbackViaTrackItParent({
    reportType: payload.reportType,
    notes: payload.notes,
    pageUrl: payload.pageUrl,
    screenshotDataUrl: payload.screenshotDataUrl,
    appState: payload.appState,
  });

  if (trackItResult !== null) {
    return { ...trackItResult, via: "trackit" };
  }

  if (isLaunchPlantApiEnabled()) {
    const launchResult = await submitLaunchFeedbackReport({
      reportType: payload.reportType,
      notes: payload.notes,
      pageUrl: payload.pageUrl,
      screenshotDataUrl: payload.screenshotDataUrl,
      appState: payload.appState,
    });
    return launchResult.ok
      ? { ok: true, via: "launch" }
      : { ok: false, error: launchResult.error, via: "launch" };
  }

  return { ok: true, via: "local" };
}
