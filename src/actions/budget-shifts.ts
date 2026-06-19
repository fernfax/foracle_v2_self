"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { and, eq } from "drizzle-orm"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import { budgetShifts } from "@/db/schema"

export interface BudgetShift {
  id: string
  userId: string
  year: number
  month: number
  fromCategoryName: string
  toCategoryName: string
  amount: string
  note: string | null
  createdAt: Date
}

/**
 * Create a new budget shift between categories
 */
export async function createBudgetShift(data: {
  year: number
  month: number
  fromCategoryName: string
  toCategoryName: string
  amount: number
  note?: string
}): Promise<{ success: boolean; error?: string; shift?: BudgetShift }> {
  try {
    const { userId, familyId } = await getCurrentUserAndFamily()

    // Validate amount
    if (data.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" }
    }

    // Validate categories are different
    if (data.fromCategoryName === data.toCategoryName) {
      return {
        success: false,
        error: "Source and destination categories must be different"
      }
    }

    const id = randomUUID()
    const [shift] = await db
      .insert(budgetShifts)
      .values({
        id,
        userId,
        familyId,
        year: data.year,
        month: data.month,
        fromCategoryName: data.fromCategoryName,
        toCategoryName: data.toCategoryName,
        amount: data.amount.toFixed(2),
        note: data.note || null
      })
      .returning()

    revalidatePath("/budget")

    return { success: true, shift: shift as BudgetShift }
  } catch (error) {
    console.error("Error creating budget shift:", error)
    return { success: false, error: "Failed to create budget shift" }
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
    const { familyId } = await getCurrentUserAndFamily()

    const shifts = await db
      .select()
      .from(budgetShifts)
      .where(
        and(
          eq(budgetShifts.familyId, familyId),
          eq(budgetShifts.year, year),
          eq(budgetShifts.month, month)
        )
      )
      .orderBy(budgetShifts.createdAt)

    return shifts as BudgetShift[]
  } catch (error) {
    console.error("Error fetching budget shifts:", error)
    return []
  }
}

/**
 * Delete a budget shift
 */
export async function deleteBudgetShift(
  shiftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { familyId } = await getCurrentUserAndFamily()

    await db
      .delete(budgetShifts)
      .where(
        and(eq(budgetShifts.id, shiftId), eq(budgetShifts.familyId, familyId))
      )

    revalidatePath("/budget")

    return { success: true }
  } catch (error) {
    console.error("Error deleting budget shift:", error)
    return { success: false, error: "Failed to delete budget shift" }
  }
}
