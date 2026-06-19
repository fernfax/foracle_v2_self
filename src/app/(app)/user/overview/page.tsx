import {
  loadExpenses,
  loadHoldings,
  loadIncomes,
  loadInvestments
} from "@/lib/user-page-data"
import { CashflowSankey } from "@/components/dashboard/cashflow-sankey"

export default async function OverviewTab() {
  const [incomes, expenses, holdings, investments] = await Promise.all([
    loadIncomes(),
    loadExpenses(),
    loadHoldings(),
    loadInvestments()
  ])

  return (
    <CashflowSankey
      incomes={incomes}
      expenses={expenses}
      holdings={holdings}
      investments={investments}
    />
  )
}
