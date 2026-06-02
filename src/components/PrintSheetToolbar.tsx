import { useSchematicStore } from "../store";
import { KGO_ES_DRAWING_TAB_LABEL } from "../branding";
import type { PrintSheetPage, RackElevationPage } from "../types";
import { PAPER_SIZES } from "../printConfig";
import { autoFillSheetForElevationPage, autoFillSheetForRack } from "../printSheetAutoFill";
import { runPrintSheetExport } from "../printSheetExport";
import type { PrintLayoutOp } from "../printSheetLayoutUtils";
import {
  isDrawingViewport,
  layoutDrawingViewportOnSheet,
  newDrawingViewportForSheet,
} from "../drawingViewportUtils";
import {
  IconAlignBottom,
  IconAlignHorizontalCentre,
  IconAlignTop,
  IconAlignVerticalCenter,
  IconDistributeSpacingHorizontal,
  IconDistributeSpacingVertical,
  LayoutToolbarButton,
} from "./LayoutToolbarIcons";

interface Props {
  page: PrintSheetPage;
  selectedVpIds: string[];
  onLayout: (op: PrintLayoutOp) => void;
}

export default function PrintSheetToolbar({ page, selectedVpIds, onLayout }: Props) {
  const setPrintSheetPaper = useSchematicStore((s) => s.setPrintSheetPaper);
  const addViewport = useSchematicStore((s) => s.addViewport);
  const updateViewport = useSchematicStore((s) => s.updateViewport);
  const removeViewport = useSchematicStore((s) => s.removeViewport);
  const pushSnapshot = useSchematicStore((s) => s.pushSnapshot);
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const elevationPages = pages.filter((p): p is RackElevationPage => p.type === "rack-elevation");
  const hasDrawing = nodes.length > 0;

  // Print view index display (e.g. "Print View 2 of 3").
  const printSheetPages = pages.filter((p): p is PrintSheetPage => p.type === "print-sheet");
  const sheetIndex = printSheetPages.findIndex((p) => p.id === page.id) + 1;
  const sheetCount = printSheetPages.length;

  const isCustomPaper = page.paperId === "custom";

  const handleAutoFillRack = (elevPageId: string, rackId: string) => {
    const elevPage = elevationPages.find((p) => p.id === elevPageId);
    const rack = elevPage?.racks.find((r) => r.id === rackId);
    if (!elevPage || !rack) return;
    const viewports = autoFillSheetForRack(page, rack, elevPage);
    for (const vp of viewports) addViewport(page.id, vp);
  };

  const handleAutoFillElevationPage = (elevPageId: string) => {
    const elevPage = elevationPages.find((p) => p.id === elevPageId);
    if (!elevPage || elevPage.racks.length === 0) return;
    const viewports = autoFillSheetForElevationPage(page, elevPage);
    for (const vp of viewports) addViewport(page.id, vp);
  };

  const handleAutoFillDrawing = () => {
    const vp = newDrawingViewportForSheet(page, nodes);
    if (vp) addViewport(page.id, vp);
  };

  const selCount = selectedVpIds.length;

  const drawingOnSheet = page.viewports.filter(isDrawingViewport);
  const selectedDrawing = page.viewports.filter((v) => selectedVpIds.includes(v.id) && isDrawingViewport(v));
  const fitDrawingTargets = selectedDrawing.length > 0 ? selectedDrawing : drawingOnSheet;

  const handleFitDrawingToPage = () => {
    const layout = layoutDrawingViewportOnSheet(page, nodes);
    if (!layout || fitDrawingTargets.length === 0) return;
    pushSnapshot();
    for (const vp of fitDrawingTargets) {
      updateViewport(page.id, vp.id, layout);
    }
  };

  return (
    <div
      className="flex flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs dark:!border-slate-700 dark:!bg-slate-900 dark:text-slate-100"
      data-print-hide
    >
    <div className="flex items-center gap-3 px-3 py-1.5 flex-wrap">
      {/* Paper size */}
      <label className="text-[var(--color-text-muted)] uppercase tracking-wider" style={{ fontSize: 9 }}>Paper</label>
      <select
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
        value={page.paperId}
        onChange={(e) => setPrintSheetPaper(page.id, e.target.value, page.orientation, page.customWidthIn, page.customHeightIn)}
      >
        {PAPER_SIZES.map((ps) => <option key={ps.id} value={ps.id}>{ps.label}</option>)}
        <option value="custom">Custom</option>
      </select>

      {/* Custom paper dimensions */}
      {isCustomPaper && (
        <>
          <input
            type="number"
            min={1}
            max={200}
            step={0.01}
            value={page.customWidthIn ?? 24}
            onChange={(e) => setPrintSheetPaper(page.id, "custom", page.orientation, Number(e.target.value), page.customHeightIn ?? 36)}
            className="w-16 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
            title="Width (in)"
          />
          <span className="text-[var(--color-text-muted)]">×</span>
          <input
            type="number"
            min={1}
            max={200}
            step={0.01}
            value={page.customHeightIn ?? 36}
            onChange={(e) => setPrintSheetPaper(page.id, "custom", page.orientation, page.customWidthIn ?? 24, Number(e.target.value))}
            className="w-16 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
            title="Height (in)"
          />
          <span className="text-[var(--color-text-muted)]" style={{ fontSize: 9 }}>in</span>
        </>
      )}

      {/* Orientation */}
      <button
        className={`px-2 py-0.5 rounded border text-xs transition-colors ${page.orientation === "landscape" ? "bg-blue-600 text-white border-blue-600" : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}`}
        onClick={() => setPrintSheetPaper(page.id, page.paperId, page.orientation === "landscape" ? "portrait" : "landscape")}
      >
        {page.orientation === "landscape" ? "↔ Landscape" : "↕ Portrait"}
      </button>

      {/* Title block toggle */}
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={page.showTitleBlock}
          onChange={(e) => {
            const updatedPage = { ...page, showTitleBlock: e.target.checked };
            useSchematicStore.setState((state) => ({
              pages: state.pages.map((p) => p.id === page.id ? updatedPage : p),
            }));
          }}
        />
        <span className="text-[var(--color-text)]">Title Block</span>
      </label>

      <div className="border-l border-[var(--color-border)] h-4" />

      {hasDrawing && fitDrawingTargets.length > 0 && (
        <button
          type="button"
          className="px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] text-xs transition-colors"
          title={
            selectedDrawing.length > 0
              ? "Resize selected drawing view to fill the printable area"
              : "Resize drawing view(s) to fill the printable area"
          }
          onClick={handleFitDrawingToPage}
        >
          Fit drawing to page
        </button>
      )}

      {/* Auto-fill from drawing or rack elevations */}
      {(hasDrawing || elevationPages.length > 0) && (
        <div className="flex items-center gap-1">
          <span className="text-[var(--color-text-muted)]">Auto-Fill from:</span>
          <select
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              if (value === "drawing") {
                handleAutoFillDrawing();
              } else if (value.startsWith("page|")) {
                handleAutoFillElevationPage(value.slice(5));
              } else {
                const [pageId, rackId] = value.split("|");
                if (pageId && rackId) handleAutoFillRack(pageId, rackId);
              }
              e.target.value = "";
            }}
          >
            <option value="">— Pick source —</option>
            {hasDrawing && (
              <option value="drawing">{KGO_ES_DRAWING_TAB_LABEL} — full drawing</option>
            )}
            {elevationPages.map((ep) =>
              ep.racks.length > 1 ? (
                <option key={`page|${ep.id}`} value={`page|${ep.id}`}>
                  {ep.label} — all {ep.racks.length} racks
                </option>
              ) : null,
            )}
            {elevationPages.flatMap((ep) =>
              ep.racks.map((r) => (
                <option key={`${ep.id}|${r.id}`} value={`${ep.id}|${r.id}`}>
                  {ep.label} / {r.label}
                </option>
              )),
            )}
          </select>
        </div>
      )}

      {/* Add viewport manually */}
      {(hasDrawing || elevationPages.length > 0) && (
        <div className="flex items-center gap-1">
          <span className="text-[var(--color-text-muted)]">Add View:</span>
          <select
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              if (value === "drawing") {
                const vp = newDrawingViewportForSheet(page, nodes);
                if (vp) addViewport(page.id, vp);
              } else {
                const [kind, pageId, rackId] = value.split("|");
                if (!kind || !pageId || !rackId) return;
                addViewport(page.id, {
                  kind: kind as "rack-front" | "rack-rear" | "rack-side",
                  rackRefPageId: pageId,
                  rackRefId: rackId,
                  positionMm: { x: 20, y: 20 },
                  sizeMm: { w: 60, h: 80 },
                  showLabel: true,
                });
              }
              e.target.value = "";
            }}
          >
            <option value="">— Pick view —</option>
            {hasDrawing && (
              <option value="drawing">{KGO_ES_DRAWING_TAB_LABEL} · Full drawing</option>
            )}
            {elevationPages.flatMap((ep) =>
              ep.racks.flatMap((r) => [
                <option key={`front|${ep.id}|${r.id}`} value={`rack-front|${ep.id}|${r.id}`}>{r.label} · Front</option>,
                <option key={`rear|${ep.id}|${r.id}`} value={`rack-rear|${ep.id}|${r.id}`}>{r.label} · Rear</option>,
                <option key={`side|${ep.id}|${r.id}`} value={`rack-side|${ep.id}|${r.id}`}>{r.label} · Side</option>,
              ])
            )}
          </select>
        </div>
      )}

      <div className="flex-1" />

      {/* Sheet count */}
      {sheetCount > 1 && (
        <span className="text-[var(--color-text-muted)]" style={{ fontFamily: "monospace", fontSize: 11 }}>
          Print View {sheetIndex} of {sheetCount}
        </span>
      )}

      {/* Clear all */}
      {page.viewports.length > 0 && (
        <button
          className="px-2 py-0.5 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/40 transition-colors"
          onClick={() => { for (const vp of page.viewports) removeViewport(page.id, vp.id); }}
        >
          Clear All
        </button>
      )}

      {/* Export PDF — same handler as File → Export → Export Print Sheets */}
      <button
        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors border border-blue-600"
        onClick={() => { void runPrintSheetExport(); }}
      >
        Export PDF
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-bg)] dark:!border-slate-700 dark:!bg-slate-800">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0 dark:text-slate-300">Align</span>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("align-center-h")}
        title="Align horizontal centers"
      >
        <IconAlignHorizontalCentre />
      </LayoutToolbarButton>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("align-top")}
        title="Align top edges"
      >
        <IconAlignTop />
      </LayoutToolbarButton>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("align-middle-v")}
        title="Align vertical centers"
      >
        <IconAlignVerticalCenter />
      </LayoutToolbarButton>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("align-bottom")}
        title="Align bottom edges"
      >
        <IconAlignBottom />
      </LayoutToolbarButton>
      <span className="text-[var(--color-border)] dark:text-slate-600">|</span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0 dark:text-slate-300">Distribute</span>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("distribute-h")}
        title="Distribute horizontal spacing between outer views"
      >
        <IconDistributeSpacingHorizontal />
      </LayoutToolbarButton>
      <LayoutToolbarButton
        disabled={selCount < 2}
        onClick={() => onLayout("distribute-v")}
        title="Distribute vertical spacing between outer views"
      >
        <IconDistributeSpacingVertical />
      </LayoutToolbarButton>
      <span className="text-[10px] text-[var(--color-text-muted)] ml-auto dark:text-slate-300">
        {selCount < 1
          ? "Drag right (blue) = fully inside · drag left (green) = center inside box"
          : `${selCount} view${selCount === 1 ? "" : "s"} selected`}
      </span>
    </div>
    </div>
  );
}
