// Auto-promote "future" incomes to "current" once their start date arrives.
//
// `incomeCategory` is a planning tag set when the income is created (past /
// current / future). A "future" income is one that hasn't started yet — but
// once its start date passes it's really current income. Rather than mutate the
// DB on a schedule, we DERIVE the effective category at read time from the
// stored tag + the start date, so the label stays honest as time moves with no
// cron job and no destructive writes.

/**
 * Effective income category. A "future" income whose `startDate` is on or
 * before today reads as "current"; everything else passes through unchanged.
 * `now` is injectable for testing.
 */
export function effectiveIncomeCategory(
  incomeCategory: string | null | undefined,
  startDate: string | null | undefined,
  now: Date = new Date()
): string | null {
  const stored = incomeCategory ?? null;
  if ((stored ?? "").toLowerCase() !== "future" || !startDate) return stored;

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  // startDate is "YYYY-MM-DD" (possibly with a time suffix) — compare the date part.
  return startDate.slice(0, 10) <= todayKey ? "current" : stored;
}
