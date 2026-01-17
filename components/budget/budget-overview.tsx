"use client";

import { Card } from "@/components/ui/card";
import { formatBudgetCurrency, getBudgetUsageStatus, getMonthName } from "@/lib/budget-utils";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingDown, CheckCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BudgetOverviewProps {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  dailyBudget: number;
  todaySpent: number;
  // Pacing props
  expectedSpent?: number;
  pacingStatus?: "under" | "on-track" | "over";
  currentDay?: number;
  month?: number;
  showPacing?: boolean;
  onPacingClick?: () => void;
  onHistoryClick?: () => void;
}

export function BudgetOverview({
  totalBudget,
  totalSpent,
  remaining,
  percentUsed,
  dailyBudget,
  todaySpent,
  expectedSpent = 0,
  pacingStatus = "on-track",
  currentDay = 1,
  month = 1,
  showPacing = false,
  onPacingClick,
  onHistoryClick,
}: BudgetOverviewProps) {
  const usageStatus = getBudgetUsageStatus(percentUsed);

  const statusColors = {
    safe: "bg-blue-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  const pacingConfig = {
    under: {
      label: "UNDERSPENDING",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      Icon: TrendingDown,
      message: "You're below your expected spending pace.",
    },
    "on-track": {
      label: "ON TRACK",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      Icon: CheckCircle,
      message: "You're on track with your budget.",
    },
    over: {
      label: "OVERSPENDING",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      Icon: AlertTriangle,
      message: "You're ahead of budget. Consider slowing down spending.",
    },
  };

  const pacing = pacingConfig[pacingStatus];
  const PacingIcon = pacing.Icon;
  const monthName = getMonthName(month, "short");

  return (
    <Card className="p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Spending Overview
        </div>
        {onHistoryClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2 -mt-2"
            onClick={onHistoryClick}
          >
            <History className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Main Amount */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold">
          {formatBudgetCurrency(totalSpent)}
        </span>
        <span className="text-xl text-muted-foreground">
          / {formatBudgetCurrency(totalBudget)}
        </span>
      </div>

      {/* Remaining */}
      <div className="text-sm text-muted-foreground mb-3">
        {formatBudgetCurrency(Math.max(0, remaining))} remaining (
        {Math.max(0, 100 - percentUsed).toFixed(1)}%)
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            "h-full transition-all rounded-full",
            statusColors[usageStatus]
          )}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Today's Spending */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-sm font-medium text-muted-foreground">Spent Today</span>
        <div className="text-sm">
          <span className="font-semibold">{formatBudgetCurrency(todaySpent)}</span>
          <span className="text-muted-foreground">
            {" "}/ {formatBudgetCurrency(dailyBudget)}
          </span>
        </div>
      </div>

      {/* Daily Pacing Section */}
      {showPacing && totalBudget > 0 && (
        <div
          className={cn(
            "mt-4 pt-4 border-t rounded-lg p-4 -mx-1 transition-all",
            pacing.bgColor,
            onPacingClick && "cursor-pointer hover:opacity-80"
          )}
          onClick={onPacingClick}
          role={onPacingClick ? "button" : undefined}
          tabIndex={onPacingClick ? 0 : undefined}
          onKeyDown={onPacingClick ? (e) => e.key === "Enter" && onPacingClick() : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Daily Pacing</span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded",
                pacing.textColor
              )}
            >
              {pacing.label}
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

          <div className={cn("flex items-center gap-2 mt-2 text-sm", pacing.textColor)}>
            <PacingIcon className="h-4 w-4" />
            <span>{pacing.message}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
