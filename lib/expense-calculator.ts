/**
 * Expense Calculator Utility
 * Provides functions to calculate and analyze expense data
 */

interface Expense {
  id: string;
  name: string;
  category: string;
  expenseCategory: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
}

export interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  avgPerExpense: number;
  color: string;
}

export interface ExpenseBreakdown {
  categories: CategoryTotal[];
  totalAmount: number;
  totalExpenses: number;
}

/**
 * Generate a consistent color for a category based on its name
 */
export function getCategoryColor(categoryName: string): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#10b981", // emerald
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
    "#f43f5e", // rose
  ];

  // Hash the category name to get a consistent index
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;

  return colors[index];
}

/**
 * Filter expenses by date range
 */
export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Expense[] {
  return expenses.filter((expense) => {
    if (!expense.isActive) return false;

    const expenseStart = new Date(expense.startDate);
    const expenseEnd = expense.endDate ? new Date(expense.endDate) : null;

    // Check if expense overlaps with the date range
    if (expenseStart > endDate) return false;
    if (expenseEnd && expenseEnd < startDate) return false;

    return true;
  });
}

/**
 * Calculate total expenses by category
 */
export function calculateExpensesByCategory(expenses: Expense[]): ExpenseBreakdown {
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  let totalAmount = 0;

  expenses.forEach((expense) => {
    const amount = parseFloat(expense.amount);
    totalAmount += amount;

    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { amount: 0, count: 0 };
    }

    categoryTotals[expense.category].amount += amount;
    categoryTotals[expense.category].count += 1;
  });

  const categories: CategoryTotal[] = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: (data.amount / totalAmount) * 100,
      count: data.count,
      avgPerExpense: data.amount / data.count,
      color: getCategoryColor(category),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    categories,
    totalAmount,
    totalExpenses: expenses.length,
  };
}

/**
 * Get top N categories by expense amount
 */
export function getTopCategories(
  expenses: Expense[],
  topN: number = 5
): CategoryTotal[] {
  const breakdown = calculateExpensesByCategory(expenses);
  return breakdown.categories.slice(0, topN);
}

/**
 * Calculate monthly expense based on frequency
 */
export function calculateMonthlyAmount(
  amount: number,
  frequency: string,
  customMonths: string | null
): number {
  switch (frequency) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "semi-yearly":
      return amount / 6;
    case "one-time":
      return 0; // One-time expenses don't count toward monthly
    case "custom":
      if (customMonths) {
        try {
          const months = JSON.parse(customMonths);
          // Assume the amount is per occurrence, and calculate average monthly
          return (amount * months.length) / 12;
        } catch {
          return 0;
        }
      }
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate date ranges for time period selector
 */
export function getDateRangeForPeriod(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "current-month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "3-months":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6-months":
      start.setMonth(start.getMonth() - 6);
      break;
    case "ytd":
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "12-months":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "all-time":
      start.setFullYear(2000, 0, 1);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}
