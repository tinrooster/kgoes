import type { TrackItLinkContext } from "./types";
import { isTrackItPopupOpener } from "./trackitIntegration";
import { resolveTrackItAppOrigin } from "./plantApiOrigin";

/** trackIT web app origin for deep links from KGO-ES. */
export function getTrackItAppOrigin(): string {
  return resolveTrackItAppOrigin();
}

export function buildTrackItPlantDrawingsUrl(): string {
  return `${getTrackItAppOrigin()}/plant?pt=drawings`;
}

export function buildTrackItPlantDrawingUrl(link: Pick<TrackItLinkContext, "drawingId" | "dwgNumber">): string {
  const p = new URLSearchParams();
  p.set("pt", "drawings");
  p.set("dwg", link.drawingId);
  const dwgn = link.dwgNumber.trim();
  if (dwgn) p.set("dwgn", dwgn);
  return `${getTrackItAppOrigin()}/plant?${p.toString()}`;
}

export function buildTrackItKgoEsUrl(tab?: string): string {
  const p = new URLSearchParams();
  if (tab) p.set("tab", tab);
  const q = p.toString();
  return `${getTrackItAppOrigin()}/kgo-es${q ? `?${q}` : ""}`;
}

function postToTrackItOpener(message: { type: string; url?: string }): boolean {
  if (!isTrackItPopupOpener()) return false;
  try {
    const opener = window.opener;
    if (opener && !opener.closed) {
      opener.postMessage(message, "*");
      opener.focus();
      return true;
    }
  } catch {
    // cross-origin opener
  }
  return false;
}

/** Bring the trackIT tab that opened this popup to the foreground (no navigation). */
export function focusTrackItOpener(): boolean {
  return postToTrackItOpener({ type: "KGO_ES_REQUEST_FOCUS" });
}

/** Focus trackIT opener when opened as popup; otherwise open URL in a new tab. */
export function openTrackItUrl(url: string): void {
  if (postToTrackItOpener({ type: "KGO_ES_REQUEST_NAVIGATE", url })) {
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
