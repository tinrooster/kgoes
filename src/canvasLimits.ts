/**
 * KGO-ES drawing size limits — editing canvas vs print tiling vs cloud validation.
 *
 * - **Signal-flow canvas**: unbounded (React Flow `nodeExtent` is undefined). Content can
 *   extend arbitrarily; practical limits are browser performance and save validation.
 * - **Print pages**: paper-sized tiles over content (see printConfig / computePageGrid).
 *   More content ⇒ more pages, not a larger single canvas.
 */

/** Cloud API + save validation — max devices per schematic. */
export const MAX_SCHEMATIC_NODES = 1000;

/** Cloud API + save validation — max cable edges per schematic. */
export const MAX_SCHEMATIC_EDGES = 5000;

/** Cloud API — max serialized schematic JSON size (bytes). */
export const MAX_SCHEMATIC_JSON_BYTES = 10 * 1024 * 1024;

/** Print UI — custom paper width/height clamp (inches). */
export const MAX_CUSTOM_PAPER_IN = 200;

/** Grid snap increment (px) on the signal-flow canvas. */
export { GRID_SIZE as CANVAS_GRID_SIZE_PX } from "./gridConstants";

/** Short help shown in New Drawing Setup and print toolbars. */
export const CANVAS_SIZE_HELP =
  "The drawing canvas is unlimited. Print view tiles pages at the chosen paper size (up to 200 in custom). Cloud saves allow up to 1,000 devices and 5,000 connections.";
