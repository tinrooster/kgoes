/**
 * trackIT ↔ EasySchematic postMessage bridge (popup / same-origin embed).
 * See trackIT: docs/easyschematic-writeback-protocol.md
 */

import { applyTrackItLink, beginBlankTrackItDrawing } from "./trackitIntegration";
import { mergeNumberingSnapshot, upsertTrackItBlock } from "./trackitNumberingMerge";
import { useSchematicStore } from "./store";
import type { SchematicFile, TrackItNumberBlock, TrackItNumberingState, TrackItLinkContext } from "./types";

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

type TrackItInboundMessage =
  | { type: "TRACKIT_LINK"; payload: TrackItLinkContext }
  | { type: "TRACKIT_LOAD_SCHEMATIC"; payload: SchematicFile }
  | { type: "TRACKIT_NUMBERING_SYNC"; payload: TrackItNumberingSyncPayload }
  | { type: "TRACKIT_NUMBERING_SNAPSHOT"; payload: TrackItNumberingSnapshotPayload };

function isTrackItInbound(data: unknown): data is TrackItInboundMessage {
  if (!data || typeof data !== "object") return false;
  const t = (data as { type?: string }).type;
  return (
    t === "TRACKIT_LINK" ||
    t === "TRACKIT_LOAD_SCHEMATIC" ||
    t === "TRACKIT_NUMBERING_SYNC" ||
    t === "TRACKIT_NUMBERING_SNAPSHOT"
  );
}

function ackToOpener(eventId: string): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "EASYSCHEMATIC_NUMBERING_ACK", eventId }, "*");
    }
  } catch {
    // cross-origin opener
  }
}

function notifyReady(): void {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "EASYSCHEMATIC_READY" }, "*");
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

    if (event.data.type === "TRACKIT_LOAD_SCHEMATIC") {
      const file = event.data.payload;
      if (!file) return;
      const nodes = file.nodes ?? [];
      const edges = file.edges ?? [];
      const store = useSchematicStore.getState();
      const link = file.trackItLink ?? store.trackItLink;

      if (nodes.length === 0 && edges.length === 0) {
        if (link?.drawingId) {
          beginBlankTrackItDrawing(link);
        }
        return;
      }

      store.importFromJSON({ ...file, nodes, edges, trackItLink: link ?? undefined });
      if (link?.drawingId) {
        store.setTrackItLink(link);
      }
      const activeLinkName =
        link?.drawingName?.trim() ?? store.trackItLink?.drawingName?.trim() ?? null;
      if (activeLinkName) {
        store.setSchematicName(activeLinkName);
      }
      useSchematicStore.setState({ isDemo: false });
      store.addToast("Schematic loaded from trackIT", "success");
      return;
    }

    if (event.data.type === "TRACKIT_NUMBERING_SNAPSHOT") {
      applyNumberingSnapshot(event.data.payload);
      return;
    }

    if (event.data.type === "TRACKIT_NUMBERING_SYNC") {
      applyNumberingSync(event.data.payload);
    }
  };

  window.addEventListener("message", onMessage);

  window.setTimeout(() => notifyReady(), 300);
  window.setTimeout(() => notifyReady(), 1200);
}
