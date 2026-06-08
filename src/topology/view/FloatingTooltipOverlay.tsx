import type { PortDetails } from "../domain/types";

interface FloatingTooltipOverlayProps {
  activePort: PortDetails | null;
  posX: number;
  posY: number;
}

export function FloatingTooltipOverlay({
  activePort,
  posX,
  posY,
}: FloatingTooltipOverlayProps) {
  if (!activePort) return null;

  return (
    <div
      className="absolute pointer-events-none z-50 text-xs rounded-lg shadow-xl p-3 border backdrop-blur-sm transition-all duration-75"
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
        transform: "translate(-50%, -100%)",
        background: "var(--ti-surface, rgba(15, 23, 42, 0.95))",
        color: "var(--ti-ink, #f8fafc)",
        borderColor: "var(--ti-border, #334155)",
        fontFamily: "var(--ti-font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        className="font-bold border-b pb-1 mb-1"
        style={{ borderColor: "var(--ti-border, #334155)", color: "var(--ti-accent-ink, #60a5fa)" }}
      >
        Port #{activePort.portNumber}
      </div>
      <div className="space-y-0.5 font-mono" style={{ color: "var(--ti-ink-2, #cbd5e1)" }}>
        <div>
          <span style={{ color: "var(--ti-muted, #64748b)" }}>ID:</span> {activePort.id}
        </div>
        <div>
          <span style={{ color: "var(--ti-muted, #64748b)" }}>Tag:</span>{" "}
          {activePort.label || "Unassigned"}
        </div>
        <div>
          <span style={{ color: "var(--ti-muted, #64748b)" }}>Spec:</span>{" "}
          {activePort.category || "Cat6A"}
        </div>
      </div>
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
        style={{ borderTopColor: "var(--ti-surface, rgba(15, 23, 42, 0.95))" }}
      />
    </div>
  );
}
