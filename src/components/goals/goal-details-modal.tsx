"use client"

import React from "react"
import { differenceInDays, differenceInMonths, format } from "date-fns"
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Trophy,
  Wallet
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface Goal {
  id: string
  userId: string
  linkedExpenseId: string | null
  goalName: string
  goalType: string
  targetAmount: string
  targetDate: string
  currentAmountSaved: string | null
  monthlyContribution: string | null
  description: string | null
  isAchieved: boolean | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface GoalDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
}

export function GoalDetailsModal({
  open,
  onOpenChange,
  goal
}: GoalDetailsModalProps) {
  if (!goal) return null

  const targetAmount = parseFloat(goal.targetAmount)
  const currentSaved = parseFloat(goal.currentAmountSaved || "0")
  const monthlyContribution = parseFloat(goal.monthlyContribution || "0")
  const remaining = targetAmount - currentSaved
  const progress =
    targetAmount > 0 ? Math.min(100, (currentSaved / targetAmount) * 100) : 0

  const getTimeRemaining = () => {
    const target = new Date(goal.targetDate)
    const today = new Date()
    const daysRemaining = differenceInDays(target, today)
    const monthsRemaining = differenceInMonths(target, today)

    if (goal.isAchieved) {
      return { text: "Achieved", isOverdue: false, days: 0 }
    } else if (daysRemaining < 0) {
      return {
        text: `${Math.abs(daysRemaining)} days overdue`,
        isOverdue: true,
        days: daysRemaining
      }
    } else if (daysRemaining === 0) {
      return { text: "Due today", isOverdue: false, days: 0 }
    } else if (daysRemaining < 30) {
      return {
        text: `${daysRemaining} days left`,
        isOverdue: false,
        days: daysRemaining
      }
    } else if (monthsRemaining < 12) {
      return {
        text: `${monthsRemaining} months left`,
        isOverdue: false,
        days: daysRemaining
      }
    } else {
      const years = Math.floor(monthsRemaining / 12)
      const remainingMonths = monthsRemaining % 12
      return {
        text:
          remainingMonths > 0
            ? `${years}y ${remainingMonths}m left`
            : `${years} years left`,
        isOverdue: false,
        days: daysRemaining
      }
    }
  }

  const timeRemaining = getTimeRemaining()

  // Calculate projected completion
  const getProjectedCompletion = () => {
    if (monthlyContribution <= 0 || remaining <= 0) return null
    const monthsNeeded = Math.ceil(remaining / monthlyContribution)
    const completionDate = new Date()
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded)
    return completionDate
  }

  const projectedCompletion = getProjectedCompletion()

  // Calculate if on track
  const isOnTrack = () => {
    if (!projectedCompletion) return null
    const targetDate = new Date(goal.targetDate)
    return projectedCompletion <= targetDate
  }

  const onTrack = isOnTrack()

  const getProgressColor = () => {
    if (progress >= 75) return "bg-brand-teal"
    if (progress >= 50) return "bg-brand-terracotta"
    if (progress >= 25) return "bg-brand-gold"
    return "bg-muted"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                goal.isAchieved
                  ? "bg-brand-teal/[0.12]"
                  : "bg-brand-teal/[0.12]"
              }`}>
              {goal.isAchieved ? (
                <Trophy className="text-on-success h-6 w-6" />
              ) : (
                <Target className="text-on-success h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">{goal.goalName}</DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    goal.goalType === "primary"
                      ? "text-on-brand border-brand-terracotta/[0.25] bg-brand-terracotta/[0.1]"
                      : "border-border bg-muted text-foreground"
                  }>
                  {goal.goalType === "primary"
                    ? "Primary Goal"
                    : "Secondary Goal"}
                </Badge>
                {goal.isAchieved && (
                  <Badge className="text-on-success border-brand-teal/[0.25] bg-brand-teal/[0.12]">
                    Achieved
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Current Progress
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  ${currentSaved.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-sm">Target</p>
                <p className="text-muted-foreground text-xl font-semibold tabular-nums">
                  ${targetAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-muted h-4 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-success font-medium">
                  {progress.toFixed(1)}% complete
                </span>
                <span className="text-muted-foreground">
                  ${remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-muted-foreground mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Target Date</span>
              </div>
              <p className="font-semibold">
                {format(new Date(goal.targetDate), "MMMM d, yyyy")}
              </p>
              <p
                className={`mt-1 text-sm ${
                  timeRemaining.isOverdue
                    ? "text-on-danger"
                    : "text-muted-foreground"
                }`}>
                {timeRemaining.text}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="text-muted-foreground mb-1 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Monthly Contribution</span>
              </div>
              <p className="font-semibold">
                {monthlyContribution > 0
                  ? `$${monthlyContribution.toLocaleString()}`
                  : "Not set"}
              </p>
              {goal.linkedExpenseId && (
                <p className="text-on-success mt-1 text-sm">
                  Linked to expenses
                </p>
              )}
            </div>
          </div>

          {/* Projection Section */}
          {projectedCompletion && !goal.isAchieved && (
            <div
              className={`rounded-lg border p-4 ${
                onTrack
                  ? "border-brand-teal/[0.25] bg-brand-teal/[0.12]"
                  : "border-brand-gold/[0.3] bg-brand-gold/[0.15]"
              }`}>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp
                  className={`h-4 w-4 ${onTrack ? "text-on-success" : "text-on-warning"}`}
                />
                <span
                  className={`text-sm font-medium ${
                    onTrack ? "text-on-success" : "text-on-warning"
                  }`}>
                  {onTrack ? "On Track" : "Behind Schedule"}
                </span>
              </div>
              <p
                className={`text-sm ${onTrack ? "text-on-success" : "text-on-warning"}`}>
                At your current rate of ${monthlyContribution.toLocaleString()}
                /month, you&apos;ll reach your goal by{" "}
                <span className="font-semibold">
                  {format(projectedCompletion, "MMMM yyyy")}
                </span>
                .
                {!onTrack && (
                  <span className="mt-1 block">
                    Consider increasing your monthly contribution to reach your
                    target on time.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Notes</p>
              <p className="text-foreground bg-muted rounded-lg p-3 text-sm">
                {goal.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-muted-foreground border-t pt-4 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Created {format(new Date(goal.createdAt), "MMM d, yyyy")}
                {goal.updatedAt !== goal.createdAt && (
                  <>
                    {" "}
                    · Updated {format(new Date(goal.updatedAt), "MMM d, yyyy")}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
