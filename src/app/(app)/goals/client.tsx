"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Target, Trophy } from "lucide-react"

import { PageHeader } from "@/components/ui/page-header"
import { SlidingTabs } from "@/components/ui/sliding-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { GoalList } from "@/components/goals/goal-list"

interface Goal {
  id: string
  userId: string
  linkedExpenseId: string | null
  goalName: string
  goalType: string
  targetAmount: string
  targetDate: string
  currentAmountSaved: string | null
  monthlyContribution: string | null
  description: string | null
  isAchieved: boolean | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface GoalsClientProps {
  initialGoals: Goal[]
}

// Hydration flag without a set-state effect: server + first client render get
// the server snapshot (false); once hydrated React swaps to the client snapshot
// (true). No extra committed render driven from an effect.
const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function GoalsClient({ initialGoals }: GoalsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mounted = useHydrated()
  const tabFromUrl = searchParams.get("tab") || "active"
  // activeTab is optimistic (set on tap so the tab switches instantly), then
  // resynced to the URL when navigation commits or on back/forward. Syncing
  // during render via the previous-value pattern avoids a set-state-in-effect.
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [prevTabFromUrl, setPrevTabFromUrl] = useState(tabFromUrl)
  if (prevTabFromUrl !== tabFromUrl) {
    setPrevTabFromUrl(tabFromUrl)
    setActiveTab(tabFromUrl)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/goals?tab=${value}`, { scroll: false })
  }

  // Filter goals by status
  const activeGoals = initialGoals.filter(
    (goal) => goal.isActive !== false && goal.isAchieved !== true
  )
  const achievedGoals = initialGoals.filter((goal) => goal.isAchieved === true)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Goals"
        tabs={
          mounted ? (
            <SlidingTabs
              tabs={[
                {
                  value: "active",
                  label: "Active Goals",
                  icon: Target,
                  badge: activeGoals.length
                },
                {
                  value: "achieved",
                  label: "Achieved",
                  icon: Trophy,
                  badge: achievedGoals.length,
                  badgeVariant: "success"
                }
              ]}
              value={activeTab}
              onValueChange={handleTabChange}
            />
          ) : null
        }
      />

      {!mounted ? (
        <div className="bg-muted h-[500px] animate-pulse rounded-lg" />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full">
          <TabsContent value="active" className="mt-4">
            <GoalList initialGoals={activeGoals} showAddButton />
          </TabsContent>

          <TabsContent value="achieved" className="mt-4">
            <GoalList initialGoals={achievedGoals} isAchievedView />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
