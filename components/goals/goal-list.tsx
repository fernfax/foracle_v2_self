"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Trophy,
  Calendar,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { AddGoalDialog } from "./add-goal-dialog";
import { GoalDetailsModal } from "./goal-details-modal";
import { deleteGoal, markGoalAchieved } from "@/lib/actions/goals";

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

interface GoalListProps {
  initialGoals: Goal[];
  showAddButton?: boolean;
  isAchievedView?: boolean;
}

export function GoalList({ initialGoals, showAddButton, isAchievedView }: GoalListProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [achieveDialogOpen, setAchieveDialogOpen] = useState(false);
  const [goalToAchieve, setGoalToAchieve] = useState<Goal | null>(null);
  const [isAchieving, setIsAchieving] = useState(false);

  const handleDelete = async () => {
    if (!goalToDelete) return;

    setIsDeleting(true);
    try {
      await deleteGoal(goalToDelete.id);
      setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    } catch (error) {
      console.error("Failed to delete goal:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAchieved = async () => {
    if (!goalToAchieve) return;

    setIsAchieving(true);
    try {
      await markGoalAchieved(goalToAchieve.id);
      setGoals((prev) => prev.filter((g) => g.id !== goalToAchieve.id));
      setAchieveDialogOpen(false);
      setGoalToAchieve(null);
    } catch (error) {
      console.error("Failed to mark goal as achieved:", error);
    } finally {
      setIsAchieving(false);
    }
  };

  const calculateProgress = (goal: Goal) => {
    const target = parseFloat(goal.targetAmount);
    const current = parseFloat(goal.currentAmountSaved || "0");
    if (target === 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const getTimeRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const daysRemaining = differenceInDays(target, today);
    const monthsRemaining = differenceInMonths(target, today);

    if (daysRemaining < 0) {
      return { text: "Overdue", isOverdue: true };
    } else if (daysRemaining === 0) {
      return { text: "Due today", isOverdue: false };
    } else if (daysRemaining < 30) {
      return { text: `${daysRemaining} days left`, isOverdue: false };
    } else if (monthsRemaining < 12) {
      return { text: `${monthsRemaining} months left`, isOverdue: false };
    } else {
      const years = Math.floor(monthsRemaining / 12);
      const remainingMonths = monthsRemaining % 12;
      return {
        text: remainingMonths > 0 ? `${years}y ${remainingMonths}m left` : `${years} years left`,
        isOverdue: false,
      };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-gray-400";
  };

  if (goals.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            {isAchievedView ? (
              <Trophy className="h-8 w-8 text-gray-400" />
            ) : (
              <Target className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isAchievedView ? "No achieved goals yet" : "No goals yet"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {isAchievedView
              ? "Goals you've accomplished will appear here. Keep working towards your targets!"
              : "Set your first financial goal to start tracking your progress."}
          </p>
          {showAddButton && (
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
              className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          )}
        </div>

        <AddGoalDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => window.location.reload()}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {goals.length} {goals.length === 1 ? "goal" : "goals"}
          </p>
          {showAddButton && (
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
              className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const timeRemaining = getTimeRemaining(goal.targetDate);
            const currentSaved = parseFloat(goal.currentAmountSaved || "0");
            const targetAmount = parseFloat(goal.targetAmount);
            const remaining = targetAmount - currentSaved;

            return (
              <Card
                key={goal.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedGoal(goal)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                          isAchievedView
                            ? "bg-emerald-100"
                            : "bg-cyan-100"
                        }`}
                      >
                        {isAchievedView ? (
                          <Trophy className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Target className="h-5 w-5 text-cyan-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{goal.goalName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className={
                              goal.goalType === "primary"
                                ? "border-violet-200 bg-violet-50 text-violet-700"
                                : "border-gray-200 bg-gray-50 text-gray-600"
                            }
                          >
                            {goal.goalType === "primary" ? "Primary" : "Secondary"}
                          </Badge>
                          {!isAchievedView && (
                            <span
                              className={`text-xs ${
                                timeRemaining.isOverdue
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {timeRemaining.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isAchievedView && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setGoalToAchieve(goal);
                              setAchieveDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                            Mark as Achieved
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGoal(goal);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGoalToDelete(goal);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        ${targetAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isAchievedView ? "Saved" : "Remaining"}
                      </p>
                      <p
                        className={`text-2xl font-semibold tabular-nums ${
                          isAchievedView ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        ${isAchievedView ? currentSaved.toLocaleString() : remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-emerald-600">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(
                          progress
                        )}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${currentSaved.toLocaleString()} saved</span>
                      <span>${targetAmount.toLocaleString()} target</span>
                    </div>
                  </div>

                  {/* Footer with details */}
                  <div className="pt-3 border-t bg-gray-50/50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        {goal.monthlyContribution && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-muted-foreground">Monthly:</span>{" "}
                            <span className="font-medium text-emerald-600">
                              ${parseFloat(goal.monthlyContribution).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {isAchievedView ? "Achieved" : "Target"}: {format(new Date(goal.targetDate), "MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Goal Dialog */}
      <AddGoalDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Edit Goal Dialog */}
      <AddGoalDialog
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        goal={editingGoal}
        onSuccess={() => window.location.reload()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goalToDelete?.goalName}"?
              {goalToDelete?.linkedExpenseId && (
                <span className="block mt-2 text-amber-600">
                  This will also remove the linked monthly expense.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Achieved Confirmation Dialog */}
      <AlertDialog open={achieveDialogOpen} onOpenChange={setAchieveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Goal as Achieved</AlertDialogTitle>
            <AlertDialogDescription>
              Congratulations! Are you sure you want to mark "{goalToAchieve?.goalName}" as achieved?
              <span className="block mt-2">
                This goal will be moved to the Achieved tab.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAchieving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAchieved}
              disabled={isAchieving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isAchieving ? "Saving..." : "Mark as Achieved"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal Details Modal */}
      <GoalDetailsModal
        open={!!selectedGoal}
        onOpenChange={(open) => !open && setSelectedGoal(null)}
        goal={selectedGoal}
      />
    </>
  );
}
