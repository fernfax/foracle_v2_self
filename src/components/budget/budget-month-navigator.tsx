"use client"

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import {
  getMonthName,
  getNextMonth,
  getPreviousMonth,
  isCurrentMonth
} from "@/lib/finance/budget-utils"

interface MonthNavigatorProps {
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
}

export function MonthNavigator({
  year,
  month,
  onMonthChange
}: MonthNavigatorProps) {
  const handlePrevious = () => {
    const prev = getPreviousMonth(year, month)
    onMonthChange(prev.year, prev.month)
  }

  const handleNext = () => {
    const next = getNextMonth(year, month)
    if (next) {
      onMonthChange(next.year, next.month)
    }
  }

  const canGoNext = !isCurrentMonth(year, month)

  // Fixed-width pill mirroring the Sankey month switcher: standardised width
  // (independent of the label), breathing room on the arrows, calendar icon.
  return (
    <div className="bg-muted flex w-[200px] items-center justify-between rounded-full px-1 py-1">
      <button
        type="button"
        onClick={handlePrevious}
        aria-label="Previous month"
        className="text-muted-foreground hover:bg-foreground/[0.06] rounded-full p-1.5 transition-colors">
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2">
        <CalendarDays className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium tabular-nums">
          {getMonthName(month, "long")} {year}
        </span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next month"
        className="text-muted-foreground hover:bg-foreground/[0.06] rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
