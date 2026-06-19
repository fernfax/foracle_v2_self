import type { ReactNode } from "react"

import {
  loadAchievedGoals,
  loadActiveGoals
} from "@/lib/page-data/goals-page-data"
import { PageHeader } from "@/components/layout/layout-page-header"
import { GoalsTabBar } from "@/app/(app)/goals/goals-tab-bar"

export const metadata = {
  title: "Goals | Foracle",
  description: "Set and track your financial goals"
}

/**
 * Shared chrome for the Goals tabs. Fetches both goal sets to populate the tab
 * badge counts; `cache()` ensures the child route's own fetch reuses the same
 * `getGoals()` call.
 */
export default async function GoalsLayout({
  children
}: {
  children: ReactNode
}) {
  const [active, achieved] = await Promise.all([
    loadActiveGoals(),
    loadAchievedGoals()
  ])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Goals"
        tabs={
          <GoalsTabBar
            activeCount={active.length}
            achievedCount={achieved.length}
          />
        }
      />
      {children}
    </div>
  )
}
