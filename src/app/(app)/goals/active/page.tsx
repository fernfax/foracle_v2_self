import { loadActiveGoals } from "@/lib/page-data/goals-page-data"
import { GoalList } from "@/components/goals/goal-list"

export default async function ActiveGoalsTab() {
  const goals = await loadActiveGoals()
  return <GoalList initialGoals={goals} showAddButton />
}
