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
}

export type CashflowNodeKind =
  | "income"
  | "hub"
  | "cpf"
  | "category"
  | "savings"
  | "shortfall"
  | "item";

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

/** Past / future incomes don't belong in *this month's* cashflow. */
function isCurrentIncome(inc: CashflowIncomeInput): boolean {
  if (inc.isActive === false) return false;
  const cat = (inc.incomeCategory ?? "").toLowerCase();
  return !cat.startsWith("past") && !cat.startsWith("future");
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Build the cashflow graph. Pure — same inputs always yield the same model.
 */
export function buildCashflowModel(
  incomes: CashflowIncomeInput[],
  expenses: CashflowExpenseInput[],
): CashflowModel {
  // --- Income side (gross) + CPF derivation -------------------------------
  const incomeNodes: CashflowNode[] = [];
  let totalGross = 0;
  let totalCpf = 0;

  for (const inc of incomes) {
    if (!isCurrentIncome(inc)) continue;
    const gross = monthly(inc.amount, inc.frequency, inc.customMonths);
    if (gross <= 0) continue;

    // Employee CPF = gross − net take-home (employer CPF is excluded as it
    // never lands as spendable cash). Only when the income is CPF-subject and
    // a net figure is stored.
    let cpf = 0;
    if (inc.subjectToCpf && inc.netTakeHome != null) {
      const net = monthly(inc.netTakeHome, inc.frequency, inc.customMonths);
      cpf = Math.max(0, gross - net);
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
    const amt = monthly(exp.amount, exp.frequency, exp.customMonths);
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

  const categories = [...catMap.values()]
    .map((c) => ({
      ...c,
      value: round2(c.value),
      items: c.items.sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.value - a.value);

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
      kind: "category",
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
