import { useMemo, useState } from "react";
import { useSchematicStore } from "../store";
import type { JackFieldPorts } from "../rackDistributionPresets";
import type { RackElevationPage } from "../types";
import {
  defaultEthTrunkRackIds,
  guessMasterRackId,
  jackFieldSpec,
  RACK_DISTRIBUTION_PRESETS,
  RACK_FILL_ORDER_PRESET_ID,
  TOWER_DATACOM_HUB_PRESET_ID,
  type RackFillOrderApplyOptions,
  type TowerDatacomHubApplyOptions,
} from "../rackDistributionPresets";
import { sortRacksByLabel } from "../rackLayout";

interface RackDistributionPresetDialogProps {
  page: RackElevationPage;
  onClose: () => void;
}

export default function RackDistributionPresetDialog({ page, onClose }: RackDistributionPresetDialogProps) {
  const applyRackDistributionPreset = useSchematicStore((s) => s.applyRackDistributionPreset);

  const [presetId, setPresetId] = useState(TOWER_DATACOM_HUB_PRESET_ID);
  const [masterRackId, setMasterRackId] = useState(() => guessMasterRackId(page.racks) ?? page.racks[0]?.id ?? "");
  const [ethTrunkRackIds, setEthTrunkRackIds] = useState<Set<string>>(() => {
    const master = guessMasterRackId(page.racks);
    return master ? new Set(defaultEthTrunkRackIds(page.racks, master)) : new Set();
  });
  const [layoutGrid, setLayoutGrid] = useState(page.racks.length >= 6);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [jackBottomU, setJackBottomU] = useState(41);
  const [jackFieldPorts, setJackFieldPorts] = useState<JackFieldPorts>(24);
  const [showTrunkCallouts, setShowTrunkCallouts] = useState(page.showTrunkCallouts !== false);
  const [designationPrefix, setDesignationPrefix] = useState("RACK");
  const [jackSourceLabel, setJackSourceLabel] = useState("MDF / Datacom");
  const [jackDestLabelTemplate, setJackDestLabelTemplate] = useState("{dest} JKF");
  const [ventEveryNU, setVentEveryNU] = useState(6);
  const [ventPanelHeightU, setVentPanelHeightU] = useState<1 | 2>(1);
  const [preferLargeBlanks, setPreferLargeBlanks] = useState(true);
  const [use6U, setUse6U] = useState(true);
  const [use4U, setUse4U] = useState(true);
  const [use2U, setUse2U] = useState(true);
  const [skipFillFromU, setSkipFillFromU] = useState(41);
  const [submitting, setSubmitting] = useState(false);

  const preset = RACK_DISTRIBUTION_PRESETS.find((p) => p.id === presetId) ?? RACK_DISTRIBUTION_PRESETS[0];
  const isDatacom = presetId === TOWER_DATACOM_HUB_PRESET_ID;
  const isFill = presetId === RACK_FILL_ORDER_PRESET_ID;
  const sortedRacks = useMemo(() => sortRacksByLabel(page.racks), [page.racks]);
  const satellites = sortedRacks.filter((r) => r.id !== masterRackId);
  const jackSpec = jackFieldSpec(jackFieldPorts);

  const toggleEth = (rackId: string) => {
    setEthTrunkRackIds((prev) => {
      const next = new Set(prev);
      if (next.has(rackId)) next.delete(rackId);
      else next.add(rackId);
      return next;
    });
  };

  const selectAllEth = (on: boolean) => {
    setEthTrunkRackIds(on ? new Set(satellites.map((r) => r.id)) : new Set());
  };

  const handleMasterChange = (id: string) => {
    setMasterRackId(id);
    setEthTrunkRackIds(new Set(defaultEthTrunkRackIds(page.racks, id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page.racks.length < preset.minRacks) return;
    setSubmitting(true);
    try {
      if (isDatacom) {
        if (!masterRackId) return;
        const options: TowerDatacomHubApplyOptions = {
          masterRackId,
          ethTrunkRackIds: [...ethTrunkRackIds],
          layoutGrid,
          gridColumns: 6,
          replaceExisting,
          jackFieldBottomU: jackBottomU,
          jackFieldPorts,
          showTrunkCallouts,
          designationPrefix,
          jackSourceLabel,
          jackDestLabelTemplate,
        };
        applyRackDistributionPreset(page.id, presetId, options);
      } else if (isFill) {
        const blankSizesU: number[] = [];
        if (preferLargeBlanks) {
          if (use6U) blankSizesU.push(6);
          if (use4U) blankSizesU.push(4);
          if (use2U) blankSizesU.push(2);
        }
        blankSizesU.push(1);
        const options: RackFillOrderApplyOptions = {
          replaceExisting,
          ventEveryNU,
          ventPanelHeightU,
          preferLargeBlanks,
          blankSizesU,
          skipFillFromU,
          skipBottomU: 1,
          face: "front",
        };
        applyRackDistributionPreset(page.id, presetId, options);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        className="bg-white rounded-lg shadow-xl p-4 w-[420px] max-h-[90vh] overflow-y-auto text-xs"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="font-semibold text-sm mb-1">Distribution preset</h3>
        <p className="text-neutral-500 text-[11px] mb-3 leading-relaxed">
          {isDatacom
            ? "Jack fields and Ethernet trunk callouts on this elevation. Cable records are proposed in trackIT Plant after apply."
            : "Fill empty U slots for procurement totals. Jack-field / device U are left open."}
        </p>

        <label className="block mb-3">
          <span className="text-neutral-600 font-medium">Preset</span>
          <select
            className="mt-1 w-full border border-neutral-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {RACK_DISTRIBUTION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <span className="block mt-1 text-[10px] text-neutral-400">{preset.description}</span>
        </label>

        {isDatacom && (
          <>
            <label className="block mb-3">
              <span className="text-neutral-600 font-medium">Master / MDF rack</span>
              <select
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                value={masterRackId}
                onChange={(e) => handleMasterChange(e.target.value)}
              >
                {sortedRacks.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>

            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Designation prefix</span>
              <input
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400 uppercase"
                value={designationPrefix}
                onChange={(e) => setDesignationPrefix(e.target.value.toUpperCase())}
                placeholder="RACK"
              />
              <span className="text-[10px] text-neutral-400">Trunk labels use RACK01→RACK07 style codes.</span>
            </label>

            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Jack field source (MDF)</span>
              <input
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                value={jackSourceLabel}
                onChange={(e) => setJackSourceLabel(e.target.value)}
                placeholder="Sutro MDF / Datacom"
              />
              <span className="text-[10px] text-neutral-400">Master rack EJF device name and “from” side for satellites.</span>
            </label>

            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Satellite jack field label</span>
              <input
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                value={jackDestLabelTemplate}
                onChange={(e) => setJackDestLabelTemplate(e.target.value)}
                placeholder="{dest} JKF"
              />
              <span className="text-[10px] text-neutral-400">
                Template: <code className="text-[9px]">{"{dest}"}</code>, <code className="text-[9px]">{"{source}"}</code>, <code className="text-[9px]">{"{ports}"}</code>
              </span>
            </label>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-600 font-medium">Ethernet trunk to rack</span>
                <span className="flex gap-2 text-[10px]">
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => selectAllEth(true)}>
                    All
                  </button>
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => selectAllEth(false)}>
                    None
                  </button>
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto border border-neutral-200 rounded p-1.5 flex flex-col gap-0.5">
                {satellites.length === 0 ? (
                  <span className="text-neutral-400 px-1">Add another rack besides the master.</span>
                ) : (
                  satellites.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-neutral-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ethTrunkRackIds.has(r.id)}
                        onChange={() => toggleEth(r.id)}
                      />
                      <span>{r.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Jack field (EJF)</span>
              <select
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                value={jackFieldPorts}
                onChange={(e) => setJackFieldPorts(Number(e.target.value) as JackFieldPorts)}
              >
                <option value={12}>12-port (1U)</option>
                <option value={24}>24-port (2U)</option>
                <option value={48}>48-port (4U)</option>
              </select>
            </label>

            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Jack field bottom U</span>
              <input
                type="number"
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                min={1}
                max={60}
                value={jackBottomU}
                onChange={(e) => setJackBottomU(Number(e.target.value))}
              />
              <span className="text-[10px] text-neutral-400">
                {jackSpec.portsLabel} panel · {jackSpec.heightU}U (e.g. 42U rack → U{jackBottomU}–{jackBottomU + jackSpec.heightU - 1}).
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={showTrunkCallouts}
                onChange={(e) => setShowTrunkCallouts(e.target.checked)}
              />
              <span>Show trunk callouts on canvas</span>
            </label>
          </>
        )}

        {isFill && (
          <>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={preferLargeBlanks}
                onChange={(e) => setPreferLargeBlanks(e.target.checked)}
              />
              <span>Prefer 4U / 6U blanks for large open runs</span>
            </label>
            {preferLargeBlanks && (
              <div className="mb-2 flex flex-wrap gap-3 pl-5 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={use6U} onChange={(e) => setUse6U(e.target.checked)} />
                  6U
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={use4U} onChange={(e) => setUse4U(e.target.checked)} />
                  4U
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={use2U} onChange={(e) => setUse2U(e.target.checked)} />
                  2U
                </label>
                <span className="text-neutral-400">+ 1U remainder</span>
              </div>
            )}
            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Vent panel every N U</span>
              <input
                type="number"
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                min={0}
                max={20}
                value={ventEveryNU}
                onChange={(e) => setVentEveryNU(Number(e.target.value))}
              />
              <span className="text-[10px] text-neutral-400">0 = no vents. Default 6 = vent at U6, 12, 18…</span>
            </label>
            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Vent panel size</span>
              <select
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                value={ventPanelHeightU}
                onChange={(e) => setVentPanelHeightU(Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>1U vent</option>
                <option value={2}>2U vent (when 2U free)</option>
              </select>
            </label>
            <label className="block mb-2">
              <span className="text-neutral-600 font-medium">Skip fill from U (and above)</span>
              <input
                type="number"
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                min={2}
                max={60}
                value={skipFillFromU}
                onChange={(e) => setSkipFillFromU(Number(e.target.value))}
              />
              <span className="text-[10px] text-neutral-400">Reserve top U for jack fields (default 41).</span>
            </label>
          </>
        )}

        <div className="flex flex-col gap-1.5 mb-4 mt-2">
          {isDatacom && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layoutGrid}
                onChange={(e) => setLayoutGrid(e.target.checked)}
                disabled={page.racks.length < 6}
              />
              <span>Layout racks 2×6 grid {page.racks.length < 6 ? "(needs 6+ racks)" : ""}</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
            />
            <span>Replace previous items from this preset</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting || page.racks.length < preset.minRacks || (isDatacom && !masterRackId)}
          >
            Apply preset
          </button>
        </div>
      </form>
    </div>
  );
}
