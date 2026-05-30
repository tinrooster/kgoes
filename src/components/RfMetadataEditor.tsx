import type { RfPolarization, RfPortMetadata } from "../types";

const POLARIZATION_OPTIONS: { value: RfPolarization; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
  { value: "lhcp", label: "LHCP" },
  { value: "rhcp", label: "RHCP" },
  { value: "slant", label: "Slant" },
  { value: "other", label: "Other" },
];

export function RfPortMetadataEditor({
  rf,
  onChange,
}: {
  rf?: RfPortMetadata;
  onChange: (next: RfPortMetadata | undefined) => void;
}) {
  const value = rf ?? {};

  const patch = (updates: Partial<RfPortMetadata>) => {
    const next = { ...value, ...updates };
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined && v !== ""),
    ) as RfPortMetadata;
    onChange(Object.keys(cleaned).length > 0 ? cleaned : undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-6 pb-1">
      <input
        className="w-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
        value={value.band ?? ""}
        onChange={(e) => patch({ band: e.target.value || undefined })}
        placeholder="Band"
        title="Band (e.g. UHF, VHF)"
        onKeyDown={(e) => e.stopPropagation()}
      />
      <input
        type="number"
        step="0.1"
        className="w-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
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
      <select
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-500 cursor-pointer"
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
        className="w-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
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
        className="w-14 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
        value={value.vswr ?? ""}
        onChange={(e) =>
          patch({ vswr: e.target.value === "" ? undefined : Number(e.target.value) })
        }
        placeholder="VSWR"
        title="VSWR"
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function RfInstallationEditor({
  rfInstallation,
  onChange,
}: {
  rfInstallation?: import("../types").RfInstallationMetadata;
  onChange: (next: import("../types").RfInstallationMetadata | undefined) => void;
}) {
  const value = rfInstallation ?? {};

  const patch = (updates: Partial<import("../types").RfInstallationMetadata>) => {
    const next = { ...value, ...updates };
    const hasValue = Object.values(next).some((v) => v != null && !Number.isNaN(v));
    onChange(hasValue ? next : undefined);
  };

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3 space-y-2">
      <div className="text-[10px] font-medium text-[var(--color-text-heading)]">Antenna installation</div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">Azimuth (°)</span>
          <input
            type="number"
            step="0.1"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px] outline-none focus:border-blue-500"
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px] outline-none focus:border-blue-500"
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px] outline-none focus:border-blue-500"
            value={value.beamwidthDeg ?? ""}
            onChange={(e) =>
              patch({ beamwidthDeg: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>
    </div>
  );
}
