"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Trophy, Calendar, TrendingUp, Wallet, Clock } from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";

interface Goal {
  id: string;
  userId: string;
  linkedExpenseId: string | null;
  goalName: string;
  goalType: string;
  targetAmount: string;
  targetDate: string;
  currentAmountSaved: string | null;
  monthlyContribution: string | null;
  description: string | null;
  isAchieved: boolean | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GoalDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}

export function GoalDetailsModal({ open, onOpenChange, goal }: GoalDetailsModalProps) {
  if (!goal) return null;

  const targetAmount = parseFloat(goal.targetAmount);
  const currentSaved = parseFloat(goal.currentAmountSaved || "0");
  const monthlyContribution = parseFloat(goal.monthlyContribution || "0");
  const remaining = targetAmount - currentSaved;
  const progress = targetAmount > 0 ? Math.min(100, (currentSaved / targetAmount) * 100) : 0;

  const getTimeRemaining = () => {
    const target = new Date(goal.targetDate);
    const today = new Date();
    const daysRemaining = differenceInDays(target, today);
    const monthsRemaining = differenceInMonths(target, today);

    if (goal.isAchieved) {
      return { text: "Achieved", isOverdue: false, days: 0 };
    } else if (daysRemaining < 0) {
      return { text: `${Math.abs(daysRemaining)} days overdue`, isOverdue: true, days: daysRemaining };
    } else if (daysRemaining === 0) {
      return { text: "Due today", isOverdue: false, days: 0 };
    } else if (daysRemaining < 30) {
      return { text: `${daysRemaining} days left`, isOverdue: false, days: daysRemaining };
    } else if (monthsRemaining < 12) {
      return { text: `${monthsRemaining} months left`, isOverdue: false, days: daysRemaining };
    } else {
      const years = Math.floor(monthsRemaining / 12);
      const remainingMonths = monthsRemaining % 12;
      return {
        text: remainingMonths > 0 ? `${years}y ${remainingMonths}m left` : `${years} years left`,
        isOverdue: false,
        days: daysRemaining,
      };
    }
  };

  const timeRemaining = getTimeRemaining();

  // Calculate projected completion
  const getProjectedCompletion = () => {
    if (monthlyContribution <= 0 || remaining <= 0) return null;
    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
    return completionDate;
  };

  const projectedCompletion = getProjectedCompletion();

  // Calculate if on track
  const isOnTrack = () => {
    if (!projectedCompletion) return null;
    const targetDate = new Date(goal.targetDate);
    return projectedCompletion <= targetDate;
  };

  const onTrack = isOnTrack();

  const getProgressColor = () => {
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-gray-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                goal.isAchieved
                  ? "bg-emerald-100"
                  : "bg-cyan-100"
              }`}
            >
              {goal.isAchieved ? (
                <Trophy className="h-6 w-6 text-emerald-600" />
              ) : (
                <Target className="h-6 w-6 text-cyan-600" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">{goal.goalName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={
                    goal.goalType === "primary"
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }
                >
                  {goal.goalType === "primary" ? "Primary Goal" : "Secondary Goal"}
                </Badge>
                {goal.isAchieved && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
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
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Current Progress</p>
                <p className="text-3xl font-bold tabular-nums">
                  ${currentSaved.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                  ${targetAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-emerald-600">{progress.toFixed(1)}% complete</span>
                <span className="text-muted-foreground">
                  ${remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Target Date</span>
              </div>
              <p className="font-semibold">{format(new Date(goal.targetDate), "MMMM d, yyyy")}</p>
              <p
                className={`text-sm mt-1 ${
                  timeRemaining.isOverdue ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                {timeRemaining.text}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Monthly Contribution</span>
              </div>
              <p className="font-semibold">
                {monthlyContribution > 0
                  ? `$${monthlyContribution.toLocaleString()}`
                  : "Not set"}
              </p>
              {goal.linkedExpenseId && (
                <p className="text-sm text-emerald-600 mt-1">Linked to expenses</p>
              )}
            </div>
          </div>

          {/* Projection Section */}
          {projectedCompletion && !goal.isAchieved && (
            <div
              className={`p-4 rounded-lg border ${
                onTrack
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className={`h-4 w-4 ${onTrack ? "text-emerald-600" : "text-amber-600"}`}
                />
                <span
                  className={`text-sm font-medium ${
                    onTrack ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {onTrack ? "On Track" : "Behind Schedule"}
                </span>
              </div>
              <p className={`text-sm ${onTrack ? "text-emerald-700" : "text-amber-700"}`}>
                At your current rate of ${monthlyContribution.toLocaleString()}/month, you'll reach
                your goal by{" "}
                <span className="font-semibold">{format(projectedCompletion, "MMMM yyyy")}</span>.
                {!onTrack && (
                  <span className="block mt-1">
                    Consider increasing your monthly contribution to reach your target on time.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {goal.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Created {format(new Date(goal.createdAt), "MMM d, yyyy")}
                {goal.updatedAt !== goal.createdAt && (
                  <> · Updated {format(new Date(goal.updatedAt), "MMM d, yyyy")}</>
                )}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
