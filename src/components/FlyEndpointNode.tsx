import { memo, useMemo, type MouseEvent } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlyEndpointNode as FlyEndpointNodeType } from "../types";
import { SIGNAL_COLORS } from "../types";
import { formatFlyEndpointLabel } from "../flyFormat";
import { useSchematicStore } from "../store";
import { isTrackItPopupSession, requestOpenTrackItDrawing } from "../trackitIntegration";

function FlyEndpointNodeComponent({ id, data, selected }: NodeProps<FlyEndpointNodeType>) {
  const text = useMemo(() => formatFlyEndpointLabel(data), [data]);
  const color = SIGNAL_COLORS[data.signalType] ?? "#999";
  const handleType = data.direction === "out" ? "target" : "source";
  const canNavigate = isTrackItPopupSession() && data.remoteDwgNumber.trim().length > 0;

  const onOpenRemote = (e: MouseEvent) => {
    e.stopPropagation();
    if (!canNavigate) return;
    requestOpenTrackItDrawing({
      dwgNumber: data.remoteDwgNumber.trim(),
      remoteDrawingId: data.remoteDrawingId,
    });
  };

  return (
    <>
      <Handle type={handleType} position={Position.Top} id="t" style={{ opacity: 0, width: 6, height: 6 }} />
      <Handle type={handleType} position={Position.Right} id="r" style={{ opacity: 0, width: 6, height: 6 }} />
      <Handle type={handleType} position={Position.Bottom} id="b" style={{ opacity: 0, width: 6, height: 6 }} />
      <Handle type={handleType} position={Position.Left} id="l" style={{ opacity: 0, width: 6, height: 6 }} />
      <div
        role="button"
        tabIndex={0}
        onDoubleClick={() => useSchematicStore.getState().setEditingFlyEndpointId(id)}
        onClick={(e) => {
          if ((e.target as HTMLElement).dataset.remoteDwg) onOpenRemote(e);
        }}
        style={{
          minWidth: 180,
          maxWidth: 360,
          padding: "2px 6px",
          border: `1.5px solid ${color}`,
          borderRadius: 2,
          background: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.88)",
          color: "#111",
          fontSize: 9,
          lineHeight: 1.25,
          fontFamily: "ui-monospace, monospace",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: canNavigate ? "pointer" : "default",
          boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
        }}
        title={canNavigate ? `Open DWG ${data.remoteDwgNumber} in trackIT` : text}
      >
        {text.split(data.remoteDwgNumber.trim()).length > 1 && data.remoteDwgNumber.trim() ? (
          <>
            {text.slice(0, text.indexOf(data.remoteDwgNumber.trim()))}
            <span
              data-remote-dwg="1"
              className="underline decoration-dotted"
              style={{ color }}
            >
              {data.remoteDwgNumber.trim()}
            </span>
            {text.slice(text.indexOf(data.remoteDwgNumber.trim()) + data.remoteDwgNumber.trim().length)}
          </>
        ) : (
          text
        )}
      </div>
    </>
  );
}

export default memo(FlyEndpointNodeComponent);
