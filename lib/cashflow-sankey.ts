/**
 * Cashflow Sankey model — pure transform (no DB / IO, unit-testable).
 *
 * Turns the household's incomes + expenses into a balanced, top-to-bottom
 * cashflow graph:
 *
 *   incomes (gross, monthly)  →  Total Income hub  →  CPF + expense categories + savings
 *
 * Conservation holds by construction:
 *   Σ gross income (+ shortfall) === employee CPF + Σ expenses + savings
 *
 * Amounts are normalized to a monthly basis via `calculateMonthlyAmount`, so
 * yearly / quarterly / custom-frequency rows all contribute their monthly share
 * and one-time rows drop out (they normalize to 0).
 */

import { calculateMonthlyAmount } from "@/lib/expense-calculator";

/** Minimal shape this transform needs from an income row. */
export interface CashflowIncomeInput {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  incomeCategory: string | null;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
}

/** Minimal shape this transform needs from an expense row. */
export interface CashflowExpenseInput {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  isActive: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type CashflowNodeKind =
  | "income"
  | "hub"
  | "cpf"
  | "category"
  | "investment"   // expense category whose name suggests it's an investment
                   // contribution (e.g. "Investments", "Retirement"). Visually
                   // grouped with Savings + CPF above the divider so the user
                   // sees their non-discretionary money allocations together.
  | "savings"
  | "shortfall"
  | "item";

/**
 * Heuristic: should this expense category be grouped with Savings + CPF
 * (above the discretionary divider) instead of with normal spending?
 * Matches common investment / retirement category names case-insensitively.
 */
export function isSavingsLikeCategory(categoryName: string): boolean {
  return /\b(invest|retire|cpf|sa\b|srs\b)/i.test(categoryName);
}

export interface CashflowNode {
  id: string;
  label: string;
  /** Monthly dollar value the node carries. */
  value: number;
  kind: CashflowNodeKind;
  meta?: {
    /** income only: gross / employee-CPF / net monthly breakdown */
    gross?: number;
    cpf?: number;
    net?: number;
    /** item only: id of the parent category node */
    parentCategoryId?: string;
  };
}

export interface CashflowLink {
  sourceId: string;
  targetId: string;
  value: number;
}

export interface CashflowItem {
  id: string;
  name: string;
  value: number;
}

export interface CashflowCategory {
  id: string;
  name: string;
  value: number;
  items: CashflowItem[];
}

export interface CashflowModel {
  hubId: string;
  /** Layer 0 — income sources (and a shortfall source when overspending). */
  incomeNodes: CashflowNode[];
  /** Layer 2 — CPF, expense categories, and the savings node. */
  outflowNodes: CashflowNode[];
  hub: CashflowNode;
  links: CashflowLink[];
  /** Expense categories with their drill-down line items. */
  categories: CashflowCategory[];
  totalGross: number;
  totalCpf: number;
  totalExpenses: number;
  /** Leftover income after CPF + expenses, clamped at 0. */
  savings: number;
  /** Amount by which CPF + expenses exceed income, clamped at 0. */
  shortfall: number;
}

export const HUB_ID = "__hub__";
export const CPF_ID = "__cpf__";
export const SAVINGS_ID = "__savings__";
export const SHORTFALL_ID = "__shortfall__";

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "");
  return Number.isFinite(n) ? n : 0;
};

const monthly = (
  amount: string | null,
  frequency: string,
  customMonths: string | null,
): number => calculateMonthlyAmount(toNum(amount), frequency, customMonths);

/** Parse a YYYY-MM-DD string as a local date (no TZ shift). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Per-target-month flow for a row. Unlike `calculateMonthlyAmount` (which
 * averages everything to a monthly equivalent), this returns the actual
 * amount that contributes to the given target month — useful when the chart
 * is showing "what does my cashflow look like in May 2026?" rather than
 * "what's my typical monthly flow?".
 *
 * Semantics:
 *   monthly         → full amount
 *   yearly          → 1/12 of amount (assumed paid pro-rata throughout the year)
 *   quarterly       → 1/3 of amount
 *   semi-yearly     → 1/6 of amount
 *   weekly          → amount × 52 / 12
 *   bi-weekly       → amount × 26 / 12
 *   one-time        → full amount iff startDate's month matches target
 *   custom          → full amount iff target month is in customMonths array
 *
 * Returns 0 when the row's start/end dates exclude the target month.
 */
