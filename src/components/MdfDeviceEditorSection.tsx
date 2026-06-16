import type { DeviceData, MdfDisplayMode, Port, SignalType } from "../types";
import { SIGNAL_LABELS } from "../types";
import type { MountingClass } from "../rackMount";
import {
  inferMdfGrid,
  rebuildMdfPassthroughPorts,
  resolveMdfLayout,
  resolveMdfSignalType,
} from "../mdfPortLabels";
import { isMdfMultiPairPanel } from "../mdfDisplay";

const MDF_SIGNAL_OPTIONS: SignalType[] = ["sdi", "ethernet", "analog-audio", "custom"];

export interface MdfEditorState {
  mdfRows: number;
  mdfPortsPerRow: number;
  mdfSignalType: SignalType;
  mdfPairLabel: string;
  mdfDisplayMode: MdfDisplayMode | "inherit";
  rackHeightU: number | undefined;
  mountingClass: MountingClass;
  rackLocation: string;
  frameSlot: string;
  designation: string;
  designationLocked: boolean;
  showInstallationBlock: boolean | undefined;
}

export function mdfEditorStateFromDevice(node: DeviceData): MdfEditorState {
  const layout = resolveMdfLayout(node);
  return {
    mdfRows: layout.rows,
    mdfPortsPerRow: layout.portsPerRow,
    mdfSignalType: resolveMdfSignalType(node),
    mdfPairLabel: node.mdfPairLabel ?? "",
    mdfDisplayMode: node.mdfDisplayMode ?? "inherit",
    rackHeightU: node.rackHeightU,
    mountingClass: node.mountingClass ?? "rack-full",
    rackLocation: node.rackLocation ?? "",
    frameSlot: node.frameSlot ?? "",
    designation: node.designation ?? "",
    designationLocked: node.designationLocked ?? false,
    showInstallationBlock: node.showInstallationBlock,
  };
}

export function applyMdfLayoutToPorts(
  existingPorts: Port[],
  state: Pick<MdfEditorState, "mdfRows" | "mdfPortsPerRow" | "mdfSignalType">,
): Port[] {
  return rebuildMdfPassthroughPorts(
    existingPorts,
    Math.max(1, state.mdfRows),
    Math.max(1, state.mdfPortsPerRow),
    state.mdfSignalType,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-heading)] outline-none focus:border-blue-500";

