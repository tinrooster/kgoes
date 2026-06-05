import { describe, expect, it } from "vitest";
import {
  formatDistributionPlanJson,
  parseDistributionPlanJsonString,
} from "../distributionPlanParse";
import { buildDistributionPlanFromHubDialog } from "../distributionPlan";

describe("distributionPlanParse", () => {
  it("round-trips a built plan", () => {
    const plan = buildDistributionPlanFromHubDialog({
      designationPrefix: "SR",
      masterDesignation: "SR01",
      gridColumns: 6,
      rowCount: 2,
      jackFieldBottomU: 30,
      jackFieldPorts: 12,
      cablePoolStart: 229,
      cablePoolEnd: 999,
    });
    const text = formatDistributionPlanJson(plan);
    const parsed = parseDistributionPlanJsonString(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.plan.cablePool.start).toBe(229);
      expect(parsed.plan.layout.columns).toBe(6);
    }
  });

  it("rejects invalid version", () => {
    const r = parseDistributionPlanJsonString(JSON.stringify({ version: 2 }));
    expect(r.ok).toBe(false);
  });
});
