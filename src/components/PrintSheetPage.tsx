import { useCallback, useEffect, useState } from "react";
import { useSchematicStore } from "../store";
import { computePrintLayout, type PrintLayoutOp } from "../printSheetLayoutUtils";
import PrintSheetToolbar from "./PrintSheetToolbar";
import PrintSheetSidebar from "./PrintSheetSidebar";
import PrintSheetRenderer from "./PrintSheetRenderer";
import type { PrintSheetPage as PrintSheetPageType } from "../types";

export default function PrintSheetPage() {
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const updateViewport = useSchematicStore((s) => s.updateViewport);
  const pushSnapshot = useSchematicStore((s) => s.pushSnapshot);

  const [selectedVpIds, setSelectedVpIds] = useState<string[]>([]);

  const page = pages.find((p) => p.id === activePage);
  const sheet = page?.type === "print-sheet" ? (page as PrintSheetPageType) : null;

  useEffect(() => {
    setSelectedVpIds([]);
  }, [sheet?.id]);

  const handleLayout = useCallback(
    (op: PrintLayoutOp) => {
      if (!sheet || selectedVpIds.length < 2) return;
      const updates = computePrintLayout(sheet.viewports, selectedVpIds, op);
      if (updates.size === 0) return;
      pushSnapshot();
      for (const [id, positionMm] of updates) {
        updateViewport(sheet.id, id, { positionMm });
      }
    },
    [sheet, selectedVpIds, pushSnapshot, updateViewport],
  );

  if (!sheet) return null;

  return (
    <div className="flex flex-1 overflow-hidden flex-col">
      <PrintSheetToolbar
        page={sheet}
        selectedVpIds={selectedVpIds}
        onLayout={handleLayout}
      />
      <div className="flex flex-1 overflow-hidden">
        <PrintSheetSidebar />
        <PrintSheetRenderer
          page={sheet}
          selectedVpIds={selectedVpIds}
          onSelectionChange={setSelectedVpIds}
        />
      </div>
    </div>
  );
}
