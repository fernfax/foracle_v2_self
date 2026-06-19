import { cache } from "react"
import { getGoals } from "@/actions/goals"

/**
 * Per-request data loaders for the /goals/* tab routes. `cache()` dedups within
 * a single render, so the layout (which needs both counts for the tab badges)
 * and the active/achieved pages share one `getGoals()` call.
 */
export const loadGoals = cache(getGoals)

export const loadActiveGoals = cache(async () =>
  (await loadGoals()).filter(
    (goal) => goal.isActive !== false && goal.isAchieved !== true
  )
)

export const loadAchievedGoals = cache(async () =>
  (await loadGoals()).filter((goal) => goal.isAchieved === true)
)
