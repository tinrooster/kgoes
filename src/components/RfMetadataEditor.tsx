import { TOWER_FEED_TYPE_OPTIONS } from "../towerDraftFeedType";
import type {
  DbPinAssignment,
  OduMountType,
  RfInstallationMetadata,
  TowerDeviceFeedType,
  RfLicensedMetadata,
  RfLinkMetadata,
  RfModulation,
  RfPathMedium,
  RfPolarization,
  RfPortMetadata,
  SerialPortConfig,
  SignalType,
  SiteNetworkMetadata,
} from "../types";
import { cloneOduHd50Pinout } from "../devices/oduHd50Pinout";
import IpInput from "./IpInput";
import { isValidIpv4, isValidSubnetMask } from "../networkValidation";

export const RF_METADATA_SIGNAL_TYPES: ReadonlySet<SignalType> = new Set([
  "rf",
  "asi",
  "if",
  "intercom",
]);

export const DB_PINOUT_CONNECTORS: ReadonlySet<string> = new Set([
  "db9",
  "db25",
  "db37",
  "db50",
]);

/** Typical pin counts for quick seed in the pinout editor. */
export const DB_CONNECTOR_PIN_COUNT: Record<string, number> = {
  db9: 9,
  db25: 25,
  db37: 37,
  db50: 50,
};

export const SERIAL_SIGNAL_TYPES: ReadonlySet<SignalType> = new Set(["serial", "rs422"]);

const POLARIZATION_OPTIONS: { value: RfPolarization; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
  { value: "lhcp", label: "LHCP" },
  { value: "rhcp", label: "RHCP" },
  { value: "slant", label: "Slant" },
  { value: "other", label: "Other" },
];

const MODULATION_OPTIONS: { value: RfModulation; label: string }[] = [
  { value: "qpsk", label: "QPSK" },
  { value: "16qam", label: "16-QAM" },
  { value: "64qam", label: "64-QAM" },
  { value: "256qam", label: "256-QAM" },
  { value: "fm", label: "FM" },
  { value: "am", label: "AM" },
  { value: "ofdm", label: "OFDM" },
  { value: "other", label: "Other" },
];

const ODU_MOUNT_OPTIONS: { value: OduMountType; label: string }[] = [
  { value: "direct_hub", label: "Direct (hub)" },
  { value: "pole_mount", label: "Pole mount" },
];

const RF_PATH_MEDIUM_OPTIONS: { value: RfPathMedium; label: string }[] = [
  { value: "coax_lmr400", label: "LMR-400" },
  { value: "coax_rigid", label: "Rigid coax" },
  { value: "waveguide", label: "Waveguide" },
  { value: "jumper", label: "Jumper" },
];

function cleanObject<T extends Record<string, unknown>>(obj: T): T | undefined {
  const cleaned = Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function RfLicensedEditor({
  licensed,
  onChange,
  compact,
}: {
  licensed?: RfLicensedMetadata;
  onChange: (next: RfLicensedMetadata | undefined) => void;
  compact?: boolean;
}) {
  const value = licensed ?? {};
  const patch = (updates: Partial<RfLicensedMetadata>) => {
    onChange(cleanObject({ ...value, ...updates }));
  };
  const inputClass =
    "bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500";
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-3 gap-2"}>
      <label className={compact ? undefined : "space-y-0.5"}>
        {!compact && <span className="text-[9px] text-[var(--color-text-muted)]">Call sign</span>}
        <input
          className={compact ? `w-20 ${inputClass}` : `w-full ${inputClass}`}
          value={value.callSign ?? ""}
          onChange={(e) => patch({ callSign: e.target.value || undefined })}
          placeholder="Call sign"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
      <label className={compact ? undefined : "space-y-0.5"}>
        {!compact && <span className="text-[9px] text-[var(--color-text-muted)]">Emission</span>}
        <input
          className={compact ? `w-24 ${inputClass}` : `w-full ${inputClass}`}
          value={value.emissionDesignator ?? ""}
          onChange={(e) => patch({ emissionDesignator: e.target.value || undefined })}
          placeholder="Emission"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
      <label className={compact ? undefined : "space-y-0.5"}>
        {!compact && <span className="text-[9px] text-[var(--color-text-muted)]">Channel</span>}
        <input
          className={compact ? `w-16 ${inputClass}` : `w-full ${inputClass}`}
          value={value.channelLabel ?? ""}
          onChange={(e) => patch({ channelLabel: e.target.value || undefined })}
          placeholder="Channel"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
    </div>
  );
}

