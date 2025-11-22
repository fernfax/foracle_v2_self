import { getExpenses } from "@/lib/actions/expenses";
import { getIncomes } from "@/lib/actions/income";
import { getCurrentHoldings } from "@/lib/actions/current-holdings";
import { ExpensesClient } from "./client";

export const metadata = {
  title: "Expenses | Foracle",
  description: "Track and manage your expenses",
};

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  const incomes = await getIncomes();
  const holdings = await getCurrentHoldings();

  return <ExpensesClient initialExpenses={expenses} initialIncomes={incomes} initialHoldings={holdings} />;
}
