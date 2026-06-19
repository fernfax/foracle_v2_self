import {
  loadHouseholdSummary,
  loadIncomes,
  loadVisibleFamilyMembers
} from "@/lib/page-data/user-page-data"
import { IncomeStatBand } from "@/components/income/income-stat-band"
import { TimelineView } from "@/components/income/timeline/timeline-view"

export default async function IncomesTab() {
  const [incomes, members, summary] = await Promise.all([
    loadIncomes(),
    loadVisibleFamilyMembers(),
    loadHouseholdSummary()
  ])

  return (
    <div className="space-y-4">
      <IncomeStatBand
        grossIncome={summary.grossIncome}
        netIncome={summary.netIncome}
        incomes={incomes}
      />
      <TimelineView incomes={incomes} familyMembers={members} />
    </div>
  )
}
