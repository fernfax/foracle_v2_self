import {
  loadExpenses,
  loadHoldings,
  loadIncomes,
  loadInvestments
} from "@/lib/user-page-data"
import { ExpensesClient } from "@/app/(app)/expenses/client"

export default async function ExpensesTab() {
  const [expenses, incomes, holdings, investments] = await Promise.all([
    loadExpenses(),
    loadIncomes(),
    loadHoldings(),
    loadInvestments()
  ])

  return (
    <ExpensesClient
      embedded
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialHoldings={holdings}
      initialInvestments={investments}
    />
  )
}
