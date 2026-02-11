"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { budgetShifts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export interface BudgetShift {
  id: string;
  userId: string;
  year: number;
  month: number;
  fromCategoryName: string;
  toCategoryName: string;
  amount: string;
  note: string | null;
  createdAt: Date;
}

/**
 * Create a new budget shift between categories
 */
export async function createBudgetShift(data: {
  year: number;
  month: number;
  fromCategoryName: string;
  toCategoryName: string;
  amount: number;
  note?: string;
}): Promise<{ success: boolean; error?: string; shift?: BudgetShift }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate amount
    if (data.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    // Validate categories are different
    if (data.fromCategoryName === data.toCategoryName) {
      return { success: false, error: "Source and destination categories must be different" };
    }

    const id = randomUUID();
    const [shift] = await db
      .insert(budgetShifts)
      .values({
        id,
        userId,
        year: data.year,
        month: data.month,
        fromCategoryName: data.fromCategoryName,
        toCategoryName: data.toCategoryName,
        amount: data.amount.toFixed(2),
        note: data.note || null,
      })
      .returning();

    revalidatePath("/budget");

    return { success: true, shift: shift as BudgetShift };
  } catch (error) {
    console.error("Error creating budget shift:", error);
    return { success: false, error: "Failed to create budget shift" };
  }
}

/**
 * Get all budget shifts for a specific month
 */
export async function getBudgetShiftsForMonth(
  year: number,
  month: number
): Promise<BudgetShift[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return [];
    }

    const shifts = await db
      .select()
      .from(budgetShifts)
      .where(
        and(
          eq(budgetShifts.userId, userId),
          eq(budgetShifts.year, year),
          eq(budgetShifts.month, month)
        )
      )
      .orderBy(budgetShifts.createdAt);

    return shifts as BudgetShift[];
  } catch (error) {
    console.error("Error fetching budget shifts:", error);
    return [];
  }
}

/**
 * Delete a budget shift
 */
export async function deleteBudgetShift(
  shiftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .delete(budgetShifts)
      .where(
        and(
          eq(budgetShifts.id, shiftId),
          eq(budgetShifts.userId, userId)
        )
      );

    revalidatePath("/budget");

    return { success: true };
  } catch (error) {
    console.error("Error deleting budget shift:", error);
    return { success: false, error: "Failed to delete budget shift" };
  }
}

/**
 * Calculate the net budget adjustment for each category based on shifts
 * Returns a map of categoryName -> net adjustment (positive = increased, negative = decreased)
 */
export async function getBudgetAdjustmentsForMonth(
  year: number,
  month: number
): Promise<Record<string, number>> {
  try {
    const shifts = await getBudgetShiftsForMonth(year, month);

    const adjustments: Record<string, number> = {};

    for (const shift of shifts) {
      const amount = parseFloat(shift.amount);

      // Decrease source category budget
      if (!adjustments[shift.fromCategoryName]) {
        adjustments[shift.fromCategoryName] = 0;
      }
      adjustments[shift.fromCategoryName] -= amount;

      // Increase destination category budget
      if (!adjustments[shift.toCategoryName]) {
        adjustments[shift.toCategoryName] = 0;
      }
      adjustments[shift.toCategoryName] += amount;
    }

    return adjustments;
  } catch (error) {
    console.error("Error calculating budget adjustments:", error);
    return {};
  }
}

/**
 * Get the remaining budget that can be shifted from a category
 * This is: original budget + net adjustments - spent
 */
export async function getShiftableAmount(
  categoryName: string,
  year: number,
  month: number,
  originalBudget: number,
  spent: number
): Promise<number> {
  try {
    const adjustments = await getBudgetAdjustmentsForMonth(year, month);
    const adjustment = adjustments[categoryName] || 0;
    const adjustedBudget = originalBudget + adjustment;
    const remaining = adjustedBudget - spent;

    // Can only shift positive remaining amount
    return Math.max(0, remaining);
  } catch (error) {
    console.error("Error calculating shiftable amount:", error);
    return 0;
  }
}
