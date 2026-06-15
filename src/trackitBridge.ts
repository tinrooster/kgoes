/**
 * trackIT ↔ EasySchematic postMessage bridge (popup / same-origin embed).
 * See trackIT: docs/easyschematic-writeback-protocol.md
 */

import {
  applyTrackItLink,
  beginBlankTrackItDrawing,
  flushPendingTrackItFocusPage,
  loadTrackItDrawingAutosave,
  maybeAutoOpenCadToolsPanel,
  maybeAutoOpenTowerDraftTab,
  queueTrackItFocusPage,
  type TrackItFocusPagePayload,
} from "./trackitIntegration";
import { hasTrackItDrawingAutosave } from "./store";
import { mergeNumberingSnapshot, upsertTrackItBlock } from "./trackitNumberingMerge";
import { useSchematicStore } from "./store";
import { mergeLocationSnapshot } from "./trackitLocationMerge";
import {
  APPEARANCE_SYNC_MESSAGE,
  type AppearanceSyncPayload,
} from "./sharedAppearanceBridge";
import {
  applyTrackItDefaultSaveFolder,
  applyTrackItLocalExportResult,
  TRACKIT_DEFAULT_SAVE_FOLDER_MESSAGE,
  TRACKIT_LOCAL_EXPORT_RESULT_MESSAGE,
  type TrackItDefaultSaveFolderPayload,
  type TrackItLocalExportResultPayload,
} from "./trackitDefaultSaveFolder";
import {
  buildTrackItReportCsv,
  parseTrackItExportTab,
} from "./trackitReportExport";
import type {
  SchematicFile,
  TrackItLocationSnapshotEntry,
  TrackItNumberBlock,
  TrackItNumberingState,
  TrackItLinkContext,
  TrackItTowerSiteContext,
} from "./types";

export type { TrackItNumberBlock, TrackItNumberingState, TrackItLinkContext };

/** Mirrors trackIT NumberingSyncPayload (keep in sync with trackIT_v2). */
export type TrackItNumberingSyncPayload = {
  eventId: string;
  eventType: "number_block_reserved" | "number_block_released" | "number_block_allocated";
  organizationId: string;
  reservationId: string | null;
  start: number;
  end: number;
  blockSize: number;
  offset: number;
  project: string;
  projectCls: string;
  flag?: string;
  notes?: string;
  reservedBy?: string;
  usedNumbers?: number[];
  releasedNumbers?: number[];
  occurredAt: string;
};

export type TrackItNumberingSnapshotPayload = {
  organizationId: string;
  blocks: TrackItNumberBlock[];
};

export type TrackItLocationSnapshotPayload = {
  organizationId: string;
  locations: TrackItLocationSnapshotEntry[];
};

export type TrackItTowerFocusPayload = {
  plantLocationId?: string;
  mountHeightFtAgl?: number;
  openTowerDraftTab?: boolean;
};

type TrackItInboundMessage =
  | { type: "TRACKIT_LINK"; payload: TrackItLinkContext }
  | { type: "TRACKIT_LOAD_DRAWING"; payload: SchematicFile }
  | { type: "TRACKIT_LOAD_SCHEMATIC"; payload: SchematicFile }
  | { type: "TRACKIT_NUMBERING_SYNC"; payload: TrackItNumberingSyncPayload }
  | { type: "TRACKIT_NUMBERING_SNAPSHOT"; payload: TrackItNumberingSnapshotPayload }
  | { type: "TRACKIT_TOWER_SITE_CONTEXT"; payload: TrackItTowerSiteContext }
  | { type: "TRACKIT_TOWER_FOCUS"; payload: TrackItTowerFocusPayload }
  | { type: "TRACKIT_FOCUS_PAGE"; payload: TrackItFocusPagePayload }
  | { type: "TRACKIT_LOCATION_SNAPSHOT"; payload: TrackItLocationSnapshotPayload }
  | { type: "TRACKIT_EXPORT_REPORT"; payload: TrackItExportReportPayload }
  | { type: typeof TRACKIT_DEFAULT_SAVE_FOLDER_MESSAGE; payload: TrackItDefaultSaveFolderPayload }
  | { type: typeof TRACKIT_LOCAL_EXPORT_RESULT_MESSAGE; payload: TrackItLocalExportResultPayload }
  | { type: "TRACKIT_UNDO" }
  | { type: "TRACKIT_UNDO_TO_DEPTH"; depth: number }
  | { type: "TRACKIT_REDO" }
  | { type: typeof APPEARANCE_SYNC_MESSAGE; payload: AppearanceSyncPayload };

