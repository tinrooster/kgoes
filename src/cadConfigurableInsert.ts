/**
 * Configurable CAD inserts — menu items ending in "…" prompt before placement.
 */
import type { ReactFlowInstance } from "@xyflow/react";
import { promptDialog } from "./appDialogStore";
import {
  insertCadDimensionLine,
  insertCadFenceFrame,
  insertCadLeader,
  insertCadScaleBar,
} from "./towerSiteCadInsert";

function parseFenceSize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter width × height in feet";
  const match = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i.exec(trimmed);
  if (!match) return "Use width × height in feet, e.g. 360×240";
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || height < 40) {
    return "Enter dimensions of at least 40 ft";
  }
  if (width > 2000 || height > 2000) return "Dimensions look too large — use feet";
  return null;
}

export async function promptInsertCadDimensionLine(rf: ReactFlowInstance): Promise<void> {
  const label = await promptDialog({
    title: "Dimension line",
    message: "Set the label shown on the dimension line.",
    label: "Label",
    defaultValue: "150′",
    placeholder: "150′",
    confirmLabel: "Insert",
  });
  if (label == null) return;
  insertCadDimensionLine(rf, label.trim() || "150′");
}

export async function promptInsertCadLeader(rf: ReactFlowInstance): Promise<void> {
  const label = await promptDialog({
    title: "Callout",
    message: "Set the callout text and placement anchor — edit on canvas after insert.",
    label: "Callout text",
    defaultValue: "Callout",
    placeholder: "Equipment note…",
    confirmLabel: "Insert",
  });
  if (label == null) return;
  insertCadLeader(rf, label.trim() || "Callout");
}

export async function promptInsertCadScaleBar(rf: ReactFlowInstance): Promise<void> {
  const label = await promptDialog({
    title: "Scale bar",
    message: "Set the graphic scale label — a single distance or a range.",
    label: "Scale",
    defaultValue: "100′",
    placeholder: "100′ or 50′–200′",
    confirmLabel: "Insert",
  });
  if (label == null) return;
  insertCadScaleBar(rf, label.trim() || "100′");
}

export async function promptInsertCadFenceFrame(rf: ReactFlowInstance): Promise<void> {
  const sizeText = await promptDialog({
    title: "Site fence (dashed)",
    message: "Set the compound outline size in feet (width × height).",
    label: "Size (ft)",
    defaultValue: "360×240",
    placeholder: "360×240",
    confirmLabel: "Insert",
    validate: (value) => parseFenceSize(value),
  });
  if (sizeText == null) return;
  const parsed = sizeText.trim().match(/^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!parsed) {
    insertCadFenceFrame(rf);
    return;
  }
  insertCadFenceFrame(rf, {
    width: Number(parsed[1]),
    height: Number(parsed[2]),
  });
}
