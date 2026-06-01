/**
 * Tower-first equipment editor: mount height, face, azimuth, and RF installation.
 * Used in the tower inspector rail and at the top of Device Editor for on-tower devices.
 */

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import type { DeviceData, OduMountType, RfInstallationMetadata, TowerDraftPage } from "../types";
import {
  mountLateralFromOffsetX,
  mountLateralLabel,
  offsetXForMountLateral,
  TOWER_MOUNT_LATERAL_OPTIONS,
  type TowerMountLateral,
} from "../towerDraftMountLateral";
import { formatHeightFtAgl, ftToM, mToFt, type MeasurementSystem } from "../measurementUnits";
import { resolveDeviceLabel } from "../displayName";
import {
  azimuthToTowerFace,
  isAimableTowerDeviceType,
  resolvePlacementAzimuthDeg,
  resolvePlacementTowerFace,
  type TowerFace,
} from "../towerDraftFaces";
import { isTowerDraftEligibleDeviceType } from "../towerDraftUtils";
import { deviceSiteTone } from "../towerDraftSitePlanData";
import { TiButton, TiIcon } from "./ti/TiBase";

const FACE_ORDER: (TowerFace | "auto")[] = ["auto", "N", "S", "E", "W"];
const FACE_AZIMUTH: Record<TowerFace, number> = { N: 0, E: 90, S: 180, W: 270 };

const ODU_MOUNT_OPTIONS: { value: OduMountType; label: string }[] = [
  { value: "direct_hub", label: "Direct (hub)" },
  { value: "pole_mount", label: "Pole mount" },
];

interface TowerDeviceMountEditorProps {
  page: TowerDraftPage;
  placementId: string;
  measurementSystem: MeasurementSystem;
  showFullDeviceLink?: boolean;
  onOpenFullDeviceEditor?: () => void;
  onOpenTrackIt?: () => void;
  onRemoveFromTower?: () => void;
}

const sectionTitle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ti-muted)",
  marginBottom: 8,
};

const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "var(--ti-muted)",
  marginBottom: 4,
};

const fieldInput: CSSProperties = {
  width: "100%",
  height: 32,
  padding: "0 8px",
  fontSize: 12,
  borderRadius: 7,
  border: "1px solid var(--ti-border)",
  background: "var(--ti-surface)",
  color: "var(--ti-ink)",
  fontFamily: "var(--ti-font-sans)",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    height: 28,
    minWidth: 30,
    padding: "0 10px",
    borderRadius: 7,
    border: `1px solid ${active ? "var(--ti-accent)" : "var(--ti-border)"}`,
    background: active ? "var(--ti-accent-soft)" : "var(--ti-surface)",
    color: active ? "var(--ti-accent-ink)" : "var(--ti-ink-2)",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--ti-font-sans)",
  };
}