export type TrackItExportReportPayload = {
  requestId: string;
  reportTab: string;
  drawingId?: string;
};

function isTrackItInbound(data: unknown): data is TrackItInboundMessage {
  if (!data || typeof data !== "object") return false;
  const t = (data as { type?: string }).type;
  return (
    t === "TRACKIT_LINK" ||
    t === "TRACKIT_LOAD_DRAWING" ||
    t === "TRACKIT_LOAD_SCHEMATIC" ||
    t === "TRACKIT_NUMBERING_SYNC" ||
    t === "TRACKIT_NUMBERING_SNAPSHOT" ||
    t === "TRACKIT_TOWER_SITE_CONTEXT" ||
    t === "TRACKIT_TOWER_FOCUS" ||
    t === "TRACKIT_FOCUS_PAGE" ||
    t === "TRACKIT_LOCATION_SNAPSHOT" ||
    t === "TRACKIT_EXPORT_REPORT" ||
    t === TRACKIT_DEFAULT_SAVE_FOLDER_MESSAGE ||
    t === TRACKIT_LOCAL_EXPORT_RESULT_MESSAGE ||
    t === "TRACKIT_UNDO" ||
    t === "TRACKIT_UNDO_TO_DEPTH" ||
    t === "TRACKIT_REDO" ||
    t === APPEARANCE_SYNC_MESSAGE
  );
}

function postReportToOpener(payload: {
  requestId: string;
  reportTab: string;
  filename: string;
  csv: string;
  rowCount: number;
  error?: string;
}): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "KGO_ES_REPORT", payload }, "*");
    }
  } catch {
    // cross-origin opener
  }
}

function applyAppearanceSync(payload: AppearanceSyncPayload): void {
  const shell = payload.shell;
  const isDark = shell === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", shell);
  try {
    localStorage.setItem("trackit-shared-appearance", shell);
    localStorage.setItem("easyschematic-theme", shell);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("trackit-shared-appearance-change", { detail: payload }));
}

function applyTowerFocus(payload: TrackItTowerFocusPayload): void {
  const store = useSchematicStore.getState();
  if (payload.openTowerDraftTab !== false) {
    maybeAutoOpenTowerDraftTab();
  }
  const pages = useSchematicStore.getState().pages;
  const page = pages.find((p) => p.type === "tower-draft");
  if (!page || page.type !== "tower-draft") return;
  const placement = payload.plantLocationId
    ? page.placements.find((p) => p.plantLocationId === payload.plantLocationId)
    : undefined;
  store.requestTowerDraftFocus({
    pageId: page.id,
    placementId: placement?.id,
    mountHeightFtAgl: placement?.mountHeightFtAgl ?? payload.mountHeightFtAgl,
  });
}

function ackToOpener(eventId: string): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "KGO_ES_NUMBERING_ACK", eventId }, "*");
    }
  } catch {
    // cross-origin opener
  }
}

function notifyReady(): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "KGO_ES_READY" }, "*");
    }
  } catch {
    // ignore
  }
}

function formatRange(start: number, end: number): string {
  return start === end ? String(start) : `${start}–${end}`;
}

function commitNumberingState(
  organizationId: string,
  blocks: TrackItNumberBlock[],
  opts?: { lastEventId?: string; lastEventAt?: string; activateReservationId?: string | null },
): void {
  const store = useSchematicStore.getState();
  store.setTrackItNumbering({
    organizationId,
    blocks,
    lastEventId: opts?.lastEventId ?? store.trackItNumbering?.lastEventId,
    lastEventAt: opts?.lastEventAt ?? store.trackItNumbering?.lastEventAt,
  });
  if (opts?.activateReservationId) {
    store.setActiveTrackItReservationId(opts.activateReservationId);
  }
}

function applyNumberingSnapshot(payload: TrackItNumberingSnapshotPayload): void {
  const store = useSchematicStore.getState();
  const prev = store.trackItNumbering;
  const blocks = mergeNumberingSnapshot(prev, payload.organizationId, payload.blocks);
  const active =
    store.activeTrackItReservationId &&
    blocks.some((b) => b.reservationId === store.activeTrackItReservationId && b.status === "reserved")
      ? store.activeTrackItReservationId
      : blocks.find((b) => b.status === "reserved")?.reservationId ?? null;

  commitNumberingState(payload.organizationId, blocks, { activateReservationId: active });
  const reservedCount = blocks.filter((b) => b.status === "reserved").length;
  if (reservedCount > 0) {
    store.addToast(`trackIT numbering updated · ${reservedCount} reserved block(s)`, "info", 3500);
  }
}

