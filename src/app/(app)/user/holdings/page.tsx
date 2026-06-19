import {
  loadHoldings,
  loadNetWorthSummary
} from "@/lib/page-data/user-page-data"
import { NetWorthView } from "@/components/net-worth/net-worth-view"

export default async function HoldingsTab() {
  const [summary, holdings] = await Promise.all([
    loadNetWorthSummary(),
    loadHoldings()
  ])

  return <NetWorthView summary={summary} initialHoldings={holdings} />
}
