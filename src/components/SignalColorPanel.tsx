import { useState, useCallback, useEffect, useRef } from "react";
import { SIGNAL_LABELS, type SignalType } from "../types";
import {
  DEFAULT_SIGNAL_COLORS,
  applySignalColors,
  loadSignalColors,
  saveSignalColors,
} from "../signalColors";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import { SidebarPanelHeader, SidebarPanelShell, SidebarRail } from "./sidebarChrome";

const SIGNAL_TYPES = Object.keys(DEFAULT_SIGNAL_COLORS) as SignalType[];

export default function SignalColorPanel({ mobile, onClose }: { mobile?: boolean; onClose?: () => void } = {}) {
  const rightExpanded = useSidebarStore((s) => s.rightColorsExpanded);
  const setRightExpanded = useSidebarStore((s) => s.setRightColorsExpanded);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);
  const collapsed = mobile ? false : !rightExpanded;
  const [colors, setColors] = useState<Record<SignalType, string>>(loadSignalColors);

  // Sync colors when schematic is loaded/imported
  // Serialize to string so the effect fires even when signalColors goes from object → undefined
  const storeColorsKey = useSchematicStore((s) =>
    s.signalColors ? JSON.stringify(s.signalColors) : "",
  );
  const hasInitialized = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect -- syncing store state to local state */
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return; // skip initial mount — local state is already correct
    }
    const merged = { ...DEFAULT_SIGNAL_COLORS, ...(storeColorsKey ? JSON.parse(storeColorsKey) : {}) };
    setColors(merged);
  }, [storeColorsKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateColor = useCallback((type: SignalType, color: string) => {
    setColors((prev) => {
      const next = { ...prev, [type]: color };
      document.documentElement.style.setProperty(`--color-${type}`, color);
      saveSignalColors(next);
      useSchematicStore.getState().setSignalColors(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const defaults = { ...DEFAULT_SIGNAL_COLORS };
    setColors(defaults);
    applySignalColors(defaults);
    saveSignalColors(defaults);
    useSchematicStore.getState().setSignalColors(defaults);
  }, []);

  if (!mobile && collapsed) {
    return (
      <SidebarRail label="Colors" title="Signal colors" onExpand={() => expandRightPanel("colors")} />
    );
  }

  return (
    <SidebarPanelShell widthClass="w-48" mobile={mobile}>
      <SidebarPanelHeader
        title="Signal colors"
        onCollapse={() => (mobile ? onClose?.() : setRightExpanded(false))}
        closeMode={!!mobile}
      />

      {/* Color list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {SIGNAL_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer group">
            <input
              type="color"
              value={colors[type]}
              onChange={(e) => updateColor(type, e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border border-[var(--color-border)] p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
            />
            <span className="text-xs text-[var(--color-text)] flex-1">{SIGNAL_LABELS[type]}</span>
            {colors[type] !== DEFAULT_SIGNAL_COLORS[type] && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateColor(type, DEFAULT_SIGNAL_COLORS[type]);
                }}
                className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] transition-opacity"
                title="Reset to default"
              >
                reset
              </button>
            )}
          </label>
        ))}
      </div>

      {/* Reset all */}
      <div className="px-2 py-2 border-t border-[var(--color-border)]">
        <button
          onClick={resetAll}
          className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          Reset all to defaults
        </button>
      </div>
    </SidebarPanelShell>
  );
}
