"use server"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import { getBudgetForMonth } from "@/lib/services/budget"

export interface CategoryBudget {
  categoryId: string | null
  categoryName: string
  monthlyBudget: number
  icon: string | null
}

export interface BudgetVsActual {
  categoryName: string
  categoryId: string | null
  icon: string | null
  monthlyBudget: number
  spent: number
  remaining: number
  percentUsed: number
}

/**
 * Get budget vs actual per category for a specific month.
 */
export async function getBudgetVsActual(
  year: number,
  month: number
): Promise<BudgetVsActual[]> {
  try {
    const ctx = await getCurrentUserAndFamily()
    const { categories } = await getBudgetForMonth(ctx, year, month)
    return categories
  } catch (error) {
    console.error("Error calculating budget vs actual:", error)
    return []
  }
}

/**
 * Overall budget summary for a month.
 */
export async function getBudgetSummary(year: number, month: number) {
  try {
    const ctx = await getCurrentUserAndFamily()
    const { summary } = await getBudgetForMonth(ctx, year, month)
    return summary
  } catch (error) {
    console.error("Error calculating budget summary:", error)
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentUsed: 0,
      dailyBudget: 0,
      expectedSpentByToday: 0,
      pacingStatus: "on-track" as const,
      daysInMonth: 30,
      currentDay: 1
    }
  }
}
