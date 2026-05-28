"use server";

import { db } from "@/db";
import { dailyExpenses } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createDailyExpense as createDailyExpenseService,
  deleteDailyExpense as deleteDailyExpenseService,
  listDailyExpenses,
  updateDailyExpense as updateDailyExpenseService,
} from "@/lib/services/daily-expenses";

export type DailyExpense = {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  amount: string; // SGD amount (converted if foreign currency)
  note: string | null;
  date: string;
  originalCurrency: string | null; // Currency code if not SGD
  originalAmount: string | null; // Amount in original currency
  exchangeRate: string | null; // Rate used for conversion
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get daily expenses for a specific month
 */
export async function getDailyExpensesForMonth(
  year: number,
  month: number
): Promise<DailyExpense[]> {
  try {
    const ctx = await getCurrentUserAndFamily();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return await listDailyExpenses(ctx, { startDate, endDate });
  } catch (error) {
    console.error("Error fetching daily expenses:", error);
    return [];
  }
}

/**
 * Get daily expenses for a date range
 */
export async function getDailyExpenses(
  startDate: string,
  endDate: string
): Promise<DailyExpense[]> {
  try {
    const ctx = await getCurrentUserAndFamily();
    return await listDailyExpenses(ctx, { startDate, endDate });
  } catch (error) {
    console.error("Error fetching daily expenses:", error);
    return [];
  }
}

/**
 * Add a new daily expense
 */
export async function addDailyExpense(data: {
  categoryId?: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  amount: number; // SGD amount (already converted if foreign currency)
  note?: string;
  date: string;
  originalCurrency?: string; // Currency code if not SGD
  originalAmount?: number; // Amount in original currency
  exchangeRate?: number; // Rate used for conversion
}): Promise<DailyExpense> {
  const ctx = await getCurrentUserAndFamily();
  const result = await createDailyExpenseService(ctx, {
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    subcategoryId: data.subcategoryId,
    subcategoryName: data.subcategoryName,
    amount: data.amount.toString(),
    note: data.note,
    date: data.date,
    originalCurrency: data.originalCurrency,
    originalAmount: data.originalAmount?.toString(),
    exchangeRate: data.exchangeRate?.toString(),
  });

  revalidatePath("/budget");
  return result.row;
}

/**
 * Update an existing daily expense
 */
export async function updateDailyExpense(
  id: string,
  data: {
    categoryId?: string;
    categoryName?: string;
    subcategoryId?: string | null;
    subcategoryName?: string | null;
    amount?: number; // SGD amount
    note?: string | null;
    date?: string;
    originalCurrency?: string | null;
    originalAmount?: number | null;
    exchangeRate?: number | null;
  }
): Promise<DailyExpense> {
  const ctx = await getCurrentUserAndFamily();
  const patch: Parameters<typeof updateDailyExpenseService>[2] = {};
  if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
  if (data.categoryName !== undefined) patch.categoryName = data.categoryName;
  if (data.subcategoryId !== undefined) patch.subcategoryId = data.subcategoryId;
  if (data.subcategoryName !== undefined) patch.subcategoryName = data.subcategoryName;
  if (data.amount !== undefined) patch.amount = data.amount.toString();
  if (data.note !== undefined) patch.note = data.note;
  if (data.date !== undefined) patch.date = data.date;
  if (data.originalCurrency !== undefined) patch.originalCurrency = data.originalCurrency;
  if (data.originalAmount !== undefined)
    patch.originalAmount = data.originalAmount === null ? null : data.originalAmount.toString();
  if (data.exchangeRate !== undefined)
    patch.exchangeRate = data.exchangeRate === null ? null : data.exchangeRate.toString();

  const row = await updateDailyExpenseService(ctx, id, patch);
  revalidatePath("/budget");
  return row;
}

/**
 * Delete a daily expense
 */
export async function deleteDailyExpense(id: string): Promise<void> {
  const ctx = await getCurrentUserAndFamily();
  await deleteDailyExpenseService(ctx, id);
  revalidatePath("/budget");
}

/**
 * Get aggregated spending by category for a month
 */
export async function getCategorySpendingForMonth(
  year: number,
  month: number
): Promise<
  {
    categoryName: string;
    categoryId: string | null;
    totalSpent: number;
    count: number;
  }[]
> {
  try {
    const { familyId } = await getCurrentUserAndFamily();

    // Calculate start and end dates for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const result = await db
      .select({
        categoryName: dailyExpenses.categoryName,
        categoryId: dailyExpenses.categoryId,
        totalSpent: sql<number>`sum(${dailyExpenses.amount})::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.familyId, familyId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .groupBy(dailyExpenses.categoryName, dailyExpenses.categoryId);

    return result.map((r) => ({
      categoryName: r.categoryName,
      categoryId: r.categoryId,
      totalSpent: Number(r.totalSpent) || 0,
      count: r.count,
    }));
  } catch (error) {
    console.error("Error fetching category spending:", error);
    return [];
  }
}

/**
 * Get spending for today (based on Singapore Time, resets at 0000hrs SGT)
 */
export async function getTodaySpending(): Promise<number> {
  try {
    const { familyId } = await getCurrentUserAndFamily();

    // Get today's date in Singapore Time (UTC+8)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });

    const result = await db
      .select({
        total: sql<number>`sum(${dailyExpenses.amount})::numeric`,
      })
      .from(dailyExpenses)
      .where(
        and(eq(dailyExpenses.familyId, familyId), eq(dailyExpenses.date, today))
      );

    return Number(result[0]?.total) || 0;
  } catch (error) {
    console.error("Error fetching today spending:", error);
    return 0;
  }
}

/**
 * Get spending aggregated by day for a month (for charts)
 */
export async function getDailySpendingByDay(
  year: number,
  month: number
): Promise<{ day: number; date: string; amount: number }[]> {
  try {
    const { familyId } = await getCurrentUserAndFamily();

    // Calculate start and end dates for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const result = await db
      .select({
        date: dailyExpenses.date,
        totalAmount: sql<number>`sum(${dailyExpenses.amount})::numeric`,
      })
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.familyId, familyId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .groupBy(dailyExpenses.date)
      .orderBy(dailyExpenses.date);

    return result.map((r) => ({
      day: parseInt(r.date.split("-")[2], 10),
      date: r.date,
      amount: Number(r.totalAmount) || 0,
    }));
  } catch (error) {
    console.error("Error fetching daily spending by day:", error);
    return [];
  }
}