function monthlyForTargetMonth(opts: {
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate?: string | null;
  endDate?: string | null;
  targetYear: number;
  targetMonth: number; // 1-12
}): number {
  const amt = toNum(opts.amount);
  if (amt <= 0) return 0;

  const monthStart = new Date(opts.targetYear, opts.targetMonth - 1, 1);
  const monthEnd = new Date(opts.targetYear, opts.targetMonth, 0);

  if (opts.startDate) {
    const start = parseLocalDate(opts.startDate);
    if (start > monthEnd) return 0;
  }
  if (opts.endDate) {
    const end = parseLocalDate(opts.endDate);
    if (end < monthStart) return 0;
  }

  const freq = opts.frequency.toLowerCase();
  switch (freq) {
    case "monthly":
      return amt;
    case "yearly":
    case "annual":
      return amt / 12;
    case "quarterly":
      return amt / 3;
    case "semi-yearly":
      return amt / 6;
    case "weekly":
      return (amt * 52) / 12;
    case "bi-weekly":
    case "biweekly":
      return (amt * 26) / 12;
    case "one-time": {
      if (!opts.startDate) return 0;
      const start = parseLocalDate(opts.startDate);
      return start.getFullYear() === opts.targetYear &&
        start.getMonth() + 1 === opts.targetMonth
        ? amt
        : 0;
    }
    case "custom": {
      if (!opts.customMonths) return 0;
      try {
        const months = JSON.parse(opts.customMonths) as number[];
        return months.includes(opts.targetMonth) ? amt : 0;
      } catch {
        return 0;
      }
    }
    default:
      return 0;
  }
}

