// Single source of truth for "is this expense category spending or saving?".
//
// Some expense rows are money SET ASIDE (savings / investments / retirement
// contributions) rather than consumption. Treated as savings, not spending:
// both the cashflow Sankey and the balance projection exclude them from the
// "Expenses" total and let them flow into Savings / Net Balance instead. This
// keeps the two graphs' numbers tallying for the same month.

export const NON_SPENDING_CATEGORIES = new Set([
  "savings",
  "investment",
  "investments",
  "retirement"
])

/** True when the category counts as day-to-day spending (an expense). False for
 *  savings/investment/retirement categories (those count toward savings). */
export function isSpendingCategory(
  category: string | null | undefined
): boolean {
  if (!category) return true // uncategorised → treat as spending
  return !NON_SPENDING_CATEGORIES.has(category.trim().toLowerCase())
}
