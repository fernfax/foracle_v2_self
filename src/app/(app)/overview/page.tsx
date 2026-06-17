import { getBudgetVsActual } from "@/actions/budget-calculator"
import { getCurrentHoldings } from "@/actions/current-holdings"
import { getExpenses } from "@/actions/expenses"
import { getIncomes } from "@/actions/incomes"
import { getInvestments } from "@/actions/investments"
import { getDashboardMetrics } from "@/actions/user"
import { auth } from "@clerk/nextjs/server"

import { DashboardClient } from "@/app/(app)/overview/client"

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
      getIncomes(),
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
