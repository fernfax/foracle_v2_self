"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { expenses, expenseCategories, dailyExpenses } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { calculateMonthlyAmount } from "@/lib/expense-calculator";

// Frequency multipliers for converting to monthly
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  yearly: 1 / 12,
  weekly: 4.33,
  "bi-weekly": 2.17,
  quarterly: 1 / 3,
  "semi-yearly": 1 / 6,
};

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
 * Calculate monthly budget per category from recurring expenses
 * Only includes expenses that are tracked in budget
 */
export async function calculateCategoryBudgets(): Promise<CategoryBudget[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get all active recurring expenses that are tracked in budget
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.userId, userId),
        eq(expenses.isActive, true),
        eq(expenses.trackedInBudget, true)
      ));

    // Get all expense categories with icons
    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId));

    // Create a map of category names to icons
    const categoryIconMap: Record<string, { id: string; icon: string | null }> = {};
    categories.forEach((cat) => {
      categoryIconMap[cat.name] = { id: cat.id, icon: cat.icon };
    });

    // Calculate monthly budget per category (only from tracked expenses)
    const categoryBudgets: Record<
      string,
      { categoryId: string | null; monthlyBudget: number; icon: string | null }
    > = {};

    userExpenses.forEach((expense) => {
      const amount = parseFloat(expense.amount);
      const monthlyAmount = calculateMonthlyAmount(
        amount,
        expense.frequency,
        expense.customMonths
      );

      if (!categoryBudgets[expense.category]) {
        const catInfo = categoryIconMap[expense.category];
        categoryBudgets[expense.category] = {
          categoryId: catInfo?.id || null,
          monthlyBudget: 0,
          icon: catInfo?.icon || null,
        };
      }

      categoryBudgets[expense.category].monthlyBudget += monthlyAmount;
    });

    return Object.entries(categoryBudgets).map(([categoryName, data]) => ({
      categoryName,
      categoryId: data.categoryId,
      monthlyBudget: data.monthlyBudget,
      icon: data.icon,
    }));
  } catch (error) {
    console.error("Error calculating category budgets:", error);
    return [];
  }
}

/**
 * Calculate total monthly budget from all tracked recurring expenses
 */
export async function getTotalMonthlyBudget(): Promise<number> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get only tracked expenses
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.userId, userId),
        eq(expenses.isActive, true),
        eq(expenses.trackedInBudget, true)
      ));

    return userExpenses.reduce((total, expense) => {
      const amount = parseFloat(expense.amount);
      const monthlyAmount = calculateMonthlyAmount(
        amount,
        expense.frequency,
        expense.customMonths
      );
      return total + monthlyAmount;
    }, 0);
  } catch (error) {
    console.error("Error calculating total monthly budget:", error);
    return 0;
  }
}

/**
 * Get the category names that have at least one tracked expense
 */
async function getTrackedCategoryNames(userId: string): Promise<Set<string>> {
  const trackedExpenses = await db
    .select({ category: expenses.category })
    .from(expenses)
    .where(and(
      eq(expenses.userId, userId),
      eq(expenses.isActive, true),
      eq(expenses.trackedInBudget, true)
    ));

  return new Set(trackedExpenses.map((e) => e.category));
}

/**
 * Get budget vs actual for a specific month
 * Only includes categories with tracked expenses
 */
export async function getBudgetVsActual(
  year: number,
  month: number
): Promise<BudgetVsActual[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get categories that have tracked expenses
    const trackedCategoryNames = await getTrackedCategoryNames(userId);

    // Get all expense categories with icons
    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId));

    // Get category budgets (already filtered by tracked expenses)
    const categoryBudgets = await calculateCategoryBudgets();

    // Get actual spending for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const spending = await db
      .select({
        categoryName: dailyExpenses.categoryName,
        totalSpent: sql<number>`sum(${dailyExpenses.amount})::numeric`,
      })
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.userId, userId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .groupBy(dailyExpenses.categoryName);

    // Create a map of spending by category (only tracked categories)
    const spendingMap: Record<string, number> = {};
    spending.forEach((s) => {
      if (trackedCategoryNames.has(s.categoryName)) {
        spendingMap[s.categoryName] = Number(s.totalSpent) || 0;
      }
    });

    // Combine budgets with actual spending
    const result: BudgetVsActual[] = categoryBudgets.map((budget) => {
      const spent = spendingMap[budget.categoryName] || 0;
      const remaining = budget.monthlyBudget - spent;
      const percentUsed =
        budget.monthlyBudget > 0 ? (spent / budget.monthlyBudget) * 100 : 0;

      return {
        categoryName: budget.categoryName,
        categoryId: budget.categoryId,
        icon: budget.icon,
        monthlyBudget: budget.monthlyBudget,
        spent,
        remaining,
        percentUsed,
      };
    });

    // Add any tracked categories that have spending but no budget
    Object.entries(spendingMap).forEach(([categoryName, spent]) => {
      if (!result.find((r) => r.categoryName === categoryName)) {
        // Find the category info
        const cat = categories.find((c) => c.name === categoryName);
        result.push({
          categoryName,
          categoryId: cat?.id || null,
          icon: cat?.icon || null,
          monthlyBudget: 0,
          spent,
          remaining: -spent,
          percentUsed: 100,
        });
      }
    });

    // Sort by monthly budget (highest first), then by spent (highest first)
    return result.sort((a, b) => {
      if (b.monthlyBudget !== a.monthlyBudget) {
        return b.monthlyBudget - a.monthlyBudget;
      }
      return b.spent - a.spent;
    });
  } catch (error) {
    console.error("Error calculating budget vs actual:", error);
    return [];
  }
}

/**
 * Get overall budget summary for a month
 * Only includes tracked expenses
 */
export async function getBudgetSummary(year: number, month: number) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get category names that have tracked expenses
    const trackedCategoryNames = await getTrackedCategoryNames(userId);

    const totalBudget = await getTotalMonthlyBudget();

    // Get total spending for the month - only for tracked categories
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Get all daily expenses for the month
    const allExpenses = await db
      .select()
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.userId, userId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      );

    // Sum only tracked category expenses
    const totalSpent = allExpenses
      .filter((exp) => trackedCategoryNames.has(exp.categoryName))
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Calculate daily budget and pacing (using Singapore Time for day calculation)
    const daysInMonth = lastDay;
    const sgtDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
    const currentDay = parseInt(sgtDate.split("-")[2], 10);
    const dailyBudget = totalBudget / daysInMonth;
    const expectedSpentByToday = dailyBudget * currentDay;

    // Determine pacing status
    let pacingStatus: "under" | "on-track" | "over" = "on-track";
    if (totalSpent < expectedSpentByToday * 0.9) {
      pacingStatus = "under";
    } else if (totalSpent > expectedSpentByToday * 1.1) {
      pacingStatus = "over";
    }

    return {
      totalBudget,
      totalSpent,
      remaining,
      percentUsed,
      dailyBudget,
      expectedSpentByToday,
      pacingStatus,
      daysInMonth,
      currentDay,
    };
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
