"use client";

import { Card } from "@/components/ui/card";
import { formatBudgetCurrency, getMonthName } from "@/lib/budget-utils";
import { AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpendingPaceIndicatorProps {
  totalSpent: number;
  expectedSpent: number;
  pacingStatus: "under" | "on-track" | "over";
  currentDay: number;
  month: number;
}

export function SpendingPaceIndicator({
  totalSpent,
  expectedSpent,
  pacingStatus,
  currentDay,
  month,
}: SpendingPaceIndicatorProps) {
  const monthName = getMonthName(month, "short");

  const statusConfig = {
    under: {
      label: "UNDERSPENDING",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-200",
      Icon: TrendingDown,
      message: "You're below your expected spending pace.",
    },
    "on-track": {
      label: "ON TRACK",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      Icon: CheckCircle,
      message: "You're on track with your budget.",
    },
    over: {
      label: "OVERSPENDING",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      Icon: AlertTriangle,
      message: "You're ahead of budget. Consider slowing down spending.",
    },
  };

  const config = statusConfig[pacingStatus];
  const Icon = config.Icon;

  return (
    <Card
      className={cn(
        "p-4 border",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Daily Pacing</span>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded",
            config.textColor,
            config.bgColor
          )}
        >
          {config.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {formatBudgetCurrency(totalSpent)}
        </span>
        <span className="text-muted-foreground">
          / {formatBudgetCurrency(expectedSpent)} expected by {currentDay} {monthName}
        </span>
      </div>

      <div className={cn("flex items-center gap-2 mt-2 text-sm", config.textColor)}>
        <Icon className="h-4 w-4" />
        <span>{config.message}</span>
      </div>
    </Card>
  );
}
