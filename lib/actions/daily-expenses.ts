"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { dailyExpenses, expenseCategories } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

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
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Calculate start and end dates for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const expenses = await db
      .select()
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.userId, userId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .orderBy(desc(dailyExpenses.date), desc(dailyExpenses.createdAt));

    return expenses;
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
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const expenses = await db
      .select()
      .from(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.userId, userId),
          gte(dailyExpenses.date, startDate),
          lte(dailyExpenses.date, endDate)
        )
      )
      .orderBy(desc(dailyExpenses.date), desc(dailyExpenses.createdAt));

    return expenses;
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
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newExpense] = await db
    .insert(dailyExpenses)
    .values({
      id,
      userId,
      categoryId: data.categoryId || null,
      categoryName: data.categoryName,
      subcategoryId: data.subcategoryId || null,
      subcategoryName: data.subcategoryName || null,
      amount: data.amount.toString(),
      note: data.note || null,
      date: data.date,
      originalCurrency: data.originalCurrency || null,
      originalAmount: data.originalAmount?.toString() || null,
      exchangeRate: data.exchangeRate?.toString() || null,
    })
    .returning();

  revalidatePath("/budget");

  return newExpense;
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
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.dailyExpenses.findFirst({
    where: and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)),
  });

  if (!existing) {
    throw new Error("Daily expense not found");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.categoryName !== undefined) updateData.categoryName = data.categoryName;
  if (data.subcategoryId !== undefined) updateData.subcategoryId = data.subcategoryId;
  if (data.subcategoryName !== undefined) updateData.subcategoryName = data.subcategoryName;
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.note !== undefined) updateData.note = data.note;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.originalCurrency !== undefined) updateData.originalCurrency = data.originalCurrency;
  if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount?.toString() || null;
  if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate?.toString() || null;

  const [updatedExpense] = await db
    .update(dailyExpenses)
    .set(updateData)
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)))
    .returning();

  revalidatePath("/budget");

  return updatedExpense;
}

/**
 * Delete a daily expense
 */
export async function deleteDailyExpense(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.dailyExpenses.findFirst({
    where: and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)),
  });

  if (!existing) {
    throw new Error("Daily expense not found");
  }

  await db
    .delete(dailyExpenses)
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)));

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
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

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
          eq(dailyExpenses.userId, userId),
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
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get today's date in Singapore Time (UTC+8)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });

    const result = await db
      .select({
        total: sql<number>`sum(${dailyExpenses.amount})::numeric`,
      })
      .from(dailyExpenses)
      .where(
        and(eq(dailyExpenses.userId, userId), eq(dailyExpenses.date, today))
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
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

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
          eq(dailyExpenses.userId, userId),
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
