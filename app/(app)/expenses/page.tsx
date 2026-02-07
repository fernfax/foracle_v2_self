import { getExpenses } from "@/lib/actions/expenses";
import { getIncomes } from "@/lib/actions/income";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { getInvestments } from "@/lib/actions/investments";
import { ExpensesClient } from "./client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Expenses | Foracle",
  description: "Track and manage your expenses",
};

export default async function ExpensesPage() {
  const [expenses, incomes, holdings, investments] = await Promise.all([
    getExpenses(),
    getIncomes(),
    getCurrentHoldings(),
    getInvestments(),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialHoldings={holdings}
      initialInvestments={investments}
    />
  );
}
