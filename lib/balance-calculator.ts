import { parse, format, addMonths, isSameMonth, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { calculateCPF } from "./cpf-calculator";

interface Income {
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureIncomeChange: boolean | null;
  futureIncomeAmount: string | null;
  futureIncomeStartDate: string | null;
  futureIncomeEndDate: string | null;
}

interface Expense {
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  expenseCategory: string;
  isActive: boolean | null;
}

export interface MonthlyBalanceData {
  month: string;
  balance: number;
  income: number;
  expense: number;
  monthlyBalance: number;
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
function isActiveInMonth(startDate: string, endDate: string | null, monthOffset: number): boolean {
  const targetMonth = addMonths(startOfMonth(new Date()), monthOffset);
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
  startDate: string,
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
  const start = parse(startDate, "yyyy-MM-dd", new Date());
  const startMonthNumber = start.getMonth() + 1;

  switch (frequency) {
    case "monthly":
      return amount;

    case "quarterly":
      // Quarterly payments (every 3 months)
      // Check if this month is a payment month (3 months after start)
      const monthsSinceStart = (targetMonth.getFullYear() - start.getFullYear()) * 12 +
                               (targetMonth.getMonth() - start.getMonth());
      if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0 && targetMonthNumber === targetMonth.getMonth() + 1) {
        return amount;
      }
      return 0;

    case "semi-yearly":
      // Semi-yearly payments (every 6 months)
      // Check if this month is a payment month (6 months after start)
      const monthsSinceStartSemi = (targetMonth.getFullYear() - start.getFullYear()) * 12 +
                                   (targetMonth.getMonth() - start.getMonth());
      if (monthsSinceStartSemi >= 0 && monthsSinceStartSemi % 6 === 0 && targetMonthNumber === targetMonth.getMonth() + 1) {
        return amount;
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
      if (isDateInRange(start, monthOffset)) {
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

  // Filter for current-recurring items only
  const activeIncomes = incomes.filter(
    (income) => income.incomeCategory === "current-recurring" && income.isActive !== false
  );
  const activeExpenses = expenses.filter(
    (expense) => expense.expenseCategory === "current-recurring" && expense.isActive !== false
  );

  for (let monthOffset = 0; monthOffset < totalMonths; monthOffset++) {
    const targetMonth = addMonths(new Date(), monthOffset);

    // Calculate total income for this month
    const monthlyIncome = activeIncomes.reduce((total, income) => {
      let amount = parseFloat(income.amount);
      let effectiveStartDate = income.startDate;
      let effectiveEndDate = income.endDate;
      let isUsingFutureIncome = false;

      // Check if this income has a future income change
      if (income.futureIncomeChange && income.futureIncomeAmount && income.futureIncomeStartDate) {
        const futureStartDate = parse(income.futureIncomeStartDate, "yyyy-MM-dd", new Date());

        // If we're in the future income period, use the future amount
        if (targetMonth >= startOfMonth(futureStartDate)) {
          amount = parseFloat(income.futureIncomeAmount);
          effectiveStartDate = income.futureIncomeStartDate;
          effectiveEndDate = income.futureIncomeEndDate || null;
          isUsingFutureIncome = true;
        } else {
          // We're still in the current income period
          // Set the end date to the day before future income starts
          effectiveEndDate = income.futureIncomeStartDate;
        }
      }

      // Calculate effective amount (net take home if subject to CPF)
      let effectiveAmount = amount;
      if (income.subjectToCpf) {
        if (isUsingFutureIncome) {
          // For future income, calculate CPF dynamically based on future amount
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

      return total + allocatedAmount;
    }, 0);

    // Calculate total expenses for this month
    const monthlyExpense = activeExpenses.reduce((total, expense) => {
      const amount = parseFloat(expense.amount);
      const allocatedAmount = allocateAmountToMonth(
        amount,
        expense.frequency,
        expense.startDate,
        expense.endDate,
        expense.customMonths,
        monthOffset
      );

      return total + allocatedAmount;
    }, 0);

    // Calculate net balance for this month
    const monthlyBalance = monthlyIncome - monthlyExpense;

    // Add to cumulative balance
    cumulativeBalance += monthlyBalance;

    data.push({
      month: getMonthLabel(monthOffset),
      balance: Math.round(cumulativeBalance * 100) / 100, // Round to 2 decimal places
      income: Math.round(monthlyIncome * 100) / 100,
      expense: Math.round(monthlyExpense * 100) / 100,
      monthlyBalance: Math.round(monthlyBalance * 100) / 100, // Monthly net balance (non-cumulative)
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
