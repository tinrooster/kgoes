import type { PanelPoeStatus } from "../power/poeBudgetTracker";

interface PanelPoeMetricsGaugeProps {
  status: PanelPoeStatus;
  panelName: string;
}

export function PanelPoeMetricsGauge({ status, panelName }: PanelPoeMetricsGaugeProps) {
  const { totalAllocatedWatts, maxBudgetWatts, isOverBudget, utilizationPercentage } = status;

  const barColor = isOverBudget
    ? "#dc2626"
    : utilizationPercentage > 85
      ? "#f59e0b"
      : "#10b981";

  return (
    <div
      className="p-3 rounded-lg border shadow-sm text-xs"
      style={{
        background: "var(--ti-surface-2, #1e293b)",
        borderColor: "var(--ti-border, #334155)",
        color: "var(--ti-ink-2, #cbd5e1)",
        fontFamily: "var(--ti-font-sans, system-ui, sans-serif)",
      }}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-bold" style={{ color: "var(--ti-ink, #f1f5f9)" }}>
          {panelName}
        </span>
        <span
          className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px]"
          style={
            isOverBudget
              ? { background: "rgba(220, 38, 38, 0.2)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" }
              : { color: "var(--ti-muted, #94a3b8)" }
          }
        >
          {isOverBudget ? "OVER CAPACITY" : "PoE OK"}
        </span>
      </div>
      <div
        className="w-full h-2.5 rounded-full overflow-hidden mb-2 border"
        style={{ background: "var(--ti-surface, #0f172a)", borderColor: "var(--ti-border, #1e293b)" }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${utilizationPercentage}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between items-center text-[11px] font-mono">
        <div>
          Load:{" "}
          <span className="font-bold" style={{ color: isOverBudget ? "#f87171" : "var(--ti-ink, #f1f5f9)" }}>
            {totalAllocatedWatts}W
          </span>{" "}
          / {maxBudgetWatts}W
        </div>
        <div className="font-bold">{utilizationPercentage}%</div>
      </div>
    </div>
  );
}
