"use client"

import type { BudgetVsActual } from "@/actions/budget-calculator"
import { Wallet } from "lucide-react"

import { formatBudgetCurrency, getMonthName } from "@/lib/budget-utils"
import { categoryColor } from "@/lib/portfolio-colors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { Toolbar } from "@/components/ui/toolbar"
import { ProgressBar } from "@/components/portfolio/progress"

interface BudgetBreakdownProps {
  budgetData: BudgetVsActual[]
  year: number
  month: number
  /** Opens the existing Manage Categories modal (ghost "Adjust limits"). */
  onAdjustLimits: () => void
  /** Opens the existing add flow (primary "Add category"). */
  onAddCategory: () => void
  /** Desktop read-only mode: hides the toolbar buttons. */
  readOnly?: boolean
}

/**
 * Budget vs actual — the prominent breakdown section for the Budget page.
 *
 * `monthlyBudget` (derived from recurring expenses by the existing query) IS the
 * per-category limit: pct / thresholds are DERIVED from `spent` vs `monthlyBudget`
 * in the UI only. No schema change, no new limit store. Categories with a limit of
 * zero are shown as "No limit" (neutral) rather than dividing by zero.
 */
export function BudgetBreakdown({
  budgetData,
  year,
  month,
  onAdjustLimits,
  onAddCategory,
  readOnly = false
}: BudgetBreakdownProps) {
  // Mirror CategoryGrid: only categories with a plan or actual spend.
  const rows = budgetData.filter((b) => b.monthlyBudget > 0 || b.spent > 0)

  return (
    <div className="space-y-3">
      {readOnly ? null : (
        <Toolbar
          filters={
            <span className="text-muted-foreground text-sm">
              Monthly budget · {getMonthName(month)} {year}
            </span>
          }
          primaryAction={{ label: "Add category", onClick: onAddCategory }}>
          <Button variant="ghost" size="sm" onClick={onAdjustLimits}>
            Adjust limits
          </Button>
        </Toolbar>
      )}

      <SectionCard icon={Wallet} title="Budget vs actual" noBodyPadding>
        {rows.length === 0 ? (
          <div className="text-muted-foreground px-5 py-10 text-center text-sm">
            <p className="text-foreground font-medium">
              No budget categories yet.
            </p>
            <p className="mt-1">
              Add recurring expenses to see your budget breakdown.
            </p>
          </div>
        ) : (
          rows.map((row) => {
            const { categoryName, monthlyBudget, spent } = row
            const hasLimit = monthlyBudget > 0
            const pct = hasLimit
              ? Math.round((spent / monthlyBudget) * 100)
              : null

            const barColor =
              pct === null
                ? undefined // neutral track only — no fill seed
                : pct > 100
                  ? "#E05555"
                  : pct > 85
                    ? "#D4A843"
                    : categoryColor(categoryName)

            const badgeVariant =
              pct === null
                ? "neutral"
                : pct > 100
                  ? "danger"
                  : pct > 85
                    ? "warning"
                    : "success"

            return (
              <div
                key={`${row.categoryId ?? "uncat"}-${categoryName}`}
                className="border-border/40 grid grid-cols-[minmax(140px,1fr)_2fr_auto_auto] items-center gap-4 border-b px-5 py-3.5 last:border-0">
                {/* 1. Category: color dot + name */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    style={{ backgroundColor: categoryColor(categoryName) }}
                    className="inline-block size-2.5 shrink-0 rounded-full"
                  />
                  <span className="truncate text-sm font-medium">
                    {categoryName}
                  </span>
                </div>

                {/* 2. Progress — full muted bar when there's no limit */}
                <ProgressBar
                  value={pct === null ? 100 : Math.min(pct, 100)}
                  color={barColor}
                />

                {/* 3. Spent of budget */}
                <div className="text-right text-sm whitespace-nowrap tabular-nums">
                  <span className="text-foreground font-semibold">
                    {formatBudgetCurrency(spent)}
                  </span>
                  {hasLimit && (
                    <span className="text-muted-foreground">
                      {" "}
                      of {formatBudgetCurrency(monthlyBudget)}
                    </span>
                  )}
                </div>

                {/* 4. Percentage / No-limit badge */}
                <Badge
                  variant={badgeVariant}
                  className="justify-self-end tabular-nums">
                  {pct === null ? "No limit" : `${pct}%`}
                </Badge>
              </div>
            )
          })
        )}
      </SectionCard>
    </div>
  )
}
