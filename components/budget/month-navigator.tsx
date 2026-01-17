"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateRange,
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

  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handlePrevious}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="text-center">
        <div className="font-medium">{formatDateRange(year, month)}</div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleNext}
        disabled={!canGoNext}
      >
        <ChevronRight className={`h-5 w-5 ${!canGoNext ? "opacity-30" : ""}`} />
      </Button>
    </div>
  );
}
