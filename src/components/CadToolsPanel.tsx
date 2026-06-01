import type { ReactNode } from "react";
import { schematicFlowRef } from "../schematicFlowRef";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import {
  insertCadDiagonalLine,
  insertCadDimensionLine,
  insertCadFenceFrame,
  insertCadLeader,
  insertCadNorthArrow,
  insertCadScaleBar,
} from "../towerSiteCadInsert";
import ToolPalettePanel, { type ToolPaletteSection } from "./ToolPalettePanel";
import { TiIcon } from "./ti/TiBase";

const iconStroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };

function CadIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden>
      {children}
    </svg>
  );
}

export default function CadToolsPanel({ mobile, onClose }: { mobile?: boolean; onClose?: () => void } = {}) {
  const flowReady = useSchematicStore((s) => s.schematicCanvasReady);
  const setNoteCadLocked = useSchematicStore((s) => s.setNoteCadLocked);
  const rightExpanded = useSidebarStore((s) => s.rightCadToolsExpanded);
  const setRightExpanded = useSidebarStore((s) => s.setRightCadToolsExpanded);

  const run = (fn: (rf: NonNullable<typeof schematicFlowRef.current>) => void) => {
    const rf = schematicFlowRef.current;
    if (!rf) {
      useSchematicStore.getState().addToast("Schematic canvas is still loading…", "info", 2500);
      return;
    }
    fn(rf);
    onClose?.();
  };

  const unlockSelectedCad = () => {
    const locked = useSchematicStore
      .getState()
      .nodes.filter((n) => n.selected && n.type === "note" && (n.data as { cadLocked?: boolean }).cadLocked);
    if (locked.length === 0) {
      useSchematicStore.getState().addToast("Select a locked CAD note to unlock", "info", 2800);
      return;
    }
    for (const n of locked) {
      setNoteCadLocked(n.id, false);
    }
    useSchematicStore.getState().addToast(`Unlocked ${locked.length} note(s)`, "success", 2500);
  };

  const lockSelectedCad = () => {
    const notes = useSchematicStore.getState().nodes.filter((n) => n.selected && n.type === "note");
    if (notes.length === 0) {
      useSchematicStore.getState().addToast("Select a note to lock as CAD layer", "info", 2800);
      return;
    }
    for (const n of notes) {
      setNoteCadLocked(n.id, true);
    }
    useSchematicStore.getState().addToast(`Locked ${notes.length} note(s)`, "success", 2500);
  };

  const disabled = !flowReady;

  const sections: ToolPaletteSection[] = [
    {
      title: "Dimensions",
      actions: [
        {
          id: "dimension",
          label: "Dimension",
          title: "Resizable dimension line at viewport center",
          disabled,
          icon: (
            <CadIcon>
              <path {...iconStroke} d="M3 12h10M3 10v4M13 10v4" />
            </CadIcon>
          ),
          onClick: () => run(insertCadDimensionLine),
        },
        {
          id: "callout",
          label: "Callout",
          title: "Leader with editable label",
          disabled,
          icon: <TiIcon name="flag" size={14} />,
          onClick: () => run(insertCadLeader),
        },
      ],
    },
    {
      title: "Sheet",
      actions: [
        {
          id: "north",
          label: "North",
          title: "North arrow",
          disabled,
          icon: (
            <CadIcon>
              <path {...iconStroke} d="M8 3v10M8 3l-3 3M8 3l3 3" />
            </CadIcon>
          ),
          onClick: () => run(insertCadNorthArrow),
        },
        {
          id: "scale",
          label: "Scale",
          title: "100′ scale bar",
          disabled,
          icon: (
            <CadIcon>
              <path {...iconStroke} d="M2 10h12M2 8v4M14 8v4" />
            </CadIcon>
          ),
          onClick: () => run(insertCadScaleBar),
        },
      ],
    },
    {
      title: "Layout",
      actions: [
        {
          id: "fence",
          label: "Fence",
          title: "Dashed compound / fence frame",
          disabled,
          icon: (
            <CadIcon>
              <rect {...iconStroke} x="3" y="4" width="10" height="8" strokeDasharray="2 2" />
            </CadIcon>
          ),
          onClick: () => run(insertCadFenceFrame),
        },
        {
          id: "diagonal",
          label: "Diagonal",
          disabled,
          icon: (
            <CadIcon>
              <path {...iconStroke} d="M4 12L12 4" />
            </CadIcon>
          ),
          onClick: () => run(insertCadDiagonalLine),
        },
      ],
    },
    {
      title: "Layer",
      actions: [
        {
          id: "unlock",
          label: "Unlock",
          title: "Unlock selected CAD notes",
          tone: "warning",
          icon: <TiIcon name="unlock" size={14} />,
          onClick: unlockSelectedCad,
        },
        {
          id: "lock",
          label: "Lock",
          title: "Lock selected notes as CAD layer",
          icon: <TiIcon name="lock" size={14} />,
          onClick: lockSelectedCad,
        },
      ],
    },
  ];

  return (
    <ToolPalettePanel
      panelId="cadTools"
      title="CAD tools"
      railLabel="CAD"
      expanded={mobile ? true : rightExpanded}
      setExpanded={setRightExpanded}
      sections={sections}
      mobile={mobile}
      onClose={onClose}
      headerIcon={
        <CadIcon>
          <path {...iconStroke} d="M4 14L12 2M6 4h2v2M10 10h2v2" />
        </CadIcon>
      }
    />
  );
}
