"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMonthName,
  getPreviousMonth,
  getNextMonth,
  isCurrentMonth,
} from "@/lib/budget-utils";

interface MonthNavigatorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthNavigator({
  year,
  month,
  onMonthChange,
}: MonthNavigatorProps) {
  const handlePrevious = () => {
    const prev = getPreviousMonth(year, month);
    onMonthChange(prev.year, prev.month);
  };

  const handleNext = () => {
    const next = getNextMonth(year, month);
    if (next) {
      onMonthChange(next.year, next.month);
    }
  };

  const canGoNext = !isCurrentMonth(year, month);

  // Fixed-width pill mirroring the Sankey month switcher: standardised width
  // (independent of the label), breathing room on the arrows, calendar icon.
  return (
    <div className="flex items-center justify-between rounded-full bg-muted px-1 py-1 w-[200px]">
      <button
        type="button"
        onClick={handlePrevious}
        aria-label="Previous month"
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium tabular-nums">
          {getMonthName(month, "long")} {year}
        </span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next month"
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
