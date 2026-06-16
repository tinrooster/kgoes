import { useEffect, useMemo, useState } from "react";
import {
  TALL_TOWER_FORMAT_THRESHOLD_FT,
  TOWER_ELEVATION_HEIGHT_DEFAULT_FT,
  TOWER_ELEVATION_HEIGHT_MAX_FT,
  TOWER_ELEVATION_HEIGHT_MIN_FT,
  usesTallTowerFormatting,
  validateTowerElevationSetup,
  type TowerElevationSetupOptions,
} from "../towerElevationSetup";
import { useTowerElevationSetupStore } from "../towerElevationSetupStore";
import FloatingPanel from "./FloatingPanel";

const fieldClass =
  "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500";

const labelClass = "text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5";

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function TowerElevationSetupDialog() {
  const request = useTowerElevationSetupStore((s) => s.request);
  const draft = useTowerElevationSetupStore((s) => s.draft);
  const setDraft = useTowerElevationSetupStore((s) => s.setDraft);
  const close = useTowerElevationSetupStore((s) => s.close);
  const confirm = useTowerElevationSetupStore((s) => s.confirm);
  const [heightText, setHeightText] = useState(String(TOWER_ELEVATION_HEIGHT_DEFAULT_FT));
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = !!request && !!draft;
  const isEdit = !!request?.pageId;

  useEffect(() => {
    if (!open || !draft) return;
    setHeightText(String(draft.heightFtAgl ?? TOWER_ELEVATION_HEIGHT_DEFAULT_FT));
    setLatText(draft.latitude != null ? String(draft.latitude) : "");
    setLonText(draft.longitude != null ? String(draft.longitude) : "");
    setError(null);
  }, [open, request?.pageId, request?.defaultLabel, draft?.heightFtAgl]);

  const heightPreview = useMemo(() => {
    const n = Number(heightText);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.max(TOWER_ELEVATION_HEIGHT_MIN_FT, Math.min(TOWER_ELEVATION_HEIGHT_MAX_FT, n)));
  }, [heightText]);

  const tallFormat = heightPreview != null && usesTallTowerFormatting(heightPreview);

  if (!open || !draft) return null;

  const syncDraftFromFields = (): TowerElevationSetupOptions | null => {
    const heightFtAgl = parseOptionalNumber(heightText);
    if (heightFtAgl == null) {
      setError("Enter a valid tower height.");
      return null;
    }
    const next: TowerElevationSetupOptions = {
      heightFtAgl,
      latitude: parseOptionalNumber(latText),
      longitude: parseOptionalNumber(lonText),
      accessNotes: draft.accessNotes,
      details: draft.details,
    };
    const validation = validateTowerElevationSetup(next);
    if (!validation.ok) {
      setError(validation.message);
      return null;
    }
    setError(null);
    return next;
  };

  const onConfirm = () => {
    const next = syncDraftFromFields();
    if (!next) return;
    setDraft(next);
    confirm();
  };

  return (
    <FloatingPanel
      title={isEdit ? "Tower site setup" : "Tower elevation setup"}
      subtitle={
        isEdit
          ? `${request.defaultLabel} — edit height, coordinates, and site notes.`
          : `${request.defaultLabel} — set height and site details before the page is created.`
      }
      defaultWidth={420}
      minWidth={360}
      onClose={close}
      onBackdropClick={close}
      footer={
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={onConfirm}
          >
            {isEdit ? "Save setup" : "Create tower page"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-4 py-3 text-xs text-[var(--color-text)]">
        <div>
          <div className={labelClass}>Tower height (ft AGL)</div>
          <input
            type="number"
            className={fieldClass}
            min={TOWER_ELEVATION_HEIGHT_MIN_FT}
            max={TOWER_ELEVATION_HEIGHT_MAX_FT}
            step={1}
            value={heightText}
            onChange={(e) => {
              setHeightText(e.target.value);
              setError(null);
            }}
            autoFocus
          />
          <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            Typical sites: 150–200′. Maximum {TOWER_ELEVATION_HEIGHT_MAX_FT}′.
            {tallFormat ? (
              <>
                {" "}
                At {TALL_TOWER_FORMAT_THRESHOLD_FT}′ and above, tall-tower viewport and a generated
                self-support profile apply (quartile guide bands, no Sutro reference art).
              </>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelClass}>Latitude</div>
            <input
              type="text"
              inputMode="decimal"
              className={fieldClass}
              placeholder="e.g. 37.758"
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
            />
          </div>
          <div>
            <div className={labelClass}>Longitude</div>
            <input
              type="text"
              inputMode="decimal"
              className={fieldClass}
              placeholder="e.g. -122.452"
              value={lonText}
              onChange={(e) => setLonText(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className={labelClass}>Access notes</div>
          <textarea
            className={`${fieldClass} min-h-[72px] resize-y`}
            placeholder="Gate codes, road access, climb restrictions…"
            value={draft.accessNotes ?? ""}
            onChange={(e) => setDraft({ accessNotes: e.target.value })}
          />
        </div>

        <div>
          <div className={labelClass}>Details</div>
          <textarea
            className={`${fieldClass} min-h-[72px] resize-y`}
            placeholder="Site name, owner, call sign, or other field notes…"
            value={draft.details ?? ""}
            onChange={(e) => setDraft({ details: e.target.value })}
          />
        </div>

        {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
      </div>
    </FloatingPanel>
  );
}
