import type { NetworkPanel, NetworkPort, PatchActionRecord } from "../domain/types";
import { resolveServiceStyle } from "../serviceSchema";
import type { ServiceType } from "../serviceSchema";

interface MetaLookupContext {
  panels: NetworkPanel[];
  ports: NetworkPort[];
}

export function generateFieldWorkOrder(
  sessionHistory: PatchActionRecord[],
  context: MetaLookupContext,
  generatedAt: Date = new Date(),
): string {
  const panelMap = new Map(context.panels.map((p) => [p.id, p]));
  const portMap = new Map(context.ports.map((p) => [p.id, p]));

  const location = (portId: string): string => {
    const port = portMap.get(portId);
    const panel = port ? panelMap.get(port.panelId) : undefined;
    return panel
      ? `"${panel.name}" [Port #${port?.portNumber ?? "?"}]`
      : `Unknown (${portId})`;
  };

  const timestamp = generatedAt.toLocaleString();
  const lines: string[] = [
    "==================================================",
    "          MDF INFRASTRUCTURE PATCH WORK ORDER",
    `  Generated: ${timestamp}`,
    "==================================================",
    "",
  ];

  const removals = sessionHistory.filter((a) => a.type === "REMOVE_CABLE");
  if (removals.length > 0) {
    lines.push("PHASE 1: UNPLUG / DECOMMISSION EXISTING LINKS");
    lines.push("--------------------------------------------------");
    removals.forEach((action, index) => {
      const { segment } = action;
      lines.push(` [ ] Step 1.${index + 1}: REMOVE Cable Tag [${segment.tagNumber}]`);
      lines.push(`     - Unplug from: ${location(segment.sourcePortId)}`);
      lines.push(`     - Unplug from: ${location(segment.destinationPortId)}`);
      lines.push("");
    });
  }

  const additions = sessionHistory.filter((a) => a.type === "ADD_CABLE");
  if (additions.length > 0) {
    lines.push("PHASE 2: DEPLOY NEW CROSS-CONNECT CABLES");
    lines.push("--------------------------------------------------");
    additions.forEach((action, index) => {
      const { segment } = action;
      const service = resolveServiceStyle(segment.serviceType as ServiceType | undefined);
      lines.push(` [ ] Step 2.${index + 1}: INSTALL Cable Tag [${segment.tagNumber}]`);
      lines.push(`     - Wire standard: ${segment.category} (${service.label})`);
      lines.push(`     - Connect side A: ${location(segment.sourcePortId)}`);
      lines.push(`     - Connect side B: ${location(segment.destinationPortId)}`);
      lines.push("");
    });
  }

  if (removals.length === 0 && additions.length === 0) {
    lines.push("No patch changes recorded in this session.");
    lines.push("");
  }

  lines.push("==================================================");
  lines.push("  END OF MANIFEST — Sign-off: ____________________");
  lines.push("==================================================");

  return lines.join("\n");
}

export function downloadFieldWorkOrder(
  sessionHistory: PatchActionRecord[],
  context: MetaLookupContext,
  fileName?: string,
): void {
  const manifest = generateFieldWorkOrder(sessionHistory, context);
  const blob = new Blob([manifest], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `MDF-PATCH-WORK-ORDER-${Date.now()}.txt`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
