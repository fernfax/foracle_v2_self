"use client"

import { AlertTriangle, CheckCircle, History, TrendingDown } from "lucide-react"

import {
  formatBudgetCurrency,
  getBudgetUsageStatus,
  getMonthName
} from "@/lib/finance/budget-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BudgetOverviewProps {
  totalBudget: number
  totalSpent: number
  remaining: number
  percentUsed: number
  dailyBudget: number
  todaySpent: number
  // Pacing props
  expectedSpent?: number
  pacingStatus?: "under" | "on-track" | "over"
  currentDay?: number
  month?: number
  showPacing?: boolean
  onPacingClick?: () => void
  onHistoryClick?: () => void
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
  onHistoryClick
}: BudgetOverviewProps) {
  const usageStatus = getBudgetUsageStatus(percentUsed)

  const statusColors = {
    safe: "bg-brand-terracotta",
    warning: "bg-brand-gold",
    danger: "bg-brand-alert-red"
  }

  const pacingConfig = {
    under: {
      label: "UNDERSPENDING",
      textColor: "text-on-success",
      bgColor: "bg-brand-teal/[0.12]",
      Icon: TrendingDown,
      message: "You're below your expected spending pace."
    },
    "on-track": {
      label: "ON TRACK",
      textColor: "text-on-brand",
      bgColor: "bg-brand-terracotta/[0.1]",
      Icon: CheckCircle,
      message: "You're on track with your budget."
    },
    over: {
      label: "OVERSPENDING",
      textColor: "text-on-danger",
      bgColor: "bg-brand-alert-red/[0.12]",
      Icon: AlertTriangle,
      message: "You're ahead of budget. Consider slowing down spending."
    }
  }

  const pacing = pacingConfig[pacingStatus]
  const PacingIcon = pacing.Icon
  const monthName = getMonthName(month, "short")

  return (
    <Card className="h-full p-5">
      {/* Section Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Spending Overview
        </div>
        {onHistoryClick && (
          <Button
            variant="ghost"
            size="icon"
            className="-mt-2 -mr-2 size-8"
            onClick={onHistoryClick}>
            <History className="text-muted-foreground size-4" />
          </Button>
        )}
      </div>

      {/* Main Amount */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold">
          {formatBudgetCurrency(totalSpent)}
        </span>
        <span className="text-muted-foreground text-xl">
          / {formatBudgetCurrency(totalBudget)}
        </span>
      </div>

      {/* Remaining */}
      <div className="text-muted-foreground mb-3 text-sm">
        {formatBudgetCurrency(Math.max(0, remaining))} remaining (
        {Math.max(0, 100 - percentUsed).toFixed(1)}%)
      </div>

      {/* Progress Bar */}
      <div className="bg-muted mb-4 h-2.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            statusColors[usageStatus]
          )}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Today's Spending */}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground text-sm font-medium">
          Spent Today
        </span>
        <div className="text-sm">
          <span className="font-semibold">
            {formatBudgetCurrency(todaySpent)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {formatBudgetCurrency(dailyBudget)}
          </span>
        </div>
      </div>

      {/* Daily Pacing Section */}
      {showPacing && totalBudget > 0 && (
        <div
          className={cn(
            "-mx-1 mt-4 rounded-lg border-t p-4 pt-4 transition-all",
            pacing.bgColor,
            onPacingClick && "hover:opacity-80"
          )}
          onClick={onPacingClick}
          role={onPacingClick ? "button" : undefined}
          tabIndex={onPacingClick ? 0 : undefined}
          onKeyDown={
            onPacingClick
              ? (e) => e.key === "Enter" && onPacingClick()
              : undefined
          }>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">
              Daily Pacing
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold",
                pacing.textColor
              )}>
              {pacing.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatBudgetCurrency(totalSpent)}
            </span>
            <span className="text-muted-foreground">
              / {formatBudgetCurrency(expectedSpent)} expected by {currentDay}{" "}
              {monthName}
            </span>
          </div>

          <div
            className={cn(
              "mt-2 flex items-center gap-2 text-sm",
              pacing.textColor
            )}>
            <PacingIcon className="size-4" />
            <span>{pacing.message}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
