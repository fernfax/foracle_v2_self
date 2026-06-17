import { getGoals } from "@/actions/goals"

import { GoalsClient } from "@/app/(app)/goals/client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Goals | Foracle",
  description: "Set and track your financial goals"
}

export default async function GoalsPage() {
  const goals = await getGoals()

  return <GoalsClient initialGoals={goals} />
}