export function MdfDeviceEditorSection({
  state,
  onChange,
  onApplyLayout,
  housenamePreview,
  roomLabel,
  multiPair,
  schematicDefault,
}: {
  state: MdfEditorState;
  onChange: (patch: Partial<MdfEditorState>) => void;
  onApplyLayout: () => void;
  housenamePreview: string;
  roomLabel: string;
  multiPair: boolean;
  schematicDefault: MdfDisplayMode;
}) {
  const pairCount = state.mdfRows * state.mdfPortsPerRow;

  return (
    <div className="space-y-4">
      <div className="border border-[var(--color-border)] rounded-md p-3 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          MDF panel
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Main distribution frame element — panel code (MDA, MDB, …) comes from rack position top-down.
          Port addresses use row-jack (e.g. 1-5, 2-14).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Signal type">
            <select
              className={inputClass}
              value={state.mdfSignalType}
              onChange={(e) => onChange({ mdfSignalType: e.target.value as SignalType })}
            >
              {MDF_SIGNAL_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {SIGNAL_LABELS[st] ?? st}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Canvas view">
            <select
              className={inputClass}
              value={state.mdfDisplayMode}
              onChange={(e) =>
                onChange({
                  mdfDisplayMode: e.target.value as MdfDisplayMode | "inherit",
                })
              }
            >
              <option value="inherit">
                Inherit schematic ({schematicDefault === "inline" ? "inline" : "panel"})
              </option>
              <option value="panel">Panel — all row-ports (patching)</option>
              <option value="inline">Inline — active routes only</option>
            </select>
          </Field>

          {multiPair ? (
            <>
              <Field label="Rows">
                <input
                  type="number"
                  min={1}
                  max={8}
                  className={inputClass}
                  value={state.mdfRows}
                  onChange={(e) =>
                    onChange({ mdfRows: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
              </Field>
              <Field label="Ports per row">
                <input
                  type="number"
                  min={1}
                  max={24}
                  className={inputClass}
                  value={state.mdfPortsPerRow}
                  onChange={(e) =>
                    onChange({
                      mdfPortsPerRow: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
              </Field>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {pairCount} pair{pairCount === 1 ? "" : "s"} · labels 1-1 …{" "}
                  {state.mdfRows}-{state.mdfPortsPerRow}
                </span>
                <button
                  type="button"
                  className="px-2.5 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] cursor-pointer"
                  onClick={onApplyLayout}
                >
                  Apply layout
                </button>
              </div>
            </>
          ) : (
            <Field label="Row-port (inline pair)">
              <input
                className={`${inputClass} es-housename`}
                value={state.mdfPairLabel}
                onChange={(e) => onChange({ mdfPairLabel: e.target.value })}
                placeholder="e.g. 1-5"
              />
            </Field>
          )}
        </div>
      </div>

      <div className="border border-[var(--color-border)] rounded-md p-3 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Rack placement
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rack location">
            <input
              className={inputClass}
              value={state.rackLocation}
              onChange={(e) => onChange({ rackLocation: e.target.value })}
              placeholder="e.g. TD08"
            />
          </Field>
          <Field label="Frame / slot">
            <input
              className={inputClass}
              value={state.frameSlot}
              onChange={(e) => onChange({ frameSlot: e.target.value })}
              placeholder="FRAME 1 SLOT 3/4"
            />
          </Field>
          <Field label="Rack height (U)">
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={state.rackHeightU ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({ rackHeightU: v ? Math.max(1, parseInt(v, 10) || 1) : undefined });
              }}
              placeholder={multiPair ? "2" : "1"}
            />
          </Field>
          <Field label="Mounting">
            <select
              className={inputClass}
              value={state.mountingClass}
              onChange={(e) => onChange({ mountingClass: e.target.value as MountingClass })}
            >
              <option value="rack-full">Full rack width</option>
              <option value="half-rack">Half rack</option>
              <option value="shelf">Shelf</option>
            </select>
          </Field>
          <Field label="Room (linked)">
            <input className={`${inputClass} text-[var(--color-text-muted)]`} value={roomLabel || "—"} readOnly />
          </Field>
          <Field label="Housename">
            <input
              className={`${inputClass} es-housename`}
              value={state.designation}
              onChange={(e) => onChange({ designation: e.target.value, designationLocked: true })}
              placeholder={housenamePreview || "TD08 MDA 1-5"}
            />
            {!state.designationLocked && housenamePreview ? (
              <p className="mt-1 text-[10px] text-emerald-600">Auto: {housenamePreview}</p>
            ) : null}
          </Field>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
          <input
            type="checkbox"
            checked={state.showInstallationBlock === true}
            ref={(el) => {
              if (el) el.indeterminate = state.showInstallationBlock === undefined;
            }}
            onChange={(e) =>
              onChange({
                showInstallationBlock: e.target.checked
                  ? true
                  : state.showInstallationBlock === undefined
                    ? false
                    : undefined,
              })
            }
          />
          Show housename block on canvas
          {state.showInstallationBlock === undefined && (
            <span className="text-[var(--color-text-muted)]">(inherit)</span>
          )}
        </label>
      </div>
    </div>
  );
}

export function isMdfMultiPairFromPorts(ports: Port[]): boolean {
  const draft: DeviceData = { label: "", deviceType: "mdf", ports };
  return isMdfMultiPairPanel(draft);
}

export function suggestMdfGridFromPorts(ports: Port[]): { rows: number; portsPerRow: number } {
  const count = ports.filter((p) => p.direction === "passthrough").length;
  return inferMdfGrid(count || 1);
}
