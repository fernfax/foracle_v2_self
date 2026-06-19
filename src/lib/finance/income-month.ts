// Per-month income math — pure, no React, no IO. Single source of truth for
// "how much does this income pay in month M", honouring future income changes
// (milestones) and bonuses. Shared by the Timeline Studio (bars/river) and the
// dashboard cashflow Sankey so the two can never drift.
//
// Lifted from the previously-private getAmountForMonth / getBonusForMonth in
// components/income/timeline/timeline-view.tsx, re-keyed by a "YYYY-MM"
// month string instead of a MonthCell. All values are GROSS — callers derive
// CPF/net from the stored netTakeHome ratio (the Sankey and the studio share
// that convention).

import {
  resolveEffectiveAmount,
  type FutureMilestone
} from "@/lib/finance/future-change"

/** Minimal income shape the month math needs. */
export interface MonthAmountIncome {
  amount: string
  frequency: string // beta rows are always "monthly"
  customMonths: string | null
  startDate: string // "YYYY-MM-DD"
  endDate?: string | null
  isActive?: boolean | null
  futureMilestones?: string | null
  accountForFutureChange?: boolean | null
  accountForBonus?: boolean | null
  bonusGroups?: string | null
}

/** Parse stored futureMilestones JSON into typed, sorted milestones (safe). */
export function safeParseMilestones(
  json: string | null | undefined
): FutureMilestone[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && typeof m.targetMonth === "string")
      .map((m) => ({
        id: String(m.id ?? m.targetMonth),
        targetMonth: m.targetMonth as string,
        amount: Number(m.amount) || 0,
        endMonth:
          typeof m.endMonth === "string" && m.endMonth ? m.endMonth : null,
        reason: m.reason,
        notes: m.notes
      }))
      .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  } catch {
    return []
  }
}

/**
 * A parsed bonus entry — discriminated by `kind`:
 *  - "recurring": repeats every year in calendar `month` (1-12); `multiplier` is
 *    a months-of-salary multiplier applied to the effective monthly base.
 *  - "one-off": lands once in `date` ("YYYY-MM"); `dollars` is a direct payout.
 */
export type ParsedBonus =
  | { kind: "recurring"; month: number; multiplier: number }
  | { kind: "one-off"; date: string; dollars: number }

/**
 * Parse stored bonusGroups JSON into typed entries. Backward compatible: an
 * entry with a numeric `month` is recurring (amount = multiplier); an entry with
 * a string `date` ("YYYY-MM") is a one-off (amount = direct dollars).
 */
export function parseBonusGroups(
  json: string | null | undefined
): ParsedBonus[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (g) =>
          g &&
          g.amount !== undefined &&
          g.amount !== null &&
          g.amount !== "" &&
          (typeof g.date === "string" || typeof g.month === "number")
      )
      .map(
        (g): ParsedBonus =>
          typeof g.date === "string"
            ? {
                kind: "one-off",
                date: g.date as string,
                dollars: Number(g.amount) || 0
              }
            : {
                kind: "recurring",
                month: g.month as number,
                multiplier: Number(g.amount) || 0
              }
      )
      .filter((g) => (g.kind === "one-off" ? g.dollars > 0 : g.multiplier > 0))
  } catch {
    return []
  }
}

/**
 * Is `monthKey` ("YYYY-MM") within the income's start/end window? Compares
 * month strings directly (lexical order matches chronological for "YYYY-MM").
 */
export function isMonthInIncomeWindow(
  income: Pick<MonthAmountIncome, "startDate" | "endDate">,
  monthKey: string
): boolean {
  const startKey = income.startDate.slice(0, 7)
  if (monthKey < startKey) return false
  if (income.endDate) {
    const endKey = income.endDate.slice(0, 7)
    if (monthKey > endKey) return false
  }
  return true
}

