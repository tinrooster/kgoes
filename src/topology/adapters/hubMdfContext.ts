/**
 * Explains what the matrix view is showing vs building MDF / upstream feeds.
 */

import type { RackElevationPage, SchematicNode } from "../../types";
import { resolveRackDesignation } from "../../rackDesignation";
import { collectHubJackFieldBindings } from "./hubMatrix";

export interface HubMdfContext {
  masterRackLabel: string;
  masterRackCode: string;
  /** Label on master EJF faceplate / plan (upstream side, e.g. "MDF / Datacom"). */
  upstreamFeedLabel: string;
  ethTrunkCallouts: string[];
  jackFieldCount: number;
  jackFieldsOnDrawing: number;
  hasDistributionPlan: boolean;
}

export function describeHubMdfContext(opts: {
  page: RackElevationPage;
  nodes: SchematicNode[];
  masterRackId: string;
  pages: import("../../types").SchematicPage[];
}): HubMdfContext {
  const prefix = opts.page.distributionPlan?.layout?.designationPrefix ?? "RACK";
  const masterRack = opts.page.racks.find((r) => r.id === opts.masterRackId);
  const bindings = collectHubJackFieldBindings(
    opts.page,
    opts.nodes,
    opts.masterRackId,
    prefix,
  );

  const masterBinding = bindings.find((b) => b.isMaster);
  const upstreamFeedLabel =
    opts.page.distributionPlan?.labels?.jackSourceLabel
    ?? masterBinding?.deviceLabel
    ?? "MDF / Datacom";

  const jackIds = new Set(bindings.map((b) => b.deviceNodeId));
  let jackFieldsOnDrawing = 0;
  for (const p of opts.pages) {
    if (p.type !== "drawing") continue;
    const dp = p as import("../../types").DrawingPage;
    for (const n of dp.nodes ?? []) {
      if (jackIds.has(n.id)) jackFieldsOnDrawing += 1;
    }
  }

  const ethTrunkCallouts = (opts.page.crossLinks ?? [])
    .filter((l) => l.fromRackId === opts.masterRackId && l.distributionPresetRole === "eth-trunk")
    .map((l) => l.label);

  return {
    masterRackLabel: masterRack?.label ?? "Master rack",
    masterRackCode: masterRack ? resolveRackDesignation(masterRack, prefix) : "—",
    upstreamFeedLabel,
    ethTrunkCallouts,
    jackFieldCount: bindings.length,
    jackFieldsOnDrawing,
    hasDistributionPlan: !!opts.page.distributionPlan,
  };
}
