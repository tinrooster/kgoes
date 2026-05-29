import { useEffect, useMemo, useRef, useState } from "react";
import { getBundledTemplates } from "../templateApi";
import { scoreTemplate } from "../templateSearch";
import { DEFAULT_SIGNAL_COLORS } from "../signalColors";
import { useSchematicStore } from "../store";
import { useSidebarStore } from "../sidebarStore";
import type { DeviceTemplate } from "../types";
import {
  QUICK_TOOLBAR_ACTIONS,
  useQuickToolbarStore,
  type QuickToolbarActionId,
} from "../quickToolbarPrefs";
import AlignmentMenu from "./AlignmentMenu";

/**
 * User-configurable quick settings bar (hide/show toggles for common view options).
 */
export default function QuickSettingsToolbar() {
  const enabled = useQuickToolbarStore((s) => s.enabled);
  const order = useQuickToolbarStore((s) => s.order);
  const customTemplates = useSchematicStore((s) => s.customTemplates);

  const showCableIdLabels = useSchematicStore((s) => s.showCableIdLabels);
  const setShowCableIdLabels = useSchematicStore((s) => s.setShowCableIdLabels);
  const showCustomLabels = useSchematicStore((s) => s.showCustomLabels);
  const setShowCustomLabels = useSchematicStore((s) => s.setShowCustomLabels);
  const hideUnconnectedPorts = useSchematicStore((s) => s.hideUnconnectedPorts);
  const setHideUnconnectedPorts = useSchematicStore((s) => s.setHideUnconnectedPorts);
  const hideAdapters = useSchematicStore((s) => s.hideAdapters);
  const setHideAdapters = useSchematicStore((s) => s.setHideAdapters);
  const showLineJumps = useSchematicStore((s) => s.showLineJumps);
  const setShowLineJumps = useSchematicStore((s) => s.setShowLineJumps);
  const hiddenSignalTypesStr = useSchematicStore((s) => s.hiddenSignalTypes);
  const showAllSignalTypes = useSchematicStore((s) => s.showAllSignalTypes);
  const showInstallationInfo = useSchematicStore((s) => s.showInstallationInfo);
  const setShowInstallationInfo = useSchematicStore((s) => s.setShowInstallationInfo);
  const expandRightPanel = useSidebarStore((s) => s.expandRightPanel);

  const [deviceQuery, setDeviceQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deviceSearchRef = useRef<HTMLDivElement>(null);

  const anyHidden = !!(hiddenSignalTypesStr && hiddenSignalTypesStr.length > 0);

  const btn =
    "px-2 py-1 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer whitespace-nowrap";
  const btnOn =
    "px-2 py-1 text-[11px] rounded border border-blue-500/50 bg-blue-500/10 text-[var(--color-text)] cursor-pointer whitespace-nowrap";

  const actionMeta = new Map(QUICK_TOOLBAR_ACTIONS.map((a) => [a.id, a]));
  const visibleIds = order.filter((id) => enabled.includes(id));

  const deviceResults = useMemo(() => {
    const q = deviceQuery.trim();
    if (!q) return [];
    const byKey = new Map<string, DeviceTemplate>();
    for (const t of [...getBundledTemplates(), ...customTemplates]) {
      byKey.set(t.id ?? t.deviceType, t);
    }
    return [...byKey.values()]
      .map((template) => ({ template, score: scoreTemplate(template, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.template.label.localeCompare(b.template.label))
      .slice(0, 6)
      .map((x) => x.template);
  }, [customTemplates, deviceQuery]);

  const quickAddTemplate = (template: DeviceTemplate) => {
    window.dispatchEvent(new CustomEvent("kgoes:quick-add-device", { detail: { template } }));
    setDeviceQuery("");
    setDropdownOpen(false);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!deviceSearchRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const isActive = (id: QuickToolbarActionId): boolean => {
    switch (id) {
      case "hideUnconnected":
        return hideUnconnectedPorts;
      case "hideAdapters":
        return hideAdapters;
      case "hideCableIds":
        return !showCableIdLabels;
      case "hideCustomLabels":
        return !showCustomLabels;
      case "hideInstallInfo":
        return !showInstallationInfo;
      case "hideAllSignals":
        return anyHidden;
      case "showLineJumps":
        return showLineJumps;
      default:
        return false;
    }
  };

  const toggle = (id: QuickToolbarActionId): void => {
    switch (id) {
      case "hideUnconnected":
        setHideUnconnectedPorts(!hideUnconnectedPorts);
        break;
      case "hideAdapters":
        setHideAdapters(!hideAdapters);
        break;
      case "hideCableIds":
        setShowCableIdLabels(!showCableIdLabels);
        break;
      case "hideCustomLabels":
        setShowCustomLabels(!showCustomLabels);
        break;
      case "hideInstallInfo":
        setShowInstallationInfo(!showInstallationInfo);
        break;
      case "hideAllSignals":
        if (anyHidden) {
          showAllSignalTypes();
        } else {
          const allTypes = Object.keys(DEFAULT_SIGNAL_COLORS).sort().join(",");
          useSchematicStore.setState({ hiddenSignalTypes: allTypes });
          useSchematicStore.getState().saveToLocalStorage();
        }
        break;
      case "showLineJumps":
        setShowLineJumps(!showLineJumps);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
      data-print-hide
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mr-1">
        Quick
      </span>
      {visibleIds.map((id) => {
        const meta = actionMeta.get(id);
        if (!meta) return null;
        return (
          <button
            key={id}
            type="button"
            className={isActive(id) ? btnOn : btn}
            title={meta.title ?? meta.label}
            onClick={() => toggle(id)}
          >
            {meta.label}
          </button>
        );
      })}
      <button
        type="button"
        className={btn}
        title="Full view options panel"
        onClick={() => expandRightPanel("viewOptions")}
      >
        More…
      </button>
      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
      <AlignmentMenu variant="toolbar" />
      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
      <div ref={deviceSearchRef} className="relative flex items-center gap-1">
        <input
          value={deviceQuery}
          onChange={(e) => {
            setDeviceQuery(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (deviceResults[0]) {
                quickAddTemplate(deviceResults[0]);
              }
            }
            if (e.key === "Escape") {
              setDropdownOpen(false);
            }
          }}
          placeholder="Devices…"
          className="w-40 rounded border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-blue-500"
          title="Search devices to add to drawing"
        />
        <button type="button" className={btn} onClick={() => deviceResults[0] && quickAddTemplate(deviceResults[0])}>
          Add
        </button>
        {dropdownOpen && deviceQuery.trim() && deviceResults.length > 0 && (
          <div className="absolute top-[calc(100%+4px)] left-0 z-30 w-72 rounded border border-[var(--color-border)] bg-white shadow-lg p-1">
            {deviceResults.map((template) => (
              <button
                key={template.id ?? template.deviceType}
                type="button"
                className="w-full text-left px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer"
                onClick={() => quickAddTemplate(template)}
                title="Add this device at canvas center"
              >
                <div className="text-[11px] text-[var(--color-text)] truncate">{template.label}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                  {template.manufacturer || template.deviceType}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
