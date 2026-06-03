import { describe, it, expect } from "vitest";
import {
  resolveEffectiveAmount,
  priorEffectiveAmount,
  activeMilestoneAt,
  type FutureMilestone,
} from "@/lib/future-change";

const BASE = 5000;

function ms(p: Partial<FutureMilestone> & { id: string; targetMonth: string; amount: number }): FutureMilestone {
  return { ...p };
}

describe("resolveEffectiveAmount", () => {
  it("returns base when there are no milestones", () => {
    expect(resolveEffectiveAmount(BASE, [], "2026-06")).toBe(BASE);
  });

  it("applies a permanent change from its targetMonth onward", () => {
    const m = [ms({ id: "a", targetMonth: "2026-06", amount: 6000 })];
    expect(resolveEffectiveAmount(BASE, m, "2026-05")).toBe(BASE); // before
    expect(resolveEffectiveAmount(BASE, m, "2026-06")).toBe(6000); // at
    expect(resolveEffectiveAmount(BASE, m, "2027-01")).toBe(6000); // after, indefinitely
  });

  it("latest permanent change wins (stacked raises)", () => {
    const m = [
      ms({ id: "a", targetMonth: "2026-03", amount: 6000 }),
      ms({ id: "b", targetMonth: "2026-09", amount: 7000 }),
    ];
    expect(resolveEffectiveAmount(BASE, m, "2026-02")).toBe(BASE);
    expect(resolveEffectiveAmount(BASE, m, "2026-05")).toBe(6000);
    expect(resolveEffectiveAmount(BASE, m, "2026-09")).toBe(7000);
    expect(resolveEffectiveAmount(BASE, m, "2030-01")).toBe(7000);
  });

  it("temporary change applies only within its window, then reverts to base", () => {
    const m = [
      ms({ id: "t", targetMonth: "2026-06", endMonth: "2026-08", amount: 3000 }),
    ];
    expect(resolveEffectiveAmount(BASE, m, "2026-05")).toBe(BASE); // before
    expect(resolveEffectiveAmount(BASE, m, "2026-06")).toBe(3000); // start
    expect(resolveEffectiveAmount(BASE, m, "2026-08")).toBe(3000); // end (inclusive)
    expect(resolveEffectiveAmount(BASE, m, "2026-09")).toBe(BASE); // reverts after
  });

  it("temporary dip on top of a permanent raise reverts to the RAISE, not base", () => {
    const m = [
      ms({ id: "raise", targetMonth: "2026-03", amount: 6000 }), // permanent
      ms({ id: "dip", targetMonth: "2026-06", endMonth: "2026-08", amount: 4000 }), // temp
    ];
    expect(resolveEffectiveAmount(BASE, m, "2026-02")).toBe(BASE); // before raise
    expect(resolveEffectiveAmount(BASE, m, "2026-04")).toBe(6000); // raised
    expect(resolveEffectiveAmount(BASE, m, "2026-06")).toBe(4000); // dip
    expect(resolveEffectiveAmount(BASE, m, "2026-08")).toBe(4000); // dip end
    expect(resolveEffectiveAmount(BASE, m, "2026-09")).toBe(6000); // reverts to the raise
  });

  it("overlapping temporary changes: latest start wins", () => {
    const m = [
      ms({ id: "t1", targetMonth: "2026-06", endMonth: "2026-12", amount: 3000 }),
      ms({ id: "t2", targetMonth: "2026-08", endMonth: "2026-10", amount: 8000 }),
    ];
    expect(resolveEffectiveAmount(BASE, m, "2026-07")).toBe(3000); // only t1
    expect(resolveEffectiveAmount(BASE, m, "2026-09")).toBe(8000); // t2 wins (later start)
    expect(resolveEffectiveAmount(BASE, m, "2026-11")).toBe(3000); // t2 ended, back to t1
    expect(resolveEffectiveAmount(BASE, m, "2027-01")).toBe(BASE); // both ended
  });
});

describe("activeMilestoneAt (which change drives a month)", () => {
  it("returns null on the base, the milestone once it applies", () => {
    const m = [ms({ id: "a", targetMonth: "2026-06", amount: 6000 })];
    expect(activeMilestoneAt(m, "2026-05")).toBeNull();
    expect(activeMilestoneAt(m, "2026-06")?.id).toBe("a");
    expect(activeMilestoneAt(m, "2027-01")?.id).toBe("a");
  });

  it("a temporary change wins inside its window, null reverts after", () => {
    const m = [
      ms({ id: "raise", targetMonth: "2026-03", amount: 6000 }),
      ms({ id: "dip", targetMonth: "2026-06", endMonth: "2026-08", amount: 4000 }),
    ];
    expect(activeMilestoneAt(m, "2026-04")?.id).toBe("raise");
    expect(activeMilestoneAt(m, "2026-07")?.id).toBe("dip");
    expect(activeMilestoneAt(m, "2026-09")?.id).toBe("raise"); // reverts to permanent
  });

  it("returns null when no milestones", () => {
    expect(activeMilestoneAt([], "2026-06")).toBeNull();
  });
});

describe("priorEffectiveAmount (increment vs decrement classification)", () => {
  it("uses base for a first change", () => {
    const raise = ms({ id: "a", targetMonth: "2026-06", amount: 6000 });
    expect(priorEffectiveAmount(BASE, [raise], raise)).toBe(BASE); // 6000 > 5000 → increment
  });

  it("a temporary dip's prior is the permanent raise it sits on", () => {
    const raise = ms({ id: "raise", targetMonth: "2026-03", amount: 6000 });
    const dip = ms({ id: "dip", targetMonth: "2026-06", endMonth: "2026-08", amount: 4000 });
    expect(priorEffectiveAmount(BASE, [raise, dip], dip)).toBe(6000); // 4000 < 6000 → decrement
  });

  it("ignores the milestone itself when computing its prior", () => {
    const a = ms({ id: "a", targetMonth: "2026-06", amount: 9000 });
    // prior to a is base, not a's own amount
    expect(priorEffectiveAmount(BASE, [a], a)).toBe(BASE);
  });
});
