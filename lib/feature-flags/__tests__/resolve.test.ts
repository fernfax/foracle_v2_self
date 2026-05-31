import { describe, it, expect } from "vitest";
import {
  resolveFlags,
  wouldEnableAlso,
  dependentsOf,
  assertNoCycles,
} from "@/lib/feature-flags/resolve";
import { FEATURE_FLAGS, ALL_FLAG_KEYS } from "@/lib/feature-flags/registry";

describe("resolveFlags", () => {
  it("(a) resolves all flags to their registry defaults with no overrides", () => {
    const resolved = resolveFlags({});
    for (const key of ALL_FLAG_KEYS) {
      expect(resolved[key]).toBe(FEATURE_FLAGS[key].defaultEnabled);
    }
    // Spot-check a couple known defaults.
    expect(resolved["income"]).toBe(true);
    expect(resolved["income.beta"]).toBe(false);
    expect(resolved["income.timelineStudio"]).toBe(false);
  });

  it("(b) hard-dep block: income:false forces all income.* children off", () => {
    const resolved = resolveFlags({
      income: false,
      // try to force children on — the cascade must still win
      "income.beta": true,
      "income.bonus": true,
      "income.timelineStudio": true,
    });
    expect(resolved["income"]).toBe(false);
    expect(resolved["income.beta"]).toBe(false);
    expect(resolved["income.bonus"]).toBe(false);
    expect(resolved["income.timelineStudio"]).toBe(false);
  });

  it("(c) transitive: timelineStudio needs income.beta AND income.futureMilestones effectively on", () => {
    // Missing income.beta -> studio stays off even when turned on.
    const missingBeta = resolveFlags({ "income.timelineStudio": true });
    expect(missingBeta["income.beta"]).toBe(false); // default
    expect(missingBeta["income.timelineStudio"]).toBe(false);

    // Turn on income.beta but kill futureMilestones -> still off.
    const missingMilestones = resolveFlags({
      "income.beta": true,
      "income.futureMilestones": false,
      "income.timelineStudio": true,
    });
    expect(missingMilestones["income.timelineStudio"]).toBe(false);

    // All transitive requires satisfied -> on.
    const allOn = resolveFlags({
      "income.beta": true,
      "income.timelineStudio": true,
    });
    expect(allOn["income"]).toBe(true);
    expect(allOn["income.beta"]).toBe(true);
    expect(allOn["income.futureMilestones"]).toBe(true); // default true
    expect(allOn["income.timelineStudio"]).toBe(true);
  });

  it("(d) soft-dep does NOT block: overview stays on with investments off", () => {
    const resolved = resolveFlags({ investments: false });
    // investments only *enhances* overview, so overview is unaffected.
    expect(resolved["overview"]).toBe(true);
    expect(resolved["investments"]).toBe(false);
  });
});

describe("wouldEnableAlso", () => {
  it("(e) returns the OFF requires-ancestors needed to enable a key", () => {
    const current = resolveFlags({}); // defaults: income on, beta off, studio off
    const needed = wouldEnableAlso("income.timelineStudio", current);
    // income.beta is off and required (transitively pulls income, which is on).
    expect(needed).toContain("income.beta");
    // income is already on -> not listed.
    expect(needed).not.toContain("income");
    // futureMilestones is on by default -> not listed.
    expect(needed).not.toContain("income.futureMilestones");
  });

  it("includes transitive ancestors that are off", () => {
    const current = resolveFlags({ income: false }); // income off, beta off
    const needed = wouldEnableAlso("income.timelineStudio", current);
    expect(needed).toContain("income.beta");
    expect(needed).toContain("income");
    expect(needed).toContain("income.futureMilestones");
  });

  it("returns empty for a flag with no off ancestors", () => {
    const current = resolveFlags({});
    expect(wouldEnableAlso("income", current)).toEqual([]);
  });
});

describe("dependentsOf", () => {
  it("(e) returns all flags that transitively require the key", () => {
    const deps = dependentsOf("income");
    expect(deps).toContain("income.beta");
    expect(deps).toContain("income.bonus");
    expect(deps).toContain("income.futureMilestones");
    // transitive: studio requires income.beta which requires income
    expect(deps).toContain("income.timelineStudio");
    // dashboard.sankey requires income directly
    expect(deps).toContain("dashboard.sankey");
    // income itself is never its own dependent
    expect(deps).not.toContain("income");
  });

  it("returns empty for a leaf with no dependents", () => {
    expect(dependentsOf("assistant")).toEqual([]);
    expect(dependentsOf("income.timelineStudio")).toEqual([]);
  });
});

describe("assertNoCycles", () => {
  it("(f) does not throw on the real registry", () => {
    expect(() => assertNoCycles()).not.toThrow();
  });
});
