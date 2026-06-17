import { auth } from "@clerk/nextjs/server"

import { getBudgetVsActual } from "@/lib/actions/budget-calculator"
import { getCurrentHoldings } from "@/lib/actions/current-holdings"
import { getExpenses } from "@/lib/actions/expenses"
import { getIncomesBeta } from "@/lib/actions/incomes-beta"
import { getInvestments } from "@/lib/actions/investments"
import { getDashboardMetrics } from "@/lib/actions/user"

import { DashboardClient } from "./client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  // Get current month for budget data
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch user-specific metrics and data with data isolation
  const [metrics, incomes, expenses, holdings, investments, budgetData] =
    await Promise.all([
      getDashboardMetrics(),
      getIncomesBeta(),
      getExpenses(),
      getCurrentHoldings(),
      getInvestments(),
      getBudgetVsActual(currentYear, currentMonth)
    ])

  return (
    <DashboardClient
      metrics={metrics}
      incomes={incomes}
      expenses={expenses}
      holdings={holdings}
      investments={investments}
      budgetData={budgetData}
    />
  )
}