/** Past / future incomes don't belong in *this month's* cashflow. */
function isCurrentIncome(inc: CashflowIncomeInput): boolean {
  if (inc.isActive === false) return false;
  const cat = (inc.incomeCategory ?? "").toLowerCase();
  return !cat.startsWith("past") && !cat.startsWith("future");
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Build the cashflow graph. Pure — same inputs always yield the same model.
 *
 * When `targetMonth` is supplied, values are computed for that specific
 * month (one-time rows count only when they fall in it; custom-month rows
 * count only when the target month is in their schedule; start/end dates
 * exclude rows outside the window). When `targetMonth` is undefined, the
 * legacy "typical monthly" averaging via `calculateMonthlyAmount` is used.
 */
export function buildCashflowModel(
  incomes: CashflowIncomeInput[],
  expenses: CashflowExpenseInput[],
  targetMonth?: { year: number; month: number }, // month is 1-12
): CashflowModel {
  // Pick the amount calculator once per call. The legacy path stays for
  // callers that don't care about a specific month (tests, classic view).
  const amountFor = (row: {
    amount: string;
    frequency: string;
    customMonths: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }): number => {
    if (!targetMonth) {
      return monthly(row.amount, row.frequency, row.customMonths);
    }
    return monthlyForTargetMonth({
      amount: row.amount,
      frequency: row.frequency,
      customMonths: row.customMonths,
      startDate: row.startDate,
      endDate: row.endDate,
      targetYear: targetMonth.year,
      targetMonth: targetMonth.month,
    });
  };

  // --- Income side (gross) + CPF derivation -------------------------------
  const incomeNodes: CashflowNode[] = [];
  let totalGross = 0;
  let totalCpf = 0;

  for (const inc of incomes) {
    if (!isCurrentIncome(inc)) continue;
    const gross = amountFor(inc);
    if (gross <= 0) continue;

    // Employee CPF = gross − net take-home (employer CPF is excluded as it
    // never lands as spendable cash). Only when the income is CPF-subject and
    // a net figure is stored. Scale the stored CPF by the same ratio as the
    // amount so per-month targets stay self-consistent (e.g. a yearly bonus
    // that contributes 1/12 also contributes 1/12 of its CPF deduction).
    let cpf = 0;
    if (inc.subjectToCpf && inc.netTakeHome != null) {
      const rawGross = toNum(inc.amount);
      const ratio = rawGross > 0 ? gross / rawGross : 0;
      const netRaw = toNum(inc.netTakeHome);
      const cpfRaw = Math.max(0, rawGross - netRaw);
      cpf = cpfRaw * ratio;
    }

    totalGross += gross;
    totalCpf += cpf;
    incomeNodes.push({
      id: inc.id,
      label: inc.name,
      value: round2(gross),
      kind: "income",
      meta: { gross: round2(gross), cpf: round2(cpf), net: round2(gross - cpf) },
    });
  }

  incomeNodes.sort((a, b) => b.value - a.value);

  // --- Expense side grouped by category, items kept for drill-down --------
  const catMap = new Map<string, CashflowCategory>();
  let totalExpenses = 0;

  for (const exp of expenses) {
    if (exp.isActive === false) continue;
    const amt = amountFor(exp);
    if (amt <= 0) continue; // one-time / zero rows drop out

    const name = exp.category?.trim() || "Uncategorized";
    const id = `cat:${name.toLowerCase()}`;
    let cat = catMap.get(id);
    if (!cat) {
      cat = { id, name, value: 0, items: [] };
      catMap.set(id, cat);
    }
    cat.value += amt;
    cat.items.push({ id: exp.id, name: exp.name, value: round2(amt) });
    totalExpenses += amt;
  }

  const allCategories = [...catMap.values()]
    .map((c) => ({
      ...c,
      value: round2(c.value),
      items: c.items.sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.value - a.value);

  // Split into savings-like (Investments etc.) and discretionary spend so the
  // outflow stack groups them: Savings → CPF → savings-like categories →
  // divider → spending categories. Both groups stay sorted by value desc.
  const savingsLikeCategories = allCategories.filter((c) =>
    isSavingsLikeCategory(c.name)
  );
  const spendingCategories = allCategories.filter(
    (c) => !isSavingsLikeCategory(c.name)
  );
  const categories = [...savingsLikeCategories, ...spendingCategories];

  // --- Balance node: savings (surplus) or shortfall (overspend) -----------
  const net = totalGross - totalCpf - totalExpenses;
  const savings = round2(Math.max(0, net));
  const shortfall = round2(Math.max(0, -net));

  // --- Assemble nodes + links ---------------------------------------------
  const hub: CashflowNode = {
    id: HUB_ID,
    label: "Total Income",
    value: round2(totalGross + shortfall),
    kind: "hub",
  };

  const links: CashflowLink[] = [];

  // Layer 0 → hub
  for (const node of incomeNodes) {
    links.push({ sourceId: node.id, targetId: HUB_ID, value: node.value });
  }
  if (shortfall > 0) {
    incomeNodes.push({
      id: SHORTFALL_ID,
      label: "Shortfall",
      value: shortfall,
      kind: "shortfall",
    });
    links.push({ sourceId: SHORTFALL_ID, targetId: HUB_ID, value: shortfall });
  }

  // hub → Layer 2. Order matters: the consumer renders with Sankey
  // `sort={false}`, so this array order becomes the visual top-to-bottom
  // order in the outflow column. Pin Savings + CPF to the top of the stack
  // (they're not discretionary spend, so the user wants them anchored
  // away from the category bars). Categories follow in size-desc order.
  const outflowNodes: CashflowNode[] = [];
  if (savings > 0) {
    outflowNodes.push({
      id: SAVINGS_ID,
      label: "Savings",
      value: savings,
      kind: "savings",
    });
  }
  if (totalCpf > 0) {
    outflowNodes.push({
      id: CPF_ID,
      label: "CPF",
      value: round2(totalCpf),
      kind: "cpf",
    });
  }
  for (const cat of categories) {
    outflowNodes.push({
      id: cat.id,
      label: cat.name,
      value: cat.value,
      // Tag investment-style buckets with a distinct kind so the renderer
      // knows to group them above the spending divider while keeping the
      // drill-down behaviour they get as a category.
      kind: isSavingsLikeCategory(cat.name) ? "investment" : "category",
    });
  }
  for (const node of outflowNodes) {
    links.push({ sourceId: HUB_ID, targetId: node.id, value: node.value });
  }

  return {
    hubId: HUB_ID,
    incomeNodes,
    outflowNodes,
    hub,
    links,
    categories,
    totalGross: round2(totalGross),
    totalCpf: round2(totalCpf),
    totalExpenses: round2(totalExpenses),
    savings,
    shortfall,
  };
}
