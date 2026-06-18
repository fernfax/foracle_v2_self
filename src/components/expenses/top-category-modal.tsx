"use client"

import { TrendingDown } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface TopCategory {
  name: string
  amount: number
  percentage: number
}

interface CategorySlice {
  category: string
  amount: number
  percentage: number
  color: string
}

interface TopCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topCategory: TopCategory | null
  topCategories: CategorySlice[]
  monthLabel: string
}

/**
 * Detail modal for the "Top Category" stat card — the household's largest
 * spending category for the month plus a ranked Top-5 bar list. Opened by
 * clicking the Top Category card in the expense stat band.
 */
export function TopCategoryModal({
  open,
  onOpenChange,
  topCategory,
  topCategories,
  monthLabel
}: TopCategoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-display text-base font-semibold tracking-tight">
                Top Category ({monthLabel})
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Your largest spending categories this month.
              </DialogDescription>
            </div>
            <span className="text-on-danger inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(224,85,85,0.12)] dark:text-[#E07070]">
              <TrendingDown className="size-5" />
            </span>
          </div>
        </DialogHeader>

        {topCategory ? (
          <div>
            <div className="font-display text-data-lg font-semibold tracking-tight tabular-nums">
              {topCategory.name}
            </div>
            <p className="text-muted-foreground mt-1 text-sm tabular-nums">
              ${topCategory.amount.toLocaleString()} (
              {topCategory.percentage.toFixed(1)}%)
            </p>

            {topCategories.length > 1 && (
              <div className="border-border/40 mt-5 border-t pt-4">
                <p className="text-label-caps text-muted-foreground mb-3 uppercase">
                  Top 5 Categories
                </p>
                <div className="space-y-3">
                  {topCategories.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate font-medium">
                            {cat.category}
                          </span>
                        </span>
                        <span className="text-muted-foreground ml-2 shrink-0 tabular-nums">
                          ${cat.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No expenses this month.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
