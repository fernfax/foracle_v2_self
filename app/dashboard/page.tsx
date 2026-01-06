import { auth } from "@clerk/nextjs/server";
import { getDashboardMetrics } from "@/lib/actions/user";
import { getIncomes } from "@/lib/actions/income";
import { getExpenses } from "@/lib/actions/expenses";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { DashboardClient } from "./client";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user-specific metrics and data with data isolation
  const [metrics, incomes, expenses, holdings] = await Promise.all([
    getDashboardMetrics(),
    getIncomes(),
    getExpenses(),
    getCurrentHoldings(),
  ]);

  return (
    <DashboardClient
      metrics={metrics}
      incomes={incomes}
      expenses={expenses}
      holdings={holdings}
    />
  );
}