export default function TowerDeviceMountEditor({
  page,
  placementId,
  measurementSystem,
  showFullDeviceLink,
  onOpenFullDeviceEditor,
  onOpenTrackIt,
  onRemoveFromTower,
}: TowerDeviceMountEditorProps) {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const useShortNames = useSchematicStore((s) => s.useShortNames);
  const trackItTowerContext = useSchematicStore((s) => s.trackItTowerContext);
  const updateTowerDraftPlacement = useSchematicStore((s) => s.updateTowerDraftPlacement);
  const patchDeviceData = useSchematicStore((s) => s.patchDeviceData);

  const placement = page.placements.find((p) => p.id === placementId);
  if (!placement) return null;

  const data = nodes.find((n) => n.id === placement.deviceNodeId)?.data as DeviceData | undefined;
  const label = data ? resolveDeviceLabel(data, { useShortNames }).text : placement.deviceNodeId;
  const tone = deviceSiteTone(data?.deviceType);
  const rf = data?.rfInstallation ?? {};
  const isAimable = isAimableTowerDeviceType(data?.deviceType);
  const showRf = isTowerDraftEligibleDeviceType(data?.deviceType);
  const resolvedFace = resolvePlacementTowerFace(placement, data, trackItTowerContext);
  const resolvedAz = resolvePlacementAzimuthDeg(placement, data, trackItTowerContext);
  const faceMode: TowerFace | "auto" = placement.towerFace ?? "auto";
  const lateral = mountLateralFromOffsetX(placement.offsetX);
  const bandLabel = data?.ports?.find((p) => p.rf?.band)?.rf?.band ?? "";

  const feedEstFt = Math.round(placement.mountHeightFtAgl * 1.1 + 15);
  const feedMedium =
    rf.feedType === "waveguide"
      ? "WG"
      : data?.deviceType === "outdoor-ptz-camera" ||
          data?.deviceType === "camera" ||
          data?.deviceType === "ptz-camera"
        ? "FIBER"
        : "COAX";

  // rfLink card: match azimuth from context catalog where possible (within ±12°)
  const rfLinkCard = useMemo(() => {
    if (resolvedAz == null) return null;
    return (
      trackItTowerContext?.rfLinks?.find((l) => {
        const diff = Math.abs(l.azimuthDeg - resolvedAz) % 360;
        return Math.min(diff, 360 - diff) < 12;
      }) ?? null
    );
  }, [trackItTowerContext, resolvedAz]);

  const heightDisplayValue =
    measurementSystem === "metric"
      ? Math.round(ftToM(placement.mountHeightFtAgl) * 10) / 10
      : placement.mountHeightFtAgl;

  /** Free-form string while focused — avoids m↔ft round-trip on every keystroke (e.g. "8" → 7.9 m). */
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  useEffect(() => {
    setHeightDraft(null);
  }, [placement.id, placement.mountHeightFtAgl, measurementSystem]);

  const remoteLinks = useMemo(() => {
    const out: { label: string; signal?: string }[] = [];
    for (const edge of edges) {
      let otherId: string | null = null;
      if (edge.source === placement.deviceNodeId) otherId = edge.target as string;
      else if (edge.target === placement.deviceNodeId) otherId = edge.source as string;
      if (!otherId) continue;
      const other = nodes.find((n) => n.id === otherId);
      if (!other || other.type !== "device") continue;
      const otherData = other.data as DeviceData;
      out.push({
        label: resolveDeviceLabel(otherData, { useShortNames }).text,
        signal: (edge.data as { signalType?: string })?.signalType,
      });
    }
    return out;
  }, [edges, nodes, placement.deviceNodeId, useShortNames]);

  const applyHeightFt = (ft: number) => {
    updateTowerDraftPlacement(page.id, placement.id, {
      mountHeightFtAgl: Math.max(0, Math.min(page.towerHeightFtAgl, Math.round(ft))),
    });
  };

  const applyHeightInput = (raw: number) => {
    const ft =
      measurementSystem === "metric" ? Math.round(mToFt(raw)) : Math.round(raw);
    applyHeightFt(ft);
  };

  const commitHeightDraft = () => {
    const raw = heightDraft?.trim() ?? "";
    setHeightDraft(null);
    if (raw === "" || raw === "-" || raw === ".") {
      applyHeightFt(0);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    applyHeightInput(n);
  };

  const patchRf = (updates: Partial<RfInstallationMetadata>) => {
    const next: RfInstallationMetadata = { ...rf, ...updates };
    const hasValue = Object.values(next).some((v) => v != null && v !== "");
    patchDeviceData(placement.deviceNodeId, {
      rfInstallation: hasValue ? next : undefined,
    });
    if (updates.azimuthDeg != null) {
      updateTowerDraftPlacement(page.id, placement.id, {
        towerFace: azimuthToTowerFace(updates.azimuthDeg),
      });
    }
  };

  const setFace = (face: TowerFace | "auto") => {
    if (face === "auto") {
      updateTowerDraftPlacement(page.id, placement.id, { towerFace: undefined });
      return;
    }
    updateTowerDraftPlacement(page.id, placement.id, { towerFace: face });
    patchRf({ azimuthDeg: FACE_AZIMUTH[face] });
  };

  const setAzimuthPreset = (deg: number) => {
    patchRf({ azimuthDeg: deg });
  };

  return (
    <div
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "var(--ti-font-sans)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: "1px solid var(--ti-border)",
            background: `color-mix(in oklab, var(--ti-${tone}) 12%, var(--ti-surface-2))`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <TiIcon name="pin" size={16} color={`var(--ti-${tone})`} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ti-ink)", lineHeight: 1.25 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: "var(--ti-muted)", marginTop: 4 }}>
            {data?.deviceType ?? "device"}
            {bandLabel ? ` · ${bandLabel}` : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: `1px solid color-mix(in oklab, var(--ti-${tone}) 35%, transparent)`,
          background: `color-mix(in oklab, var(--ti-${tone}) 10%, var(--ti-surface))`,
          padding: 11,
        }}
      >
        <div style={sectionTitle}>Mount on tower</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--ti-font-mono)", fontSize: 26, fontWeight: 700, color: "var(--ti-ink)" }}>
            {Math.round(placement.mountHeightFtAgl)}
            <span style={{ fontSize: 14, fontWeight: 600 }}> ft</span>
          </span>
          <span style={{ fontSize: 12, color: "var(--ti-ink-2)" }}>AGL</span>
        </div>

        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={fieldLabel}>
            Height ({measurementSystem === "metric" ? "m" : "ft"} AGL)
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={heightDraft ?? String(heightDisplayValue)}
            onFocus={() => setHeightDraft(String(heightDisplayValue))}
            onChange={(e) => setHeightDraft(e.target.value)}
            onBlur={commitHeightDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={{ ...fieldInput, fontFamily: "var(--ti-font-mono)" }}
            aria-label={`Height (${measurementSystem === "metric" ? "m" : "ft"} AGL)`}
          />
        </label>

        {page.guideBandsFt.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {page.guideBandsFt.map((band) => (
              <button
                key={`${band.ftAgl}-${band.label ?? ""}`}
                type="button"
                style={{
                  ...chipStyle(placement.mountHeightFtAgl === band.ftAgl),
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: "var(--ti-font-mono)",
                }}
                onClick={() => applyHeightFt(band.ftAgl)}
              >
                {band.label ?? `${band.ftAgl}′`}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            <div style={fieldLabel}>Mount position</div>
            <select
              value={lateral === "custom" ? "custom" : lateral}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") return;
                updateTowerDraftPlacement(page.id, placement.id, {
                  offsetX: offsetXForMountLateral(v as TowerMountLateral),
                });
              }}
              style={fieldInput}
            >
              {TOWER_MOUNT_LATERAL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
              {lateral === "custom" && (
                <option value="custom">{mountLateralLabel(placement.offsetX)}</option>
              )}
            </select>
          </label>
          <div>
            <div style={fieldLabel}>Tower face</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {FACE_ORDER.map((f) => (
                <button
                  key={f}
                  type="button"
                  style={chipStyle(faceMode === f)}
                  onClick={() => setFace(f)}
                >
                  {f === "auto" ? "Auto" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isAimable && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              fontSize: 12,
              color: "var(--ti-ink-2)",
            }}
          >
            <input
              type="checkbox"
              checked={placement.mountFlip ?? false}
              onChange={(e) =>
                updateTowerDraftPlacement(page.id, placement.id, {
                  mountFlip: e.target.checked,
                })
              }
            />
            Flip mount (180° bore-sight)
          </label>
        )}

        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--ti-ink-2)",
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span>
            Azimuth <b style={{ fontFamily: "var(--ti-font-mono)" }}>{resolvedAz != null ? `${Math.round(resolvedAz)}°` : "—"}</b>
          </span>
          <span>
            Face <b>{resolvedFace ?? "auto"}</b>
          </span>
          <span>{formatHeightFtAgl(placement.mountHeightFtAgl, measurementSystem)}</span>
        </div>
      </div>

      {showRf && (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid var(--ti-border)",
            background: "var(--ti-surface-2)",
            padding: 11,
          }}
        >
          <div style={sectionTitle}>RF &amp; antenna aim</div>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={fieldLabel}>Azimuth (° true north)</div>
            <input
              type="number"
              step={0.1}
              min={0}
              max={359.9}
              value={rf.azimuthDeg ?? ""}
              onChange={(e) =>
                patchRf({
                  azimuthDeg: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              style={{ ...fieldInput, fontFamily: "var(--ti-font-mono)", fontSize: 14, height: 36 }}
            />
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {(
              [
                ["N", 0],
                ["E", 90],
                ["S", 180],
                ["W", 270],
              ] as const
            ).map(([name, deg]) => (
              <button
                key={name}
                type="button"
                style={chipStyle(rf.azimuthDeg != null && Math.abs(rf.azimuthDeg - deg) < 1)}
                onClick={() => setAzimuthPreset(deg)}
              >
                {name} {deg}°
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label>
              <div style={fieldLabel}>Tilt (°)</div>
              <input
                type="number"
                step={0.1}
                value={rf.tiltDeg ?? ""}
                onChange={(e) =>
                  patchRf({ tiltDeg: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                style={fieldInput}
              />
            </label>
            <label>
              <div style={fieldLabel}>Beamwidth (°)</div>
              <input
                type="number"
                step={0.1}
                min={0}
                value={rf.beamwidthDeg ?? ""}
                onChange={(e) =>
                  patchRf({
                    beamwidthDeg: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                style={fieldInput}
              />
            </label>
            <label>
              <div style={fieldLabel}>Feed</div>
              <select
                value={rf.feedType ?? ""}
                onChange={(e) =>
                  patchRf({
                    feedType: (e.target.value || undefined) as "waveguide" | "coax" | undefined,
                  })
                }
                style={fieldInput}
              >
                <option value="">—</option>
                <option value="coax">Coax</option>
                <option value="waveguide">Waveguide</option>
              </select>
            </label>
          </div>

          {(data?.deviceType === "microwave-dish" || data?.deviceType?.includes("microwave")) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <label>
                <div style={fieldLabel}>ODU mount</div>
                <select
                  value={rf.oduMount ?? ""}
                  onChange={(e) =>
                    patchRf({ oduMount: (e.target.value || undefined) as OduMountType | undefined })
                  }
                  style={fieldInput}
                >
                  <option value="">—</option>
                  {ODU_MOUNT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {data?.deviceType === "microwave-dish" && (
                <label>
                  <div style={fieldLabel}>Dish diameter (m)</div>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={data.dishDiameterM ?? ""}
                    onChange={(e) =>
                      patchDeviceData(placement.deviceNodeId, {
                        dishDiameterM:
                          e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    style={fieldInput}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <div style={sectionTitle}>Feedline · est. run</div>
        <div
          style={{
            borderRadius: 10,
            border: "1px solid var(--ti-border)",
            background: "var(--ti-surface-2)",
            padding: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--ti-font-mono)", fontSize: 19, fontWeight: 700, color: "var(--ti-ink)" }}>
              ≈ {feedEstFt} ft
            </span>
            <span
              style={{
                height: 20,
                padding: "0 7px",
                borderRadius: 999,
                border: "1px solid var(--ti-border)",
                background: "var(--ti-surface)",
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "var(--ti-font-mono)",
                color: "var(--ti-muted)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {feedMedium}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 12 }}>
            <TiIcon name="pin" size={13} color="var(--ti-accent)" />
            <span style={{ fontWeight: 600, fontFamily: "var(--ti-font-mono)" }}>
              {Math.round(placement.mountHeightFtAgl)} ft
            </span>
            <span style={{ flex: 1, height: 1, borderTop: "1.5px dotted var(--ti-faint)" }} />
            <TiIcon name="rack" size={13} color="var(--ti-muted)" />
            <span style={{ color: "var(--ti-ink-2)" }}>Equip. bldg</span>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ti-faint)", marginTop: 7, lineHeight: 1.4 }}>
            Vertical run + entry + 10% slack. Refine with measured length in trackIT.
          </div>
        </div>
      </div>

      {rfLinkCard && (
        <div>
          <div style={sectionTitle}>Link / path</div>
          <div
            style={{
              borderRadius: 10,
              border: "1px solid color-mix(in oklab, var(--ti-warning) 30%, transparent)",
              background: "var(--ti-warning-soft)",
              padding: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TiIcon name="signal" size={15} color="color-mix(in oklab, var(--ti-warning) 65%, var(--ti-ink))" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ti-ink)" }}>{rfLinkCard.label}</div>
                <div style={{ fontSize: 10.5, color: "var(--ti-muted)", fontFamily: "var(--ti-font-mono)", marginTop: 2 }}>
                  {rfLinkCard.kind.replace("_", " ")}
                  {rfLinkCard.distanceMi != null ? ` · ${rfLinkCard.distanceMi} mi` : ""}
                </div>
              </div>
              <span style={{ fontFamily: "var(--ti-font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ti-ink-2)" }}>
                {rfLinkCard.azimuthDeg}°
              </span>
            </div>
            {rfLinkCard.band && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--ti-ink-2)" }}>
                Band <b style={{ fontFamily: "var(--ti-font-mono)" }}>{rfLinkCard.band}</b>
              </div>
            )}
          </div>
        </div>
      )}

      {remoteLinks.length > 0 && (
        <div>
          <div style={sectionTitle}>Schematic links</div>
          <div
            style={{
              borderRadius: 10,
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface-2)",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {remoteLinks.map((link) => (
              <div
                key={link.label}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
              >
                <TiIcon name="signal" size={14} color="var(--ti-muted)" />
                <span style={{ fontWeight: 600, color: "var(--ti-ink)" }}>{link.label}</span>
                {link.signal && (
                  <span style={{ fontSize: 10, color: "var(--ti-muted)", fontFamily: "var(--ti-font-mono)" }}>
                    {String(link.signal).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {showFullDeviceLink && onOpenFullDeviceEditor && (
          <TiButton variant="outline" size="sm" fullWidth onClick={onOpenFullDeviceEditor}>
            Ports, power &amp; full device properties…
          </TiButton>
        )}
        {onOpenTrackIt && (
          <TiButton variant="outline" size="sm" fullWidth onClick={onOpenTrackIt}>
            Open in trackIT
          </TiButton>
        )}
        {onRemoveFromTower && (
          <TiButton variant="danger" size="sm" fullWidth onClick={onRemoveFromTower}>
            Remove from tower
          </TiButton>
        )}
      </div>
    </div>
  );
}
