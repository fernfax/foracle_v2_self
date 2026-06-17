import { redirect } from "next/navigation"
import {
  getBudgetSummary,
  getBudgetVsActual
} from "@/actions/budget-calculator"
import { getBudgetShiftsForMonth } from "@/actions/budget-shifts"
import {
  getDailyExpensesForMonth,
  getTodaySpending
} from "@/actions/daily-expenses"
import {
  getAllExpensesGroupedByCategory,
  getExpenseCategories
} from "@/actions/expense-categories"
import { auth } from "@clerk/nextjs/server"

import { BudgetClient } from "@/app/(app)/budget/client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Budget Tracker | Foracle",
  description: "Track your daily expenses and manage your budget"
}

export default async function BudgetPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const [
    categories,
    budgetData,
    dailyExpenses,
    budgetSummary,
    todaySpent,
    expensesByCategory,
    budgetShifts
  ] = await Promise.all([
    getExpenseCategories(),
    getBudgetVsActual(year, month),
    getDailyExpensesForMonth(year, month),
    getBudgetSummary(year, month),
    getTodaySpending(),
    getAllExpensesGroupedByCategory(year, month),
    getBudgetShiftsForMonth(year, month)
  ])

  return (
    <BudgetClient
      initialCategories={categories}
      initialBudgetData={budgetData}
      initialDailyExpenses={dailyExpenses}
      initialExpensesByCategory={expensesByCategory}
      initialBudgetSummary={budgetSummary}
      initialTodaySpent={todaySpent}
      initialBudgetShifts={budgetShifts}
      initialYear={year}
      initialMonth={month}
    />
  )
}
