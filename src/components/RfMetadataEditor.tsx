import type {
  OduMountType,
  RfInstallationMetadata,
  RfLicensedMetadata,
  RfLinkMetadata,
  RfModulation,
  RfPathMedium,
  RfPolarization,
  RfPortMetadata,
} from "../types";

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
                feedType: (e.target.value || undefined) as "waveguide" | "coax" | undefined,
              })
            }
          >
            <option value="">—</option>
            <option value="coax">Coax</option>
            <option value="waveguide">Waveguide</option>
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
