import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  budgetShifts,
  dailyExpenses,
  expenseCategories,
  expenses,
} from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import { calculateMonthlyAmount } from "@/lib/expense-calculator";

export type CategoryBudgetRow = {
  categoryId: string | null;
  categoryName: string;
  icon: string | null;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  dailyBudget: number;
  expectedSpentByToday: number;
  pacingStatus: "under" | "on-track" | "over";
  daysInMonth: number;
  currentDay: number;
};

export type BudgetForMonth = {
  year: number;
  month: number;
  summary: BudgetSummary;
  categories: CategoryBudgetRow[];
};

function isOneTimeExpenseInMonth(
  startDate: string | null,
  year: number,
  month: number
): boolean {
  if (!startDate) return false;
  const date = new Date(startDate);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

// Aggregates budget_shifts into a per-category net adjustment map for the
// given month. Positive = budget added to category, negative = budget moved
// away from category.
async function getAdjustments(
  ctx: AuthContext,
  year: number,
  month: number
): Promise<Record<string, number>> {
  const shifts = await db
    .select()
    .from(budgetShifts)
    .where(
      and(
        eq(budgetShifts.userId, ctx.userId),
        eq(budgetShifts.year, year),
        eq(budgetShifts.month, month)
      )
    );
  const adjustments: Record<string, number> = {};
  for (const s of shifts) {
    const amount = parseFloat(s.amount);
    adjustments[s.fromCategoryName] = (adjustments[s.fromCategoryName] ?? 0) - amount;
    adjustments[s.toCategoryName] = (adjustments[s.toCategoryName] ?? 0) + amount;
  }
  return adjustments;
}

// Returns the per-category recurring-expense budget (pre-shift) for the given
// month. One-time expenses are included only when their startDate falls in
// the month. Untracked-in-budget expenses are filtered out.
async function getCategoryBudgets(
  ctx: AuthContext,
  year: number,
  month: number
): Promise<Record<string, { categoryId: string | null; icon: string | null; budget: number }>> {
  const [tracked, cats] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, ctx.userId),
          eq(expenses.isActive, true),
          eq(expenses.trackedInBudget, true)
        )
      ),
    db.select().from(expenseCategories).where(eq(expenseCategories.userId, ctx.userId)),
  ]);

  const catLookup: Record<string, { id: string; icon: string | null }> = {};
  for (const c of cats) catLookup[c.name] = { id: c.id, icon: c.icon };

  const result: Record<
    string,
    { categoryId: string | null; icon: string | null; budget: number }
  > = {};

  for (const e of tracked) {
    const amount = parseFloat(e.amount);
    const isOneTime = e.frequency.toLowerCase() === "one-time";
    let monthlyAmount = 0;
    if (isOneTime) {
      if (isOneTimeExpenseInMonth(e.startDate, year, month)) monthlyAmount = amount;
    } else {
      monthlyAmount = calculateMonthlyAmount(amount, e.frequency, e.customMonths);
    }
    if (monthlyAmount <= 0) continue;

    if (!result[e.category]) {
      const info = catLookup[e.category];
      result[e.category] = {
        categoryId: info?.id ?? null,
        icon: info?.icon ?? null,
        budget: 0,
      };
    }
    result[e.category].budget += monthlyAmount;
  }
  return result;
}

// One end-to-end read for the mobile/web budget view: summary numbers + the
// per-category breakdown with shift adjustments applied + actual spending
// pulled from daily_expenses. Mirrors the existing web behavior exactly so
// the action layer can delegate without observable change.
export async function getBudgetForMonth(
  ctx: AuthContext,
  year: number,
  month: number
): Promise<BudgetForMonth> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [categoryBudgets, adjustments, spendingRows] = await Promise.all([
    getCategoryBudgets(ctx, year, month),
    getAdjustments(ctx, year, month),
    db
      .select({
        categoryName: dailyExpenses.categoryName,
        totalSpent: sql<number>`sum(${dailyExpenses.amount})::numeric`,
      })
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.userId, ctx.userId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .groupBy(dailyExpenses.categoryName),
  ]);

  // Spending is only attributed to tracked categories; other category names
  // are surfaced as "no-budget but spent" entries with budget = max(0, shift).
  const trackedNames = new Set(Object.keys(categoryBudgets));
  const allCats = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, ctx.userId));
  const catLookup: Record<string, { id: string; icon: string | null }> = {};
  for (const c of allCats) catLookup[c.name] = { id: c.id, icon: c.icon };

  const spendingByCategory: Record<string, number> = {};
  for (const s of spendingRows) {
    spendingByCategory[s.categoryName] = Number(s.totalSpent) || 0;
  }

  const categories: CategoryBudgetRow[] = [];
  for (const [name, b] of Object.entries(categoryBudgets)) {
    const adjustment = adjustments[name] ?? 0;
    const monthlyBudget = b.budget + adjustment;
    const spent = trackedNames.has(name) ? (spendingByCategory[name] ?? 0) : 0;
    const remaining = monthlyBudget - spent;
    const percentUsed = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
    categories.push({
      categoryId: b.categoryId,
      categoryName: name,
      icon: b.icon,
      monthlyBudget,
      spent,
      remaining,
      percentUsed,
    });
  }

  // Categories that have spending but no recurring-expense budget — surface
  // them so the breakdown is not lying by omission.
  for (const [name, spent] of Object.entries(spendingByCategory)) {
    if (categories.find((c) => c.categoryName === name)) continue;
    const adjustment = Math.max(0, adjustments[name] ?? 0);
    const cat = catLookup[name];
    categories.push({
      categoryId: cat?.id ?? null,
      categoryName: name,
      icon: cat?.icon ?? null,
      monthlyBudget: adjustment,
      spent,
      remaining: adjustment - spent,
      percentUsed: adjustment > 0 ? (spent / adjustment) * 100 : 100,
    });
  }

  categories.sort((a, b) =>
    b.monthlyBudget !== a.monthlyBudget
      ? b.monthlyBudget - a.monthlyBudget
      : b.spent - a.spent
  );

  // Summary: totals derived from tracked categories only, matching the
  // existing web summary semantics.
  const totalBudget = Object.values(categoryBudgets).reduce(
    (acc, b) => acc + b.budget,
    0
  );
  const totalSpentFromTrackedCategories = Object.entries(spendingByCategory)
    .filter(([name]) => trackedNames.has(name))
    .reduce((acc, [, v]) => acc + v, 0);
  const remaining = totalBudget - totalSpentFromTrackedCategories;
  const percentUsed = totalBudget > 0 ? (totalSpentFromTrackedCategories / totalBudget) * 100 : 0;

  const daysInMonth = lastDay;
  const sgtDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const currentDay = parseInt(sgtDate.split("-")[2], 10);
  const daysLeftIncludingToday = Math.max(1, daysInMonth - currentDay + 1);
  const dailyBudget = remaining > 0 ? remaining / daysLeftIncludingToday : 0;
  const expectedSpentByToday = (totalBudget / daysInMonth) * currentDay;
  let pacingStatus: "under" | "on-track" | "over" = "on-track";
  if (totalSpentFromTrackedCategories < expectedSpentByToday * 0.9) pacingStatus = "under";
  else if (totalSpentFromTrackedCategories > expectedSpentByToday * 1.1) pacingStatus = "over";

  return {
    year,
    month,
    summary: {
      totalBudget,
      totalSpent: totalSpentFromTrackedCategories,
      remaining,
      percentUsed,
      dailyBudget,
      expectedSpentByToday,
      pacingStatus,
      daysInMonth,
      currentDay,
    },
    categories,
  };
}
