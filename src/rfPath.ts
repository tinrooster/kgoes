import type { ConnectionData, LineStyle, Port, RfPathRole } from "./types";

export const RF_PATH_ROLE_LABELS: Record<RfPathRole, string> = {
  tx: "TX",
  rx: "RX",
  bidirectional: "Bidirectional",
};

export const DEFAULT_RF_PATH_LINE_STYLE: Record<RfPathRole, LineStyle> = {
  tx: "solid",
  rx: "dashed",
  bidirectional: "dash-dot",
};

export const ALL_RF_PATH_ROLES: RfPathRole[] = ["tx", "rx", "bidirectional"];

export function inferRfPathRole(
  sourcePort?: Pick<Port, "direction" | "signalType">,
  targetPort?: Pick<Port, "direction" | "signalType">,
): RfPathRole | undefined {
  if (sourcePort?.signalType !== "rf" && targetPort?.signalType !== "rf") return undefined;
  if (!sourcePort || !targetPort) return undefined;
  if (sourcePort.direction === "bidirectional" || targetPort.direction === "bidirectional") {
    return "bidirectional";
  }
  if (sourcePort.direction === "output" && targetPort.direction === "input") return "tx";
  if (sourcePort.direction === "input" && targetPort.direction === "output") return "rx";
  return "bidirectional";
}

export function applyRfPathDefaults(
  data: ConnectionData,
  sourcePort?: Port,
  targetPort?: Port,
): ConnectionData {
  const signalType = data.signalType ?? sourcePort?.signalType ?? targetPort?.signalType;
  if (signalType !== "rf") return data;
  const role = data.rfPathRole ?? inferRfPathRole(sourcePort, targetPort);
  if (!role) return data;
  return {
    ...data,
    signalType: "rf",
    rfPathRole: role,
    lineStyle: data.lineStyle ?? DEFAULT_RF_PATH_LINE_STYLE[role],
  };
}
