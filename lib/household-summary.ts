import { grossForMonth } from "@/lib/income-month";
import { calculateMonthlyAmount } from "@/lib/expense-calculator";
import { format } from "date-fns";

export interface HouseholdSummary {
  /** Sum of grossForMonth across all active incomes for the current month. */
  grossIncome: number;
  /** Gross minus employee CPF deductions. */
  netIncome: number;
  /** Employee-side CPF contributions (gross × (1 − netTakeHome/amount) ratio). */
  cpfEmployeeTotal: number;
  /** Sum of monthly-equivalent active expenses (one-time excluded). */
  monthlyExpenses: number;
  /** netIncome − monthlyExpenses. */
  surplus: number;
  /** Sum of liquid bank holdings (currentHoldings). CPF excluded. */
  liquidHoldings: number;
  /**
   * liquidHoldings / monthlyExpenses, rounded to 1 decimal.
   * Null when monthlyExpenses = 0 (would be division by zero).
   * v1: CPF OA excluded even though it's partially accessible for housing loan.
   */
  runwayMonths: number | null;
  /** Count of family members in the household. */
  memberCount: number;
}

// ---- minimal shapes for the function inputs --------------------------------
// These use the fields we actually need; callers pass the full DB row objects.

type IncomeRow = {
  amount: string;
  frequency: string;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  isActive: boolean | null;
  startDate: string;
  endDate: string | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  customMonths: string | null;
};

type ExpenseRow = {
  amount: string;
  frequency: string;
  customMonths: string | null;
  isActive: boolean | null;
};

type HoldingRow = {
  holdingAmount: string;
};

type FamilyMemberRow = {
  id: string;
};

// ---------------------------------------------------------------------------

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "");
  return Number.isFinite(n) ? n : 0;
};

/**
 * CPF employee deduction ratio for a single income, derived from the stored
 * netTakeHome — identical to the formula in lib/cashflow-sankey.ts so the
 * HouseholdContextStrip and the Sankey always agree numerically.
 */
function cpfRatioFor(income: IncomeRow): number {
  if (!income.subjectToCpf || income.netTakeHome == null) return 0;
  const rawGross = toNum(income.amount);
  if (rawGross <= 0) return 0;
  const rawNet = toNum(income.netTakeHome);
  return Math.max(0, rawGross - rawNet) / rawGross;
}

/**
 * Compute a household-level financial snapshot for the current calendar month.
 *
 * Pure function — no DB calls, no React. Called server-side in
 * app/(app)/user/page.tsx after all data is fetched, then passed as a prop.
 */
export function computeHouseholdSummary(
  incomes: IncomeRow[],
  expenses: ExpenseRow[],
  holdings: HoldingRow[],
  familyMembers: FamilyMemberRow[],
): HouseholdSummary {
  const currentMonthKey = format(new Date(), "yyyy-MM");

  let grossIncome = 0;
  let cpfEmployeeTotal = 0;

  for (const inc of incomes) {
    if (inc.isActive === false) continue;

    const gross = grossForMonth(
      {
        amount: inc.amount,
        frequency: inc.frequency,
        isActive: inc.isActive,
        startDate: inc.startDate,
        endDate: inc.endDate,
        futureMilestones: inc.futureMilestones,
        accountForFutureChange: inc.accountForFutureChange,
        accountForBonus: inc.accountForBonus,
        bonusGroups: inc.bonusGroups,
        customMonths: inc.customMonths,
      },
      currentMonthKey,
    );

    if (gross <= 0) continue;

    const cpf = gross * cpfRatioFor(inc);
    grossIncome += gross;
    cpfEmployeeTotal += cpf;
  }

  const netIncome = grossIncome - cpfEmployeeTotal;

  const monthlyExpenses = expenses
    .filter((e) => e.isActive !== false)
    .reduce(
      (sum, e) => sum + calculateMonthlyAmount(toNum(e.amount), e.frequency, e.customMonths),
      0,
    );

  const surplus = netIncome - monthlyExpenses;

  const liquidHoldings = holdings.reduce((sum, h) => sum + toNum(h.holdingAmount), 0);

  const runwayMonths =
    monthlyExpenses > 0 ? Math.round((liquidHoldings / monthlyExpenses) * 10) / 10 : null;

  return {
    grossIncome,
    netIncome,
    cpfEmployeeTotal,
    monthlyExpenses,
    surplus,
    liquidHoldings,
    runwayMonths,
    memberCount: familyMembers.length,
  };
}
