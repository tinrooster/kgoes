import type { CableSegment, PortDetails } from "../topology/domain/types";
import { resolveServiceStyle } from "../topology/serviceSchema";

interface MatrixPatchListProps {
  segments: CableSegment[];
  sourcePorts: PortDetails[];
  destPorts: PortDetails[];
  masterTitle: string;
  destTitle: string;
  onRemove: (segmentId: string) => void;
}

function portNum(ports: PortDetails[], schematicPortId: string): string {
  const p = ports.find((x) => x.schematicPortId === schematicPortId);
  return p ? String(p.portNumber) : "?";
}

export default function MatrixPatchList({
  segments,
  sourcePorts,
  destPorts,
  masterTitle,
  destTitle,
  onRemove,
}: MatrixPatchListProps) {
  if (segments.length === 0) {
    return (
      <p className="text-[10px] py-2" style={{ color: "var(--ti-muted)" }}>
        No patches yet. Click a source port (left), then the matching destination port (right).
      </p>
    );
  }

  return (
    <div
      className="rounded overflow-hidden text-[10px]"
      style={{ border: "1px solid var(--ti-border)" }}
    >
      <div
        className="px-2 py-1.5 font-semibold"
        style={{ background: "var(--ti-surface-2)", color: "var(--ti-ink-2)" }}
      >
        Patches ({segments.length}) — {masterTitle} ↔ {destTitle}
      </div>
      <div className="max-h-36 overflow-y-auto">
        <table className="w-full" style={{ color: "var(--ti-ink)" }}>
          <thead>
            <tr style={{ background: "var(--ti-surface)", color: "var(--ti-muted)" }}>
              <th className="text-left px-2 py-1 font-medium">Src P</th>
              <th className="text-left px-2 py-1 font-medium">Dest P</th>
              <th className="text-left px-2 py-1 font-medium">Media</th>
              <th className="text-left px-2 py-1 font-medium">Tag</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {segments.map((seg) => {
              const media = resolveServiceStyle(seg.serviceType);
              return (
                <tr
                  key={seg.id}
                  style={{ borderTop: "1px solid var(--ti-border)" }}
                >
                  <td className="px-2 py-1 font-mono">{portNum(sourcePorts, seg.sourcePortId)}</td>
                  <td className="px-2 py-1 font-mono">{portNum(destPorts, seg.destinationPortId)}</td>
                  <td className="px-2 py-1" style={{ color: media.stroke }}>
                    {media.label}
                  </td>
                  <td className="px-2 py-1 font-mono truncate max-w-[100px]" title={seg.tagNumber}>
                    {seg.tagNumber}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      className="text-[10px] px-1 rounded hover:opacity-80"
                      style={{ color: "var(--ti-danger, #b91c1c)" }}
                      title="Remove patch"
                      onClick={() => onRemove(seg.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
