import { parse, format, addMonths, isSameMonth, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { calculateCPF, calculateBonusCPF } from "./cpf-calculator";

import { resolveEffectiveAmount, type FutureMilestone } from "@/lib/future-change";
import { isSpendingCategory } from "@/lib/expense-classification";

// A bonus entry is one of two shapes (discriminated by which key is present):
//  - recurring: { month: 1-12, amount } where amount is a months-of-salary
//    multiplier that repeats every year.
//  - one-off:   { date: "yyyy-MM", amount } where amount is a direct dollar
//    payout that lands once in that exact month.
interface BonusGroup {
  month?: number;   // 1-12 (calendar month) — recurring
  date?: string;    // "yyyy-MM" — one-off
  amount: string;   // recurring: multiplier (e.g. "1.5"); one-off: dollars
}

interface Income {
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string | null;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureMilestones: string | null;  // JSON string of FutureMilestone[]
  accountForFutureChange: boolean | null;  // Whether to include future milestones in projections
  accountForBonus: boolean | null;  // Whether to include bonus in projections
  bonusGroups: string | null;  // JSON string: [{month: number, amount: string}]
}

interface Expense {
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
  endDate: string | null;
  expenseCategory: string | null;
  /** Display category (Food, Investments, …). Used to exclude savings/investment
   *  categories from spending so they count toward Net Balance instead. */
  category?: string | null;
  isActive: boolean | null;
}

export interface SpecialItem {
  name: string;
  amount: number;
  type: 'one-off-income' | 'one-off-expense' | 'custom-expense' | 'bonus';
}

export interface MonthlyBalanceData {
  month: string;
  balance: number;
  salaryIncome: number;  // Regular salary income (net after CPF)
  bonus: number;  // Net bonus after CPF deductions
  income: number;  // Total income (salary + bonus) for backwards compatibility
  expense: number;
  monthlyBalance: number;
  specialItems: SpecialItem[];
}

/**
 * Get month label for display (e.g., "Jan 2025")
 */
export function getMonthLabel(monthOffset: number): string {
  const date = addMonths(new Date(), monthOffset);
  return format(date, "MMM yyyy");
}

/**
 * Parse custom months from JSON string
 */
function parseCustomMonths(customMonths: string | null): number[] {
  if (!customMonths) return [];
  try {
    return JSON.parse(customMonths);
  } catch {
    return [];
  }
}

/**
 * Check if a date falls within the projection period
 */
function isDateInRange(date: Date, monthOffset: number): boolean {
  const targetMonth = addMonths(startOfMonth(new Date()), monthOffset);
  return isSameMonth(date, targetMonth);
}

/**
 * Check if an item is active for a given month
 */
function isActiveInMonth(startDate: string | null, endDate: string | null, monthOffset: number): boolean {
  const targetMonth = addMonths(startOfMonth(new Date()), monthOffset);

  // If no start date (recurring expenses), treat as always active from the past
  if (!startDate) {
    // If no end date either, it's always active
    if (!endDate) {
      return true;
    }
    // Check if target month is before end date
    const end = parse(endDate, "yyyy-MM-dd", new Date());
    return targetMonth <= endOfMonth(end);
  }

  const start = parse(startDate, "yyyy-MM-dd", new Date());

  // If item hasn't started yet
  if (start > endOfMonth(targetMonth)) {
    return false;
  }

  // If no end date, it's active indefinitely
  if (!endDate) {
    return start <= endOfMonth(targetMonth);
  }

  const end = parse(endDate, "yyyy-MM-dd", new Date());

  // Check if target month is within the date range
  return isWithinInterval(targetMonth, { start: startOfMonth(start), end: endOfMonth(end) });
}

/**
 * Allocate amount to a specific month based on frequency
 */
function allocateAmountToMonth(
  amount: number,
  frequency: string,
  startDate: string | null,
  endDate: string | null,
  customMonths: string | null,
  monthOffset: number
): number {
  // Check if item is active in this month
  if (!isActiveInMonth(startDate, endDate, monthOffset)) {
    return 0;
  }

  const targetMonth = addMonths(new Date(), monthOffset);
  const targetMonthNumber = targetMonth.getMonth() + 1; // 1-12
  const start = startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : null;
  const startMonthNumber = start ? start.getMonth() + 1 : 1;

  // Normalize frequency to lowercase for case-insensitive comparison
  const normalizedFrequency = frequency.toLowerCase();

  switch (normalizedFrequency) {
    case "monthly":
      return amount;

    case "quarterly":
      // Quarterly payments (every 3 months)
      // Check if this month is a payment month (3 months after start)
      // If no start date, assume from beginning of current year
      if (start) {
        const monthsSinceStart = (targetMonth.getFullYear() - start.getFullYear()) * 12 +
                                 (targetMonth.getMonth() - start.getMonth());
        if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0 && targetMonthNumber === targetMonth.getMonth() + 1) {
          return amount;
        }
      }
      return 0;

    case "semi-yearly":
      // Semi-yearly payments (every 6 months)
      // Check if this month is a payment month (6 months after start)
      // If no start date, assume from beginning of current year
      if (start) {
        const monthsSinceStartSemi = (targetMonth.getFullYear() - start.getFullYear()) * 12 +
                                     (targetMonth.getMonth() - start.getMonth());
        if (monthsSinceStartSemi >= 0 && monthsSinceStartSemi % 6 === 0 && targetMonthNumber === targetMonth.getMonth() + 1) {
          return amount;
        }
      }
      return 0;

    case "yearly":
      // Only allocate to the month matching the start date month
      if (targetMonthNumber === startMonthNumber) {
        return amount;
      }
      return 0;

    case "custom":
      const customMonthsList = parseCustomMonths(customMonths);
      // Only allocate if this month is in the custom months list
      if (customMonthsList.includes(targetMonthNumber)) {
        return amount;
      }
      return 0;

    case "one-time":
      // Only allocate to the month of the start date
      // One-time expenses require a start date
      if (start && isDateInRange(start, monthOffset)) {
        return amount;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Calculate monthly balance projections
 */
export function calculateMonthlyBalance(
  incomes: Income[],
  expenses: Expense[],
  totalMonths: number,
  startingBalance: number = 0
): MonthlyBalanceData[] {
  const data: MonthlyBalanceData[] = [];
  let cumulativeBalance = startingBalance;

  // Include all active incomes and expenses (including one-time items)
  const activeIncomes = incomes.filter(
    (income) => income.isActive !== false
  );
  const activeExpenses = expenses.filter(
    (expense) => expense.isActive !== false
  );

  for (let monthOffset = 0; monthOffset < totalMonths; monthOffset++) {
    const targetMonth = addMonths(new Date(), monthOffset);
    const targetMonthNumber = targetMonth.getMonth() + 1; // 1-12 calendar month
    const specialItems: SpecialItem[] = [];

    // Calculate total salary income for this month
    const monthlySalaryIncome = activeIncomes.reduce((total, income) => {
      let amount = parseFloat(income.amount);
      const effectiveStartDate = income.startDate;
      let effectiveEndDate = income.endDate;
      let isUsingMilestone = false;

      // Check if this income has future milestones AND accountForFutureChange is enabled
      if (income.futureMilestones && income.accountForFutureChange) {
        try {
          const milestones: FutureMilestone[] = JSON.parse(income.futureMilestones);
          const targetPeriod = format(targetMonth, "yyyy-MM");

          // Resolve the effective amount honouring permanent + temporary
          // (end-dated) changes — a temporary change reverts to the prior
          // amount after its endMonth (see lib/future-change).
          const resolved = resolveEffectiveAmount(amount, milestones, targetPeriod);
          if (resolved !== amount) {
            amount = resolved;
            isUsingMilestone = true;
          }

          // If there are any PERMANENT future changes, the income continues
          // indefinitely (the latest permanent amount carries forward), so drop
          // any end-date restriction for projection. Temporary-only changes
          // don't extend the income past its real end date.
          const hasPermanent = milestones.some((m) => !m.endMonth);
          if (hasPermanent && effectiveEndDate) {
            effectiveEndDate = null;
          }
        } catch {
          // Fall through to current calculation
        }
      }

      // Calculate effective amount (net take home if subject to CPF)
      let effectiveAmount = amount;
      if (income.subjectToCpf) {
        if (isUsingMilestone) {
          // For milestone income, calculate CPF dynamically based on new amount
          const cpfResult = calculateCPF(amount);
          effectiveAmount = cpfResult.netTakeHome;
        } else {
          // For current income, use the stored netTakeHome if available
          effectiveAmount = income.netTakeHome ? parseFloat(income.netTakeHome) : amount;
        }
      }

      const allocatedAmount = allocateAmountToMonth(
        effectiveAmount,
        income.frequency,
        effectiveStartDate,
        effectiveEndDate,
        income.customMonths,
        monthOffset
      );

      // Track one-off incomes for arrow markers
      if (income.frequency === 'one-time' && allocatedAmount > 0) {
        specialItems.push({
          name: income.name,
          amount: allocatedAmount,
          type: 'one-off-income',
        });
      }

      return total + allocatedAmount;
    }, 0);

    // Calculate total bonus income for this month
    const monthlyBonusIncome = activeIncomes.reduce((total, income) => {
      // Skip if bonus is not enabled for this income
      if (!income.accountForBonus || !income.bonusGroups) {
        return total;
      }

      // Check if income is active in this month
      if (!isActiveInMonth(income.startDate, income.endDate, monthOffset)) {
        return total;
      }

      // Parse bonus groups
      let bonusGroups: BonusGroup[];
      try {
        bonusGroups = JSON.parse(income.bonusGroups);
      } catch {
        return total;
      }

      // Find bonuses landing this month. Recurring entries match on the
      // month-of-year; one-off entries match on the exact "yyyy-MM" key (and
      // there may be more than one of each in a given month).
      const targetMonthKey = format(targetMonth, "yyyy-MM");
      const grossSalary = parseFloat(income.amount);
      const matched = bonusGroups.filter((bg) =>
        typeof bg.date === "string"
          ? bg.date === targetMonthKey
          : bg.month === targetMonthNumber
      );
      if (matched.length === 0) {
        return total;
      }

      let monthBonusNet = 0;
      for (const bonus of matched) {
        const isOneOff = typeof bonus.date === "string";
        // Recurring: monthly salary × multiplier. One-off: the dollar amount.
        const grossBonus = isOneOff
          ? parseFloat(bonus.amount)
          : grossSalary * parseFloat(bonus.amount);
        if (!Number.isFinite(grossBonus) || grossBonus <= 0) continue;

        // Calculate net bonus after CPF deductions (if subject to CPF). The
        // gross bonus is passed to calculateBonusCPF whether it came from a
        // multiplier or a direct dollar amount.
        let netBonus = grossBonus;
        if (income.subjectToCpf) {
          const bonusCpf = calculateBonusCPF(
            grossSalary,  // Monthly OW for ceiling calc
            grossBonus,   // Gross bonus
            30            // Default age
          );
          netBonus = grossBonus - bonusCpf.bonusEmployeeCpf;
        }

        // Track bonus in specialItems for tooltip display
        specialItems.push({
          name: isOneOff
            ? `${income.name} Bonus (one-off ${format(targetMonth, "MMM yyyy")})`
            : `${income.name} Bonus (${parseFloat(bonus.amount)}x)`,
          amount: Math.round(netBonus * 100) / 100,
          type: 'bonus',
        });

        monthBonusNet += netBonus;
      }

      return total + monthBonusNet;
    }, 0);

    // Calculate total expenses for this month
    const monthlyExpense = activeExpenses.reduce((total, expense) => {
      // Savings/investment/retirement categories count toward Net Balance, not
      // spending — skip them so they stay in the balance (matches the Sankey).
      if (!isSpendingCategory(expense.category)) return total;
      const amount = parseFloat(expense.amount);
      const allocatedAmount = allocateAmountToMonth(
        amount,
        expense.frequency,
        expense.startDate,
        expense.endDate,
        expense.customMonths,
        monthOffset
      );

      // Track one-off expenses and custom frequency expenses for arrow markers
      if (allocatedAmount > 0) {
        const expenseFrequency = expense.frequency.toLowerCase();
        if (expenseFrequency === 'one-time') {
          specialItems.push({
            name: expense.name,
            amount: allocatedAmount,
            type: 'one-off-expense',
          });
        } else if (expenseFrequency === 'custom') {
          specialItems.push({
            name: expense.name,
            amount: allocatedAmount,
            type: 'custom-expense',
          });
        }
      }

      return total + allocatedAmount;
    }, 0);

    // Total income = salary + bonus
    const totalMonthlyIncome = monthlySalaryIncome + monthlyBonusIncome;

    // Calculate net balance for this month
    const monthlyBalance = totalMonthlyIncome - monthlyExpense;

    // Add to cumulative balance
    cumulativeBalance += monthlyBalance;

    data.push({
      month: getMonthLabel(monthOffset),
      balance: Math.round(cumulativeBalance * 100) / 100, // Round to 2 decimal places
      salaryIncome: Math.round(monthlySalaryIncome * 100) / 100,
      bonus: Math.round(monthlyBonusIncome * 100) / 100,
      income: Math.round(totalMonthlyIncome * 100) / 100, // Total income for backwards compatibility
      expense: Math.round(monthlyExpense * 100) / 100,
      monthlyBalance: Math.round(monthlyBalance * 100) / 100, // Monthly net balance (non-cumulative)
      specialItems,
    });
  }

  return data;
}

/**
 * Convert time range string to number of months
 */
export function timeRangeToMonths(timeRange: string): number {
  switch (timeRange) {
    case "12":
      return 12;
    case "24":
      return 24;
    case "36":
      return 36;
    case "60":
      return 60;
    case "120":
      return 120;
    default:
      return parseInt(timeRange) || 12;
  }
}