function applyNumberingSync(payload: TrackItNumberingSyncPayload): void {
  const store = useSchematicStore.getState();
  const prev: TrackItNumberingState = store.trackItNumbering ?? { blocks: [] };
  let blocks = [...(prev.blocks ?? [])];

  const base: TrackItNumberBlock = {
    reservationId: payload.reservationId,
    start: payload.start,
    end: payload.end,
    blockSize: payload.blockSize,
    offset: payload.offset,
    project: payload.project,
    projectCls: payload.projectCls,
    flag: payload.flag,
    status: "reserved",
    updatedAt: payload.occurredAt,
  };

  let activateId: string | null = null;

  if (payload.eventType === "number_block_reserved") {
    blocks = upsertTrackItBlock(blocks, { ...base, status: "reserved" });
    activateId = payload.reservationId;
    store.addToast(
      `Reserved ${formatRange(payload.start, payload.end)} — select block in trackIT Numbers`,
      "success",
      4000,
    );
  } else if (payload.eventType === "number_block_released") {
    blocks = upsertTrackItBlock(blocks, { ...base, status: "released" });
    store.addToast(`trackIT released block ${formatRange(payload.start, payload.end)}`, "info");
  } else if (payload.eventType === "number_block_allocated") {
    blocks = upsertTrackItBlock(blocks, {
      ...base,
      status: "allocated",
      usedNumbers: payload.usedNumbers,
      releasedNumbers: payload.releasedNumbers,
    });
    const used = payload.usedNumbers?.length ?? 0;
    const released = payload.releasedNumbers?.length ?? 0;
    store.addToast(
      `trackIT allocated ${used} on ${formatRange(payload.start, payload.end)} · ${released} released`,
      "success",
    );
  }

  commitNumberingState(payload.organizationId, blocks, {
    lastEventId: payload.eventId,
    lastEventAt: payload.occurredAt,
    activateReservationId: activateId,
  });

  ackToOpener(payload.eventId);
}

let bridgeStarted = false;

