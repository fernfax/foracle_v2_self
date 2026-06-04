import { describe, it, expect } from "vitest";
import { effectiveIncomeCategory } from "@/lib/income-category";

// Fixed "today" so the tests are deterministic.
const NOW = new Date(2026, 7, 15); // 15 Aug 2026 (month is 0-indexed)

describe("effectiveIncomeCategory", () => {
  it("promotes a future income whose start date has passed to current", () => {
    expect(effectiveIncomeCategory("future", "2026-08-01", NOW)).toBe("current");
    expect(effectiveIncomeCategory("future", "2026-01-10", NOW)).toBe("current");
  });

  it("promotes on the exact start date (inclusive)", () => {
    expect(effectiveIncomeCategory("future", "2026-08-15", NOW)).toBe("current");
  });

  it("keeps a future income whose start date is still ahead", () => {
    expect(effectiveIncomeCategory("future", "2026-09-01", NOW)).toBe("future");
    expect(effectiveIncomeCategory("future", "2027-01-01", NOW)).toBe("future");
  });

  it("leaves current / past / null categories unchanged", () => {
    expect(effectiveIncomeCategory("current", "2026-01-01", NOW)).toBe("current");
    expect(effectiveIncomeCategory("past", "2020-01-01", NOW)).toBe("past");
    expect(effectiveIncomeCategory(null, "2026-01-01", NOW)).toBeNull();
  });

  it("leaves a future income without a start date unchanged", () => {
    expect(effectiveIncomeCategory("future", null, NOW)).toBe("future");
  });

  it("handles a datetime-suffixed start date by comparing the date part", () => {
    expect(effectiveIncomeCategory("future", "2026-08-01T00:00:00Z", NOW)).toBe("current");
  });
});
