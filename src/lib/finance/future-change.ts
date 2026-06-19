// Pure logic for future income changes (milestones). Lives in lib/ (no React,
// no "use client") so it can be shared by both client components (timeline
// bars) and server/calculation code (balance-calculator, cashflow-sankey).

export interface FutureMilestone {
  id: string
  targetMonth: string // "YYYY-MM" — month the new amount takes effect
  amount: number // new ABSOLUTE monthly amount from targetMonth
  // endMonth: last "YYYY-MM" the change applies (inclusive). null/absent =
  // permanent (applies indefinitely, until a later permanent change). When set,
  // the change is TEMPORARY: after endMonth the income reverts to whatever was
  // in effect just before this change started.
  endMonth?: string | null
  reason?: string
  notes?: string
}

/**
 * Resolve an income's effective monthly amount at `monthKey` ("YYYY-MM") given
 * its base amount and future-change milestones.
 *
 * Semantics (latest-applicable-wins, revert-to-prior):
 *  - Permanent changes (no endMonth) form a baseline: walking months forward,
 *    each permanent change at/after its targetMonth replaces the baseline; the
 *    most recent one ≤ the month wins.
 *  - Temporary changes ([targetMonth, endMonth]) override the baseline only
 *    inside their window; the most recent active temporary one wins. Outside
 *    its window the amount is whatever the baseline (permanent changes) gives —
 *    i.e. it reverts to what was in effect before the temporary change.
 */
export function resolveEffectiveAmount(
  baseAmount: number,
  milestones: FutureMilestone[],
  monthKey: string
): number {
  const permanent = milestones
    .filter((m) => !m.endMonth && m.targetMonth <= monthKey)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  let baseline = baseAmount
  for (const m of permanent) baseline = m.amount

  const activeTemp = milestones
    .filter(
      (m) => !!m.endMonth && m.targetMonth <= monthKey && monthKey <= m.endMonth
    )
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  if (activeTemp.length > 0) return activeTemp[activeTemp.length - 1].amount

  return baseline
}

/**
 * Which milestone is "in effect" at `monthKey`, or null when the month is on
 * the income's base (no change applies). Mirrors resolveEffectiveAmount's
 * precedence: an active temporary change wins; else the latest permanent change
 * ≤ the month; else base (null). Used to tag each rendered bar segment with the
 * change it represents, so the popup can show that segment's own period and let
 * the user edit that specific change.
 */
export function activeMilestoneAt(
  milestones: FutureMilestone[],
  monthKey: string
): FutureMilestone | null {
  const activeTemp = milestones
    .filter(
      (m) => !!m.endMonth && m.targetMonth <= monthKey && monthKey <= m.endMonth
    )
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  if (activeTemp.length > 0) return activeTemp[activeTemp.length - 1]

  const permanent = milestones
    .filter((m) => !m.endMonth && m.targetMonth <= monthKey)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  if (permanent.length > 0) return permanent[permanent.length - 1]

  return null
}

/**
 * The "prior" effective amount a change starts from — the effective amount in
 * the month immediately before `milestone.targetMonth`, ignoring this milestone
 * itself. Used to classify a change as an increment or a decrement (for bar /
 * river coloring) and to know what a temporary change reverts to.
 */
export function priorEffectiveAmount(
  baseAmount: number,
  milestones: FutureMilestone[],
  milestone: FutureMilestone
): number {
  const others = milestones.filter((m) => m.id !== milestone.id)
  return resolveEffectiveAmount(
    baseAmount,
    others,
    prevMonthKey(milestone.targetMonth)
  )
}

// "YYYY-MM" → the previous month's "YYYY-MM" (string math, no Date parsing).
function prevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number)
  const d = new Date(y, m - 2, 1) // m is 1-based; m-2 = previous month index
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yy}-${mm}`
}
