"use client"

import { useMemo } from "react"
import { CalendarDays, PieChart, Receipt, Tags } from "lucide-react"

import { formatBudgetCurrency } from "@/lib/budget-utils"
import { calculateMonthlyAmount } from "@/lib/expense-calculator"
import { StatCard } from "@/components/ui/stat-card"

interface ExpenseRow {
  amount: string
  frequency: string
  customMonths: string | null
  category: string
  isActive: boolean | null
}

interface ExpenseStatBandProps {
  expenses: ExpenseRow[]
  /** Click handler for the "Expected expenses" card (opens the breakdown modal). */
  onExpectedClick?: () => void
  /** Click handler for the "Top category" card (opens the top-category modal). */
  onTopCategoryClick?: () => void
}

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "")
  return Number.isFinite(n) ? n : 0
}

/**
 * The 4-up stat band for the Expenses tab — same frame as the other tabs.
 * Monthly figures use calculateMonthlyAmount so they match the household
 * summary and the budget surfaces exactly.
 */
export function ExpenseStatBand({
  expenses,
  onExpectedClick,
  onTopCategoryClick
}: ExpenseStatBandProps) {
  const stats = useMemo(() => {
    const active = expenses.filter((e) => e.isActive !== false)
    const byCategory = new Map<string, number>()
    let monthlyTotal = 0

    for (const e of active) {
      const monthly = calculateMonthlyAmount(
        toNum(e.amount),
        e.frequency,
        e.customMonths
      )
      monthlyTotal += monthly
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + monthly)
    }

    let top: { name: string; amount: number } | null = null
    for (const [name, amount] of byCategory) {
      if (!top || amount > top.amount) top = { name, amount }
    }

    return {
      monthlyTotal,
      top,
      avgPerDay: (monthlyTotal * 12) / 365,
      categoryCount: byCategory.size
    }
  }, [expenses])

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Expected expenses"
        value={formatBudgetCurrency(stats.monthlyTotal)}
        icon={Receipt}
        accent="brand"
        delta="/mo"
        data-tour="expected-expenses-card"
        onClick={onExpectedClick}
        className={onExpectedClick ? "cursor-pointer" : undefined}
      />
      <StatCard
        label="Top category"
        value={stats.top ? formatBudgetCurrency(stats.top.amount) : "—"}
        icon={PieChart}
        accent="jungle"
        delta={stats.top?.name ?? "No expenses yet"}
        onClick={onTopCategoryClick}
        className={onTopCategoryClick ? "cursor-pointer" : undefined}
      />
      <StatCard
        label="Avg / day"
        value={formatBudgetCurrency(stats.avgPerDay)}
        icon={CalendarDays}
        accent="teal"
        delta="based on monthly total"
      />
      <StatCard
        label="Categories"
        value={String(stats.categoryCount)}
        icon={Tags}
        accent="gold"
        delta="in use"
      />
    </div>
  )
}
