import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  buildDistributionPlanFromHubDialog,
  masterDesignationFromRack,
  type DistributionPlan,
} from "../distributionPlan";
import {
  downloadDistributionPlanJson,
  formatDistributionPlanJson,
  hydrateDatacomFormFromPlan,
  parseDistributionPlanJsonString,
} from "../distributionPlanParse";
import { sortRacksByLabel } from "../rackLayout";
import HubMatrixPanel from "./HubMatrixPanel";

interface RackDistributionPresetDialogProps {
  page: RackElevationPage;
  onClose: () => void;
}

const formPanelStyle: CSSProperties = {
  background: "var(--ti-surface)",
  color: "var(--ti-ink)",
  border: "1px solid var(--ti-border)",
  borderRadius: 12,
  boxShadow: "var(--ti-shadow-lg)",
  fontFamily: "var(--ti-font-sans)",
};

const labelTextStyle: CSSProperties = {
  color: "var(--ti-ink-2)",
  fontWeight: 500,
};

const hintStyle: CSSProperties = {
  fontSize: 10,
  color: "var(--ti-muted)",
};

const fieldStyle: CSSProperties = {
  marginTop: 4,
  width: "100%",
  border: "1px solid var(--ti-border)",
  borderRadius: 6,
  padding: "6px 8px",
  background: "var(--ti-surface-2)",
  color: "var(--ti-ink)",
  outline: "none",
  fontFamily: "var(--ti-font-sans)",
  fontSize: 12,
};

const linkBtnStyle: CSSProperties = {
  color: "var(--ti-accent-ink)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  fontSize: 10,
  textDecoration: "underline",
};