export function RfPortMetadataEditor({
  rf,
  onChange,
}: {
  rf?: RfPortMetadata;
  onChange: (next: RfPortMetadata | undefined) => void;
}) {
  const value = rf ?? {};

  const patch = (updates: Partial<RfPortMetadata>) => {
    onChange(cleanObject({ ...value, ...updates }));
  };

  const inputClass =
    "bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500";

  return (
    <div className="flex flex-col gap-1.5 pl-6 pb-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          className={`w-16 ${inputClass}`}
          value={value.band ?? ""}
          onChange={(e) => patch({ band: e.target.value || undefined })}
          placeholder="Band"
          title="Band (e.g. UHF, 18 GHz)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <input
          type="number"
          step="0.1"
          className={`w-20 ${inputClass}`}
          value={value.centerFrequencyMhz ?? ""}
          onChange={(e) =>
            patch({
              centerFrequencyMhz: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          placeholder="MHz"
          title="Center frequency (MHz)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <input
          type="number"
          step="0.1"
          className={`w-16 ${inputClass}`}
          value={value.bandwidthMhz ?? ""}
          onChange={(e) =>
            patch({ bandwidthMhz: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          placeholder="BW MHz"
          title="Bandwidth (MHz)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <input
          type="number"
          step="0.1"
          className={`w-16 ${inputClass}`}
          value={value.txFrequencyMhz ?? ""}
          onChange={(e) =>
            patch({ txFrequencyMhz: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          placeholder="TX MHz"
          title="TX frequency (MHz)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <input
          type="number"
          step="0.1"
          className={`w-16 ${inputClass}`}
          value={value.rxFrequencyMhz ?? ""}
          onChange={(e) =>
            patch({ rxFrequencyMhz: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          placeholder="RX MHz"
          title="RX frequency (MHz)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <select
          className={`${inputClass} cursor-pointer`}
          value={value.polarization ?? ""}
          onChange={(e) =>
            patch({ polarization: (e.target.value || undefined) as RfPolarization | undefined })
          }
          title="Polarization"
        >
          <option value="">Pol —</option>
          {POLARIZATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          className={`w-16 ${inputClass}`}
          value={value.txPowerDbm ?? ""}
          onChange={(e) =>
            patch({ txPowerDbm: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          placeholder="dBm"
          title="TX power (dBm)"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <input
          type="number"
          step="0.01"
          min={1}
          className={`w-14 ${inputClass}`}
          value={value.vswr ?? ""}
          onChange={(e) =>
            patch({ vswr: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          placeholder="VSWR"
          title="VSWR"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      <RfLicensedEditor
        licensed={value.licensed}
        onChange={(licensed) => patch({ licensed })}
        compact
      />
    </div>
  );
}

export function RfLinkMetadataEditor({
  rfLink,
  onChange,
}: {
  rfLink?: RfLinkMetadata;
  onChange: (next: RfLinkMetadata | undefined) => void;
}) {
  const value = rfLink ?? {};
  const patch = (updates: Partial<RfLinkMetadata>) => {
    onChange(cleanObject({ ...value, ...updates }));
  };
  const inputClass =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px] outline-none focus:border-blue-500";

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3 space-y-2">
      <div className="text-[10px] font-medium text-[var(--color-text-heading)]">RF link</div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Remote site</span>
          <input
            className={inputClass}
            value={value.remoteSiteId ?? ""}
            onChange={(e) => patch({ remoteSiteId: e.target.value || undefined })}
            placeholder="Site code"
            title="Far-end catalog site code (e.g. SUTRO, NOC)"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Band</span>
          <input
            className={inputClass}
            value={value.band ?? ""}
            onChange={(e) => patch({ band: e.target.value || undefined })}
            placeholder="e.g. 18 GHz"
            title="Link band label (e.g. 18 GHz, IP / Fiber)"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Distance (mi)</span>
          <input
            type="number"
            step="0.1"
            min={0}
            className={inputClass}
            value={value.distanceMi ?? ""}
            onChange={(e) =>
              patch({ distanceMi: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            title="Link path distance in miles"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Data rate (Mbps)</span>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={value.dataRateMbps ?? ""}
            onChange={(e) =>
              patch({ dataRateMbps: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Bandwidth (MHz)</span>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={value.bandwidthMhz ?? ""}
            onChange={(e) =>
              patch({ bandwidthMhz: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Modulation</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={typeof value.modulation === "string" ? value.modulation : ""}
            onChange={(e) =>
              patch({ modulation: (e.target.value || undefined) as RfModulation | undefined })
            }
          >
            <option value="">—</option>
            {MODULATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <RfLicensedEditor
        licensed={value.licensed}
        onChange={(licensed) => patch({ licensed })}
      />
    </div>
  );
}

export function RfInstallationEditor({
  rfInstallation,
  dishDiameterM,
  onInstallationChange,
  onDishDiameterChange,
}: {
  rfInstallation?: RfInstallationMetadata;
  dishDiameterM?: number;
  onInstallationChange: (next: RfInstallationMetadata | undefined) => void;
  onDishDiameterChange?: (m: number | undefined) => void;
}) {
  const value = rfInstallation ?? {};

  const patch = (updates: Partial<RfInstallationMetadata>) => {
    const next = { ...value, ...updates };
    const hasValue = Object.values(next).some((v) => v != null && !Number.isNaN(v));
    onInstallationChange(hasValue ? next : undefined);
  };

  const inputClass =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px] outline-none focus:border-blue-500";

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3 space-y-2">
      <div className="text-[10px] font-medium text-[var(--color-text-heading)]">Antenna installation</div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Azimuth (°)</span>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={value.azimuthDeg ?? ""}
            onChange={(e) =>
              patch({ azimuthDeg: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Tilt (°)</span>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={value.tiltDeg ?? ""}
            onChange={(e) =>
              patch({ tiltDeg: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Beamwidth (°)</span>
          <input
            type="number"
            step="0.1"
            min={0}
            className={inputClass}
            value={value.beamwidthDeg ?? ""}
            onChange={(e) =>
              patch({ beamwidthDeg: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">ODU mount</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.oduMount ?? ""}
            onChange={(e) =>
              patch({ oduMount: (e.target.value || undefined) as OduMountType | undefined })
            }
          >
            <option value="">—</option>
            {ODU_MOUNT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Feed</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.feedType ?? ""}
            onChange={(e) =>
              patch({
                feedType: (e.target.value || undefined) as TowerDeviceFeedType | undefined,
              })
            }
          >
            <option value="">—</option>
            {TOWER_FEED_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {onDishDiameterChange && (
          <label className="space-y-0.5">
            <span className="text-[9px] text-[var(--color-text-muted)]">Dish (m)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              value={dishDiameterM ?? ""}
              onChange={(e) =>
                onDishDiameterChange(
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              onKeyDown={(e) => e.stopPropagation()}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function RfPathMediumSelect({
  value,
  onChange,
}: {
  value?: RfPathMedium;
  onChange: (next: RfPathMedium | undefined) => void;
}) {
  return (
    <select
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500 cursor-pointer"
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || undefined) as RfPathMedium | undefined)}
      title="RF path medium"
    >
      <option value="">Medium —</option>
      {RF_PATH_MEDIUM_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function DbPinoutEditor({
  pinout,
  onChange,
  connectorType,
  sectionLabel,
}: {
  pinout?: DbPinAssignment[];
  onChange: (next: DbPinAssignment[] | undefined) => void;
  connectorType?: string;
  sectionLabel?: string;
}) {
  const rows = pinout ?? [];
  const seedCount =
    connectorType && DB_CONNECTOR_PIN_COUNT[connectorType]
      ? DB_CONNECTOR_PIN_COUNT[connectorType]
      : undefined;
  const inputClass =
    "bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500";

  const patchRow = (index: number, updates: Partial<DbPinAssignment>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...updates } : r));
    onChange(next.length > 0 ? next : undefined);
  };

  const addRow = () => {
    const nextPin = rows.length > 0 ? Number(rows[rows.length - 1].pin) + 1 || rows.length + 1 : 1;
    onChange([...rows, { pin: nextPin, label: "", signal: "" }]);
  };

  const seedRows = () => {
    if (!seedCount) return;
    onChange(
      Array.from({ length: seedCount }, (_, i) => ({
        pin: i + 1,
        label: `Pin ${i + 1}`,
        signal: "",
      })),
    );
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <div className="flex flex-col gap-1 pl-6 pb-1">
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-[9px] text-[var(--color-text-muted)]">
          {sectionLabel ?? "DB pinout"}
        </span>
        {seedCount != null && (
          <button
            type="button"
            onClick={seedRows}
            className="text-[9px] text-blue-600 hover:text-blue-500 cursor-pointer"
            title={`Create pins 1–${seedCount} with default labels`}
          >
            Seed {seedCount} pins
          </button>
        )}
        {connectorType === "db50" && (
          <button
            type="button"
            onClick={() => onChange(cloneOduHd50Pinout())}
            className="text-[9px] text-emerald-700 hover:text-emerald-600 cursor-pointer"
            title="Import generic ODU HD50 harness (verify vs vendor datasheet)"
          >
            Import ODU HD50 template
          </button>
        )}
      </div>
      {rows.length === 0 && (
        <p className="text-[9px] text-[var(--color-text-muted)] italic">
          {seedCount != null
            ? `Click "Seed ${seedCount} pins" for a numbered template, or "+ Add pin" row by row.`
            : 'Click "+ Add pin" to define assignments.'}
        </p>
      )}
      {rows.map((row, i) => (
        <div key={`${row.pin}-${i}`} className="flex items-center gap-1">
          <input
            className={`w-10 ${inputClass}`}
            value={String(row.pin)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const pin = /^\d+$/.test(raw) ? Number(raw) : raw;
              patchRow(i, { pin });
            }}
            placeholder="#"
            title="Pin number"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className={`flex-1 min-w-0 ${inputClass}`}
            value={row.label}
            onChange={(e) => patchRow(i, { label: e.target.value })}
            placeholder="Label"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className={`w-20 ${inputClass}`}
            value={row.signal ?? ""}
            onChange={(e) => patchRow(i, { signal: e.target.value || undefined })}
            placeholder="Signal"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-red-400/70 hover:text-red-500 text-sm cursor-pointer px-0.5"
            title="Remove pin"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="self-start text-[9px] text-blue-600 hover:text-blue-500 cursor-pointer"
      >
        + Add pin
      </button>
    </div>
  );
}

const SERIAL_PROTOCOL_OPTIONS: { value: NonNullable<SerialPortConfig["protocol"]>; label: string }[] = [
  { value: "rs232", label: "RS-232" },
  { value: "rs422", label: "RS-422" },
  { value: "rs485", label: "RS-485" },
];

export function SerialPortConfigEditor({
  serial,
  onChange,
}: {
  serial?: SerialPortConfig;
  onChange: (next: SerialPortConfig | undefined) => void;
}) {
  const value = serial ?? {};
  const patch = (updates: Partial<SerialPortConfig>) => {
    onChange(cleanObject({ ...value, ...updates }));
  };
  const inputClass =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500";

  return (
    <div className="flex flex-col gap-1.5 pl-6 pb-1">
      <div className="text-[9px] text-[var(--color-text-muted)]">Serial configuration</div>
      <div className="grid grid-cols-3 gap-1.5">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Protocol</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.protocol ?? ""}
            onChange={(e) =>
              patch({ protocol: (e.target.value || undefined) as SerialPortConfig["protocol"] })
            }
          >
            <option value="">—</option>
            {SERIAL_PROTOCOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Baud</span>
          <input
            type="number"
            className={inputClass}
            value={value.baudRate ?? ""}
            onChange={(e) =>
              patch({ baudRate: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            placeholder="9600"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Data bits</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.dataBits ?? ""}
            onChange={(e) =>
              patch({
                dataBits: e.target.value ? (Number(e.target.value) as 7 | 8) : undefined,
              })
            }
          >
            <option value="">—</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Parity</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.parity ?? ""}
            onChange={(e) =>
              patch({ parity: (e.target.value || undefined) as SerialPortConfig["parity"] })
            }
          >
            <option value="">—</option>
            <option value="none">None</option>
            <option value="even">Even</option>
            <option value="odd">Odd</option>
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Stop bits</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.stopBits ?? ""}
            onChange={(e) =>
              patch({
                stopBits: e.target.value ? (Number(e.target.value) as 1 | 2) : undefined,
              })
            }
          >
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Flow control</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={value.flowControl ?? ""}
            onChange={(e) =>
              patch({
                flowControl: (e.target.value || undefined) as SerialPortConfig["flowControl"],
              })
            }
          >
            <option value="">—</option>
            <option value="none">None</option>
            <option value="rts_cts">RTS/CTS</option>
            <option value="xon_xoff">XON/XOFF</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function SiteNetworkMetadataEditor({
  network,
  onChange,
  compact,
}: {
  network?: SiteNetworkMetadata;
  onChange: (next: SiteNetworkMetadata | undefined) => void;
  compact?: boolean;
}) {
  const value = network ?? {};
  const patch = (updates: Partial<SiteNetworkMetadata>) => {
    onChange(cleanObject({ ...value, ...updates }));
  };
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!compact && (
        <div className="text-[10px] font-medium text-[var(--color-text-heading)]">
          Site management network
        </div>
      )}
      <div className={`grid ${compact ? "grid-cols-2 gap-1.5" : "grid-cols-2 gap-2"}`}>
        <IpInput
          value={value.managementIp ?? ""}
          onChange={(v) => patch({ managementIp: v || undefined })}
          placeholder="Management IP"
          validate={isValidIpv4}
        />
        <IpInput
          value={value.subnetMask ?? ""}
          onChange={(v) => patch({ subnetMask: v || undefined })}
          placeholder="Subnet mask"
          validate={isValidSubnetMask}
        />
        <IpInput
          value={value.gateway ?? ""}
          onChange={(v) => patch({ gateway: v || undefined })}
          placeholder="Gateway"
          validate={isValidIpv4}
        />
        <input
          className={`col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500`}
          value={value.vlanSummary ?? ""}
          onChange={(e) => patch({ vlanSummary: e.target.value || undefined })}
          placeholder="VLAN summary (e.g. Mgmt 10, STL 20)"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
