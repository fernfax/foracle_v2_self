import { loadAchievedGoals } from "@/lib/goals-page-data"
import { GoalList } from "@/components/goals/goal-list"

export default async function AchievedGoalsTab() {
  const goals = await loadAchievedGoals()
  return <GoalList initialGoals={goals} isAchievedView />
}