/**
 * Gross income payable in `monthKey` — window-, milestone- and frequency-aware.
 * Returns 0 when the income is inactive or the month falls outside its window.
 * The effective monthly base honours permanent + temporary future changes via
 * `resolveEffectiveAmount`; the frequency switch then prorates it (beta rows are
 * always "monthly", but the other branches are kept for forward-compat).
 */
export function grossForMonth(
  income: MonthAmountIncome,
  monthKey: string
): number {
  if (income.isActive === false) return 0
  if (!isMonthInIncomeWindow(income, monthKey)) return 0

  const baseAmount = Number(income.amount) || 0
  const milestones = income.accountForFutureChange
    ? safeParseMilestones(income.futureMilestones)
    : []
  const effectiveAmount = resolveEffectiveAmount(
    baseAmount,
    milestones,
    monthKey
  )

  const cellMonthNum = Number(monthKey.slice(5, 7)) // 1-12

  switch (income.frequency) {
    case "monthly":
      return effectiveAmount
    case "yearly": {
      const startMonth = income.startDate.slice(5, 7)
      return startMonth === monthKey.slice(5, 7) ? effectiveAmount : 0
    }
    case "weekly":
      return effectiveAmount * (52 / 12)
    case "bi-weekly":
      return effectiveAmount * (26 / 12)
    case "one-time": {
      const startKey = income.startDate.slice(0, 7)
      return monthKey === startKey ? effectiveAmount : 0
    }
    case "custom": {
      try {
        const months: number[] = JSON.parse(income.customMonths || "[]")
        return months.includes(cellMonthNum) ? effectiveAmount : 0
      } catch {
        return 0
      }
    }
    default:
      return effectiveAmount
  }
}

/**
 * Gross bonus payable in `monthKey` (0 when none). Scales off the income's
 * effective monthly base for that month (so a bonus after a raise uses the
 * raised amount) — mirrors the studio's bonus bars and balance-calculator.
 */
export function bonusForMonth(
  income: MonthAmountIncome,
  monthKey: string
): number {
  if (
    income.isActive === false ||
    !income.accountForBonus ||
    !income.bonusGroups
  ) {
    return 0
  }
  if (!isMonthInIncomeWindow(income, monthKey)) return 0
  const groups = parseBonusGroups(income.bonusGroups)
  if (groups.length === 0) return 0

  const cellMonthNum = Number(monthKey.slice(5, 7)) // 1-12

  const baseAmount = Number(income.amount) || 0
  const milestones = income.accountForFutureChange
    ? safeParseMilestones(income.futureMilestones)
    : []
  const effectiveMonthly = resolveEffectiveAmount(
    baseAmount,
    milestones,
    monthKey
  )

  // Recurring entries match on the month-of-year (multiplier × monthly base);
  // one-off entries match on the exact "YYYY-MM" and contribute dollars directly.
  return groups.reduce((sum, g) => {
    if (g.kind === "one-off") {
      return g.date === monthKey ? sum + g.dollars : sum
    }
    return g.month === cellMonthNum
      ? sum + effectiveMonthly * g.multiplier
      : sum
  }, 0)
}

/**
 * Total bonus DOLLARS attracting CPF in calendar `year` for a single income.
 * Recurring bonuses repeat every year, so they always count (multiplier ×
 * monthly base); one-off bonuses count only when their "YYYY-MM" falls in
 * `year`. Pure — the caller supplies `year` (pin it to the intended timezone;
 * an unpinned year drops year-boundary one-offs on a UTC server). Single home
 * for the recurring-vs-one-off dollar contract, shared by the CPF tab.
 */
export function bonusDollarsForYear(
  bonusGroups: string | null | undefined,
  monthlyGross: number,
  year: number
): number {
  const yearPrefix = String(year)
  return parseBonusGroups(bonusGroups).reduce((sum, g) => {
    if (g.kind === "recurring") return sum + monthlyGross * g.multiplier
    return g.date.startsWith(yearPrefix) ? sum + g.dollars : sum
  }, 0)
}
