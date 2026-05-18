"use server";

import { getCurrentUserAndFamily } from "@/lib/auth-context";
import { getBudgetForMonth } from "@/lib/services/budget";

export interface CategoryBudget {
  categoryId: string | null;
  categoryName: string;
  monthlyBudget: number;
  icon: string | null;
}

export interface BudgetVsActual {
  categoryName: string;
  categoryId: string | null;
  icon: string | null;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Calculate monthly budget per category from recurring expenses.
 * Only includes tracked-in-budget expenses; for a specific month, also
 * includes one-time expenses that occur in that month.
 */
export async function calculateCategoryBudgets(
  year?: number,
  month?: number
): Promise<CategoryBudget[]> {
  try {
    const ctx = await getCurrentUserAndFamily();
    // No year/month → use current month for the rollup. Mirrors how the
    // existing UI calls this when it just wants "this month".
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const { categories } = await getBudgetForMonth(ctx, y, m);
    return categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      monthlyBudget: c.monthlyBudget,
      icon: c.icon,
    }));
  } catch (error) {
    console.error("Error calculating category budgets:", error);
    return [];
  }
}

/**
 * Calculate total monthly budget from all tracked recurring expenses.
 */
export async function getTotalMonthlyBudget(
  year?: number,
  month?: number
): Promise<number> {
  try {
    const ctx = await getCurrentUserAndFamily();
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const { summary } = await getBudgetForMonth(ctx, y, m);
    return summary.totalBudget;
  } catch (error) {
    console.error("Error calculating total monthly budget:", error);
    return 0;
  }
}

/**
 * Get budget vs actual per category for a specific month.
 */
export async function getBudgetVsActual(
  year: number,
  month: number
): Promise<BudgetVsActual[]> {
  try {
    const ctx = await getCurrentUserAndFamily();
    const { categories } = await getBudgetForMonth(ctx, year, month);
    return categories;
  } catch (error) {
    console.error("Error calculating budget vs actual:", error);
    return [];
  }
}

/**
 * Overall budget summary for a month.
 */
export async function getBudgetSummary(year: number, month: number) {
  try {
    const ctx = await getCurrentUserAndFamily();
    const { summary } = await getBudgetForMonth(ctx, year, month);
    return summary;
  } catch (error) {
    console.error("Error calculating budget summary:", error);
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentUsed: 0,
      dailyBudget: 0,
      expectedSpentByToday: 0,
      pacingStatus: "on-track" as const,
      daysInMonth: 30,
      currentDay: 1,
    };
  }
}