export function startTrackItBridge(): void {
  if (bridgeStarted) return;
  bridgeStarted = true;

  const onMessage = (event: MessageEvent) => {
    if (!isTrackItInbound(event.data)) return;

    if (event.data.type === "TRACKIT_LINK") {
      const link = event.data.payload;
      if (link?.drawingId) applyTrackItLink(link);
      return;
    }

    if (event.data.type === "TRACKIT_LOAD_DRAWING" || event.data.type === "TRACKIT_LOAD_SCHEMATIC") {
      const file = event.data.payload;
      if (!file) return;
      const nodes = file.nodes ?? [];
      const edges = file.edges ?? [];
      const pages = file.pages ?? [];
      const store = useSchematicStore.getState();
      const link = file.trackItLink ?? store.trackItLink;

      if (nodes.length === 0 && edges.length === 0 && pages.length === 0) {
        if (link?.drawingId) {
          const hasCanvasContent =
            store.nodes.length > 0 ||
            store.edges.length > 0 ||
            (store.pages?.length ?? 0) > 0;
          const hasLocalAutosave = hasTrackItDrawingAutosave(link.drawingId);
          if (hasCanvasContent || hasLocalAutosave) {
            if (!hasCanvasContent && hasLocalAutosave) {
              loadTrackItDrawingAutosave(link.drawingId);
            }
            store.setTrackItLink(link);
            const drawingName = link.drawingName?.trim();
            if (drawingName) store.setSchematicName(drawingName);
            return;
          }
          beginBlankTrackItDrawing(link);
        }
        return;
      }

      const currentContent =
        store.nodes.length + store.edges.length + (store.pages?.length ?? 0);
      const incomingContent = nodes.length + edges.length + pages.length;
      if (
        link?.drawingId &&
        store.trackItLink?.drawingId === link.drawingId &&
        currentContent > incomingContent
      ) {
        store.setTrackItLink(link);
        const drawingName = link.drawingName?.trim();
        if (drawingName) store.setSchematicName(drawingName);
        return;
      }

      store.importFromJSON({ ...file, nodes, edges, pages, trackItLink: link ?? undefined });
      if (link?.drawingId) {
        store.setTrackItLink(link);
      }
      const activeLinkName =
        link?.drawingName?.trim() ?? store.trackItLink?.drawingName?.trim() ?? null;
      if (activeLinkName) {
        store.setSchematicName(activeLinkName);
      }
      useSchematicStore.setState({
        trackItUnsavedChanges: false,
        trackItLastPushedAt: new Date().toISOString(),
      });
      store.addToast("Drawing loaded from trackIT", "success");
      window.setTimeout(() => {
        flushPendingTrackItFocusPage();
        maybeAutoOpenTowerDraftTab();
        maybeAutoOpenCadToolsPanel();
      }, 0);
      window.setTimeout(() => flushPendingTrackItFocusPage(), 400);
      return;
    }

    if (event.data.type === "TRACKIT_NUMBERING_SNAPSHOT") {
      applyNumberingSnapshot(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_NUMBERING_SYNC") {
      applyNumberingSync(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_TOWER_SITE_CONTEXT") {
      useSchematicStore.getState().setTrackItTowerContext(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_TOWER_FOCUS") {
      applyTowerFocus(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_FOCUS_PAGE") {
      queueTrackItFocusPage(event.data.payload ?? {});
      window.setTimeout(() => flushPendingTrackItFocusPage(), 0);
      window.setTimeout(() => flushPendingTrackItFocusPage(), 500);
      return;
    }

    if (event.data.type === "TRACKIT_LOCATION_SNAPSHOT") {
      const payload = event.data.payload;
      if (!payload?.locations?.length) return;
      const store = useSchematicStore.getState();
      const merged = mergeLocationSnapshot(
        store.trackItLocations,
        payload.organizationId,
        payload.locations,
      );
      store.setTrackItLocations(merged);
      store.addToast(
        `trackIT locations updated · ${merged.length} rack/room code(s)`,
        "info",
        3000,
      );
      return;
    }

    if (event.data.type === TRACKIT_DEFAULT_SAVE_FOLDER_MESSAGE) {
      applyTrackItDefaultSaveFolder(event.data.payload);
      return;
    }

    if (event.data.type === TRACKIT_LOCAL_EXPORT_RESULT_MESSAGE) {
      applyTrackItLocalExportResult(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_EXPORT_REPORT") {
      const payload = event.data.payload;
      const requestId = payload?.requestId?.trim();
      if (!requestId) return;
      const linkDrawingId = useSchematicStore.getState().trackItLink?.drawingId;
      if (payload.drawingId && linkDrawingId && payload.drawingId !== linkDrawingId) {
        postReportToOpener({
          requestId,
          reportTab: payload.reportTab,
          filename: "",
          csv: "",
          rowCount: 0,
          error: "drawing_mismatch",
        });
        return;
      }
      const tab = parseTrackItExportTab(payload.reportTab);
      if (!tab) {
        postReportToOpener({
          requestId,
          reportTab: payload.reportTab,
          filename: "",
          csv: "",
          rowCount: 0,
          error: "unknown_report_tab",
        });
        return;
      }
      const built = buildTrackItReportCsv(tab);
      if (!built) {
        postReportToOpener({
          requestId,
          reportTab: payload.reportTab,
          filename: "",
          csv: "",
          rowCount: 0,
          error: "build_failed",
        });
        return;
      }
      postReportToOpener({
        requestId,
        reportTab: tab,
        filename: built.filename,
        csv: built.csv,
        rowCount: built.rowCount,
      });
      useSchematicStore.getState().addToast(`Report sent to trackIT · ${built.rowCount} row(s)`, "success", 3000);
      return;
    }

    if (event.data.type === "TRACKIT_UNDO") {
      useSchematicStore.getState().undo();
      return;
    }

    if (event.data.type === "TRACKIT_UNDO_TO_DEPTH") {
      const depth = (event.data as { depth?: number }).depth;
      if (typeof depth === "number" && depth > 0) {
        useSchematicStore.getState().undoToDepth(depth);
      }
      return;
    }

    if (event.data.type === "TRACKIT_REDO") {
      useSchematicStore.getState().redo();
      return;
    }

    if (event.data.type === APPEARANCE_SYNC_MESSAGE) {
      applyAppearanceSync(event.data.payload);
    }
  };

  window.addEventListener("message", onMessage);

  window.setTimeout(() => notifyReady(), 300);
}