export default function RackDistributionPresetDialog({ page, onClose }: RackDistributionPresetDialogProps) {
  const applyRackDistributionPreset = useSchematicStore((s) => s.applyRackDistributionPreset);
  const addToast = useSchematicStore((s) => s.addToast);
  const planFileRef = useRef<HTMLInputElement>(null);
  const backdropPressRef = useRef(false);

  const [presetId, setPresetId] = useState(TOWER_DATACOM_HUB_PRESET_ID);
  const [masterRackId, setMasterRackId] = useState(() => guessMasterRackId(page.racks) ?? page.racks[0]?.id ?? "");
  const [ethTrunkRackIds, setEthTrunkRackIds] = useState<Set<string>>(() => {
    const master = guessMasterRackId(page.racks);
    return master ? new Set(defaultEthTrunkRackIds(page.racks, master)) : new Set();
  });
  const [layoutGrid, setLayoutGrid] = useState(page.racks.length >= 6);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [jackBottomU, setJackBottomU] = useState(
    () => page.distributionPlan?.jackFields.bottomU ?? 30,
  );
  const [jackFieldPorts, setJackFieldPorts] = useState<JackFieldPorts>(
    () => page.distributionPlan?.jackFields.portsPerPanel ?? 12,
  );
  const [showTrunkCallouts, setShowTrunkCallouts] = useState(page.showTrunkCallouts !== false);
  const [designationPrefix, setDesignationPrefix] = useState("RACK");
  const [siteCode, setSiteCode] = useState("");
  const [gridColumns, setGridColumns] = useState(6);
  const [layoutRowCount, setLayoutRowCount] = useState(2);
  const [cablePoolStart, setCablePoolStart] = useState(101);
  const [cablePoolEnd, setCablePoolEnd] = useState(999);
  const [jackSourceLabel, setJackSourceLabel] = useState("MDF / Datacom");
  const [jackDestLabelTemplate, setJackDestLabelTemplate] = useState("{dest} JKF");
  const [fanoutMode, setFanoutMode] = useState<"trunk-per-dest" | "port-pair">("port-pair");
  const [ventEveryNU, setVentEveryNU] = useState(6);
  const [ventPanelHeightU, setVentPanelHeightU] = useState<1 | 2>(1);
  const [preferLargeBlanks, setPreferLargeBlanks] = useState(true);
  const [use6U, setUse6U] = useState(true);
  const [use4U, setUse4U] = useState(true);
  const [use2U, setUse2U] = useState(true);
  const [skipFillFromU, setSkipFillFromU] = useState(42);
  const [fillRackIds, setFillRackIds] = useState<Set<string>>(
    () => new Set(page.racks.map((r) => r.id)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [showPlanJson, setShowPlanJson] = useState(!!page.distributionPlan);
  const [planJsonText, setPlanJsonText] = useState("");
  const [planJsonErrors, setPlanJsonErrors] = useState<string[]>([]);
  const [importedPlan, setImportedPlan] = useState<DistributionPlan | null>(null);
  const [dialogTab, setDialogTab] = useState<"preset" | "matrix">("preset");

  const clearImportedPlan = () => setImportedPlan(null);

  const preset = RACK_DISTRIBUTION_PRESETS.find((p) => p.id === presetId) ?? RACK_DISTRIBUTION_PRESETS[0];
  const isDatacom = presetId === TOWER_DATACOM_HUB_PRESET_ID;
  const isFill = presetId === RACK_FILL_ORDER_PRESET_ID;
  const sortedRacks = useMemo(() => sortRacksByLabel(page.racks), [page.racks]);
  const satellites = sortedRacks.filter((r) => r.id !== masterRackId);
  const jackSpec = jackFieldSpec(jackFieldPorts);

  const buildPlanFromForm = (): DistributionPlan => {
    const masterRack = page.racks.find((r) => r.id === masterRackId);
    const masterDesignation = masterRack
      ? masterDesignationFromRack(designationPrefix, masterRack.label, masterRack.designation)
      : `${designationPrefix}01`;
    return buildDistributionPlanFromHubDialog({
      siteCode: siteCode || undefined,
      designationPrefix,
      masterDesignation,
      gridColumns: layoutGrid ? gridColumns : Math.max(1, page.racks.length),
      rowCount: layoutGrid ? layoutRowCount : 1,
      jackFieldBottomU: jackBottomU,
      jackFieldPorts,
      jackSourceLabel,
      jackDestLabelTemplate,
          trunkLabelPrefix: "Datacom",
          cablePoolStart,
          cablePoolEnd,
          fanoutMode,
        });
  };

  const formSetters = useMemo(
    () => ({
      setSiteCode: (v: string) => { clearImportedPlan(); setSiteCode(v); },
      setDesignationPrefix: (v: string) => { clearImportedPlan(); setDesignationPrefix(v); },
      setGridColumns: (v: number) => { clearImportedPlan(); setGridColumns(v); },
      setLayoutRowCount: (v: number) => { clearImportedPlan(); setLayoutRowCount(v); },
      setLayoutGrid: (v: boolean) => { clearImportedPlan(); setLayoutGrid(v); },
      setJackBottomU: (v: number) => { clearImportedPlan(); setJackBottomU(v); },
      setJackFieldPorts: (v: JackFieldPorts) => { clearImportedPlan(); setJackFieldPorts(v); },
      setCablePoolStart: (v: number) => { clearImportedPlan(); setCablePoolStart(v); },
      setCablePoolEnd: (v: number) => { clearImportedPlan(); setCablePoolEnd(v); },
      setJackSourceLabel: (v: string) => { clearImportedPlan(); setJackSourceLabel(v); },
      setJackDestLabelTemplate: (v: string) => { clearImportedPlan(); setJackDestLabelTemplate(v); },
      setMasterRackId: (id: string) => { clearImportedPlan(); setMasterRackId(id); },
      setFanoutMode: (v: "trunk-per-dest" | "port-pair") => { clearImportedPlan(); setFanoutMode(v); },
    }),
    [],
  );

  useEffect(() => {
    if (!page.distributionPlan || !isDatacom) return;
    const plan = page.distributionPlan;
    setPlanJsonText(formatDistributionPlanJson(plan));
    setImportedPlan(plan);
    hydrateDatacomFormFromPlan(plan, page, formSetters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from saved page plan
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const refreshPlanJsonFromForm = () => {
    const plan = buildPlanFromForm();
    setPlanJsonText(formatDistributionPlanJson(plan));
    setPlanJsonErrors([]);
    setImportedPlan(null);
    addToast("Updated JSON from form fields", "info");
  };

  const applyPlanJsonToForm = () => {
    const result = parseDistributionPlanJsonString(planJsonText);
    if (!result.ok) {
      setPlanJsonErrors(result.errors);
      addToast("Plan JSON has errors", "info");
      return;
    }
    setPlanJsonErrors([]);
    setImportedPlan(result.plan);
    hydrateDatacomFormFromPlan(result.plan, page, formSetters);
    addToast("Applied plan JSON to form", "success");
  };

  const copyPlanJson = async () => {
    const text = planJsonText.trim() || formatDistributionPlanJson(buildPlanFromForm());
    try {
      await navigator.clipboard.writeText(text);
      addToast("Plan JSON copied", "success");
    } catch {
      addToast("Could not copy to clipboard", "info");
    }
  };

  const handlePlanFileImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setPlanJsonText(text);
      const result = parseDistributionPlanJsonString(text);
      if (!result.ok) {
        setPlanJsonErrors(result.errors);
        addToast("Imported file has plan errors", "info");
        return;
      }
      setPlanJsonErrors([]);
      setImportedPlan(result.plan);
      hydrateDatacomFormFromPlan(result.plan, page, formSetters);
      addToast(`Loaded ${file.name}`, "success");
    };
    reader.readAsText(file);
  };

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
    clearImportedPlan();
    setMasterRackId(id);
    setEthTrunkRackIds(new Set(defaultEthTrunkRackIds(page.racks, id)));
  };

  const toggleFillRack = (rackId: string) => {
    setFillRackIds((prev) => {
      const next = new Set(prev);
      if (next.has(rackId)) next.delete(rackId);
      else next.add(rackId);
      return next;
    });
  };

  const selectAllFillRacks = (on: boolean) => {
    setFillRackIds(on ? new Set(sortedRacks.map((r) => r.id)) : new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page.racks.length < preset.minRacks) return;
    setSubmitting(true);
    try {
      if (isDatacom) {
        if (!masterRackId) return;
        const masterRack = page.racks.find((r) => r.id === masterRackId);
        const masterDesignation = masterRack
          ? masterDesignationFromRack(designationPrefix, masterRack.label, masterRack.designation)
          : `${designationPrefix}01`;
        const basePlan = importedPlan ?? buildPlanFromForm();
        const distributionPlan: DistributionPlan = {
          ...basePlan,
          layout: {
            ...basePlan.layout,
            masterDesignation,
          },
        };
        const options: TowerDatacomHubApplyOptions = {
          masterRackId,
          ethTrunkRackIds: [...ethTrunkRackIds],
          layoutGrid,
          gridColumns: distributionPlan.layout.columns,
          replaceExisting,
          jackFieldBottomU: distributionPlan.jackFields.bottomU,
          jackFieldPorts: distributionPlan.jackFields.portsPerPanel,
          showTrunkCallouts,
          designationPrefix,
          jackSourceLabel,
          jackDestLabelTemplate,
          distributionPlan,
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
          rackIds: [...fillRackIds],
        };
        applyRackDistributionPreset(page.id, presetId, options);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "color-mix(in oklab, var(--ti-ink) 45%, transparent)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) backdropPressRef.current = true;
      }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && backdropPressRef.current) onClose();
        backdropPressRef.current = false;
      }}
      onMouseLeave={() => {
        backdropPressRef.current = false;
      }}
    >
      <input
        ref={planFileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          handlePlanFileImport(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <form
        className={`p-4 max-h-[90vh] overflow-y-auto text-xs ${
          isDatacom && dialogTab === "matrix"
            ? "w-[min(92vw,720px)]"
            : showPlanJson && isDatacom
              ? "w-[520px]"
              : "w-[420px]"
        }`}
        style={formPanelStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--ti-ink)" }}>
          Distribution preset
        </h3>

        {isDatacom && (
          <div
            className="flex gap-1 mb-3 p-0.5 rounded"
            style={{ background: "var(--ti-surface-2)", border: "1px solid var(--ti-border)" }}
            role="tablist"
          >
            {(["preset", "matrix"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={dialogTab === tab}
                className="flex-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors"
                style={{
                  background: dialogTab === tab ? "var(--ti-accent)" : "transparent",
                  color: dialogTab === tab ? "var(--ti-on-accent)" : "var(--ti-ink-2)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--ti-font-sans)",
                }}
                onClick={() => setDialogTab(tab)}
              >
                {tab === "preset" ? "Preset & plan" : "Matrix view"}
              </button>
            ))}
          </div>
        )}

        {isDatacom && dialogTab === "matrix" ? (
          <HubMatrixPanel page={page} masterRackId={masterRackId || undefined} />
        ) : (
          <>
        <p className="text-[11px] mb-3 leading-relaxed" style={hintStyle}>
          {isDatacom
            ? "Jack fields and Ethernet trunk callouts on this elevation. After apply, use Place EJF on Drawing & wire to draw one trunk line per satellite (12× port fan-out at destination). Optional: link Rack 1 to a Drawing room to group devices. Cable proposals open in trackIT Plant after apply."
            : "Fill empty U slots for procurement totals. Jack-field / device U are left open."}
        </p>

        <label className="block mb-3">
          <span style={labelTextStyle}>Preset</span>
          <select
            style={fieldStyle}
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {RACK_DISTRIBUTION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <span className="block mt-1" style={hintStyle}>{preset.description}</span>
        </label>

        {isDatacom && (
          <>
            <label className="block mb-3">
              <span style={labelTextStyle}>Master / MDF rack</span>
              <select
                style={fieldStyle}
                value={masterRackId}
                onChange={(e) => handleMasterChange(e.target.value)}
              >
                {sortedRacks.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>

            <label className="block mb-2">
              <span style={labelTextStyle}>Designation prefix</span>
              <input
                style={{ ...fieldStyle, textTransform: "uppercase" }}
                value={designationPrefix}
                onChange={(e) => formSetters.setDesignationPrefix(e.target.value.toUpperCase())}
                placeholder="RACK"
              />
              <span className="block mt-0.5" style={hintStyle}>Trunk labels use RACK01→RACK07 style codes.</span>
            </label>

            <label className="block mb-2">
              <span style={labelTextStyle}>Site code (optional)</span>
              <input
                style={fieldStyle}
                value={siteCode}
                onChange={(e) => formSetters.setSiteCode(e.target.value.toUpperCase())}
                placeholder="S001"
              />
              <span className="block mt-0.5" style={hintStyle}>Stored on the distribution plan for trackIT cable proposals.</span>
            </label>

            <label className="block mb-2">
              <span style={labelTextStyle}>Fan-out mode</span>
              <select
                style={fieldStyle}
                value={fanoutMode}
                onChange={(e) => formSetters.setFanoutMode(e.target.value as "trunk-per-dest" | "port-pair")}
              >
                <option value="trunk-per-dest">One trunk record per satellite rack</option>
                <option value="port-pair">Port-pair (EJF panel/port per cable)</option>
              </select>
              <span className="block mt-0.5" style={hintStyle}>
                Port-pair expands proposals in trackIT (e.g. 12 cables × 11 racks). With per-rack offset (default 100), SR02 uses 201–212, SR03 uses 301–312, etc.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <label className="block">
                <span style={labelTextStyle}>Cable # start</span>
                <input
                  type="number"
                  min={1}
                  style={fieldStyle}
                  value={cablePoolStart}
                  onChange={(e) => formSetters.setCablePoolStart(parseInt(e.target.value, 10) || 100)}
                />
              </label>
              <label className="block">
                <span style={labelTextStyle}>Cable # end</span>
                <input
                  type="number"
                  min={1}
                  style={fieldStyle}
                  value={cablePoolEnd}
                  onChange={(e) => formSetters.setCablePoolEnd(parseInt(e.target.value, 10) || 999)}
                />
              </label>
            </div>

            {layoutGrid && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="block">
                  <span style={labelTextStyle}>Grid columns</span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    style={fieldStyle}
                    value={gridColumns}
                    onChange={(e) => formSetters.setGridColumns(parseInt(e.target.value, 10) || 6)}
                  />
                </label>
                <label className="block">
                  <span style={labelTextStyle}>Rows</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    style={fieldStyle}
                    value={layoutRowCount}
                    onChange={(e) => formSetters.setLayoutRowCount(parseInt(e.target.value, 10) || 2)}
                  />
                </label>
              </div>
            )}

            <label className="block mb-2">
              <span style={labelTextStyle}>Jack field source (MDF)</span>
              <input
                style={fieldStyle}
                value={jackSourceLabel}
                onChange={(e) => formSetters.setJackSourceLabel(e.target.value)}
                placeholder="Sutro MDF / Datacom"
              />
              <span className="block mt-0.5" style={hintStyle}>Master rack EJF device name and “from” side for satellites.</span>
            </label>

            <label className="block mb-2">
              <span style={labelTextStyle}>Satellite jack field label</span>
              <input
                style={fieldStyle}
                value={jackDestLabelTemplate}
                onChange={(e) => formSetters.setJackDestLabelTemplate(e.target.value)}
                placeholder="{dest} JKF"
              />
              <span className="block mt-0.5" style={hintStyle}>
                Template: <code style={{ fontSize: 9 }}>{"{dest}"}</code>, <code style={{ fontSize: 9 }}>{"{source}"}</code>, <code style={{ fontSize: 9 }}>{"{ports}"}</code>
              </span>
            </label>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span style={labelTextStyle}>Ethernet trunk to rack</span>
                <span className="flex gap-2">
                  <button type="button" style={linkBtnStyle} onClick={() => selectAllEth(true)}>
                    All
                  </button>
                  <button type="button" style={linkBtnStyle} onClick={() => selectAllEth(false)}>
                    None
                  </button>
                </span>
              </div>
              <div
                className="max-h-32 overflow-y-auto rounded p-1.5 flex flex-col gap-0.5"
                style={{ border: "1px solid var(--ti-border)", background: "var(--ti-surface-2)" }}
              >
                {satellites.length === 0 ? (
                  <span className="px-1" style={hintStyle}>Add another rack besides the master.</span>
                ) : (
                  satellites.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer"
                      style={{ color: "var(--ti-ink)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--ti-accent-soft)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
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
              <span style={labelTextStyle}>Jack field (EJF)</span>
              <select
                style={fieldStyle}
                value={jackFieldPorts}
                onChange={(e) => formSetters.setJackFieldPorts(Number(e.target.value) as JackFieldPorts)}
              >
                <option value={12}>12-port (1U)</option>
                <option value={24}>24-port (2U)</option>
                <option value={48}>48-port (4U)</option>
              </select>
            </label>

            <label className="block mb-2">
              <span style={labelTextStyle}>Jack field bottom U</span>
              <input
                type="number"
                style={fieldStyle}
                min={1}
                max={60}
                value={jackBottomU}
                onChange={(e) => formSetters.setJackBottomU(Number(e.target.value))}
              />
              <span className="block mt-0.5" style={hintStyle}>
                {jackSpec.portsLabel} panel · {jackSpec.heightU}U each; master stack is 6× (EJF + 1U blank) = 12U from U{jackBottomU}.
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer mb-2" style={{ color: "var(--ti-ink)" }}>
              <input
                type="checkbox"
                checked={showTrunkCallouts}
                onChange={(e) => setShowTrunkCallouts(e.target.checked)}
              />
              <span>Show trunk callouts on canvas</span>
            </label>

            <div
              className="mb-3 rounded p-2"
              style={{ border: "1px solid var(--ti-border)", background: "var(--ti-surface-2)" }}
            >
              <label className="flex items-center gap-2 cursor-pointer mb-2" style={{ color: "var(--ti-ink)" }}>
                <input
                  type="checkbox"
                  checked={showPlanJson}
                  onChange={(e) => {
                    setShowPlanJson(e.target.checked);
                    if (e.target.checked && !planJsonText.trim()) {
                      setPlanJsonText(formatDistributionPlanJson(buildPlanFromForm()));
                    }
                  }}
                />
                <span style={labelTextStyle}>Distribution plan (JSON)</span>
              </label>
              {showPlanJson && (
                <>
                  <p className="mb-2 leading-relaxed" style={hintStyle}>
                    Config for layout, lengths, and trackIT cable numbering. Stored on this elevation page.
                    {importedPlan ? " Using imported JSON on apply." : ""}
                  </p>
                  <textarea
                    value={planJsonText}
                    onChange={(e) => {
                      setPlanJsonText(e.target.value);
                      setPlanJsonErrors([]);
                      clearImportedPlan();
                    }}
                    rows={10}
                    spellCheck={false}
                    className="w-full font-mono text-[10px] rounded p-2 mb-2"
                    style={{
                      border: "1px solid var(--ti-border)",
                      background: "var(--ti-surface)",
                      color: "var(--ti-ink)",
                      resize: "vertical",
                    }}
                    aria-label="Distribution plan JSON"
                  />
                  {planJsonErrors.length > 0 && (
                    <ul className="mb-2 text-[10px]" style={{ color: "var(--ti-danger, #b91c1c)" }}>
                      {planJsonErrors.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" style={linkBtnStyle} onClick={() => void copyPlanJson()}>
                      Copy
                    </button>
                    <button
                      type="button"
                      style={linkBtnStyle}
                      onClick={() => {
                        const plan = importedPlan ?? buildPlanFromForm();
                        downloadDistributionPlanJson(plan, "distribution-plan.json");
                      }}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      style={linkBtnStyle}
                      onClick={() => planFileRef.current?.click()}
                    >
                      Import file
                    </button>
                    <button type="button" style={linkBtnStyle} onClick={refreshPlanJsonFromForm}>
                      From form
                    </button>
                    <button type="button" style={linkBtnStyle} onClick={applyPlanJsonToForm}>
                      Apply JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {isFill && (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span style={labelTextStyle}>Racks to fill</span>
                <span className="flex gap-2">
                  <button type="button" style={linkBtnStyle} onClick={() => selectAllFillRacks(true)}>
                    All
                  </button>
                  <button type="button" style={linkBtnStyle} onClick={() => selectAllFillRacks(false)}>
                    None
                  </button>
                </span>
              </div>
              <div
                className="max-h-28 overflow-y-auto rounded p-1.5 flex flex-col gap-0.5"
                style={{ border: "1px solid var(--ti-border)", background: "var(--ti-surface-2)" }}
              >
                {sortedRacks.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer" style={{ color: "var(--ti-ink)" }}>
                    <input
                      type="checkbox"
                      checked={fillRackIds.has(r.id)}
                      onChange={() => toggleFillRack(r.id)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
              <span className="block mt-0.5" style={hintStyle}>
                Fill runs all open U gaps between devices on selected racks.
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-2" style={{ color: "var(--ti-ink)" }}>
              <input
                type="checkbox"
                checked={preferLargeBlanks}
                onChange={(e) => setPreferLargeBlanks(e.target.checked)}
              />
              <span>Prefer 4U / 6U blanks for large open runs</span>
            </label>
            {preferLargeBlanks && (
              <div className="mb-2 flex flex-wrap gap-3 pl-5 text-[11px]" style={{ color: "var(--ti-ink)" }}>
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
                <span style={hintStyle}>+ 1U remainder</span>
              </div>
            )}
            <label className="block mb-2">
              <span style={labelTextStyle}>Vent panel every N U</span>
              <input
                type="number"
                style={fieldStyle}
                min={0}
                max={20}
                value={ventEveryNU}
                onChange={(e) => setVentEveryNU(Number(e.target.value))}
              />
              <span className="block mt-0.5" style={hintStyle}>0 = no vents. Default 6 = vent at U6, 12, 18…</span>
            </label>
            <label className="block mb-2">
              <span style={labelTextStyle}>Vent panel size</span>
              <select
                style={fieldStyle}
                value={ventPanelHeightU}
                onChange={(e) => setVentPanelHeightU(Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>1U vent</option>
                <option value={2}>2U vent (when 2U free)</option>
              </select>
            </label>
            <label className="block mb-2">
              <span style={labelTextStyle}>Skip fill from U (and above)</span>
              <input
                type="number"
                style={fieldStyle}
                min={2}
                max={60}
                value={skipFillFromU}
                onChange={(e) => setSkipFillFromU(Number(e.target.value))}
              />
              <span className="block mt-0.5" style={hintStyle}>Reserve top U for jack fields (default 41).</span>
            </label>
          </>
        )}

        <div className="flex flex-col gap-1.5 mb-4 mt-2" style={{ color: "var(--ti-ink)" }}>
          {isDatacom && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layoutGrid}
                onChange={(e) => formSetters.setLayoutGrid(e.target.checked)}
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
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded"
            style={{
              border: "1px solid var(--ti-border)",
              background: "var(--ti-surface-2)",
              color: "var(--ti-ink-2)",
              cursor: "pointer",
              fontFamily: "var(--ti-font-sans)",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          {!(isDatacom && dialogTab === "matrix") && (
            <button
              type="submit"
              className="px-3 py-1.5 rounded disabled:opacity-50"
              style={{
                background: "var(--ti-accent)",
                color: "var(--ti-on-accent)",
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--ti-font-sans)",
                fontWeight: 600,
              }}
              disabled={
                submitting
                || page.racks.length < preset.minRacks
                || (isDatacom && !masterRackId)
                || (isFill && fillRackIds.size === 0)
              }
            >
              Apply preset
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
