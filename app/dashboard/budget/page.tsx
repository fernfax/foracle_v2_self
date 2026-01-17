import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getExpenseCategories } from "@/lib/actions/expense-categories";
import { getBudgetVsActual, getBudgetSummary } from "@/lib/actions/budget-calculator";
import { getDailyExpensesForMonth, getTodaySpending } from "@/lib/actions/daily-expenses";
import { BudgetClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Budget Tracker | Foracle",
  description: "Track your daily expenses and manage your budget",
};

export default async function BudgetPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const [categories, budgetData, dailyExpenses, budgetSummary, todaySpent] =
    await Promise.all([
      getExpenseCategories(),
      getBudgetVsActual(year, month),
      getDailyExpensesForMonth(year, month),
      getBudgetSummary(year, month),
      getTodaySpending(),
    ]);

  return (
    <BudgetClient
      initialCategories={categories}
      initialBudgetData={budgetData}
      initialDailyExpenses={dailyExpenses}
      initialBudgetSummary={budgetSummary}
      initialTodaySpent={todaySpent}
      initialYear={year}
      initialMonth={month}
    />
  );
}
