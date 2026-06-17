"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import {
  Car,
  CheckCircle2,
  GraduationCap,
  Heart,
  Home,
  Palmtree,
  Plane,
  Shield,
  Target,
  type LucideIcon
} from "lucide-react"
import { toast } from "sonner"

import { deleteGoal, markGoalAchieved } from "@/lib/actions/goals"
import { formatBudgetCurrency } from "@/lib/budget-utils"
import { brandColor } from "@/lib/portfolio-colors"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { RowActions } from "@/components/ui/row-actions"
import { Toolbar } from "@/components/ui/toolbar"
import { ConfirmDialog } from "@/components/portfolio/confirm-dialog"
import { ProgressBar } from "@/components/portfolio/progress"

import { AddGoalDialog } from "./add-goal-dialog"
import { GoalDetailsModal } from "./goal-details-modal"

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

interface GoalListProps {
  initialGoals: Goal[]
  showAddButton?: boolean
  isAchievedView?: boolean
}

/** Pick a lucide icon by keyword on the goal name (per brief §3). */
function iconForGoal(goalName: string): LucideIcon {
  const n = goalName.toLowerCase()
  if (n.includes("emergency")) return Shield
  if (n.includes("education") || n.includes("child")) return GraduationCap
  if (n.includes("trip") || n.includes("travel") || n.includes("holiday"))
    return Plane
  if (n.includes("home") || n.includes("house")) return Home
  if (n.includes("car") || n.includes("vehicle")) return Car
  if (n.includes("retire")) return Palmtree
  if (n.includes("wedding")) return Heart
  return Target
}

export function GoalList({
  initialGoals,
  showAddButton,
  isAchievedView
}: GoalListProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const handleDelete = async () => {
    if (!goalToDelete) return
    const goal = goalToDelete
    setGoalToDelete(null)
    try {
      await deleteGoal(goal.id)
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
      toast.success("Goal deleted")
    } catch (error) {
      console.error("Failed to delete goal:", error)
      toast.error("Could not delete goal. Please try again.")
    }
  }

  const handleMarkAchieved = async (goal: Goal) => {
    try {
      await markGoalAchieved(goal.id)
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
      toast.success("Goal marked as achieved")
    } catch (error) {
      console.error("Failed to mark goal as achieved:", error)
      toast.error("Could not update goal. Please try again.")
    }
  }

  if (goals.length === 0) {
    return (
      <>
        <EmptyState
          icon={Target}
          title={isAchievedView ? "No achieved goals yet" : "No goals yet"}
          description={
            isAchievedView
              ? "Goals you've accomplished will appear here. Keep working towards your targets."
              : "Set your first financial goal to start tracking your progress."
          }
          action={
            !isAchievedView
              ? { label: "Add goal", onClick: () => setAddDialogOpen(true) }
              : undefined
          }
        />

        <AddGoalDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => {
            toast.success("Goal added")
            window.location.reload()
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div data-tour="goals-toolbar">
          <Toolbar
            count={{
              value: goals.length,
              label: isAchievedView
                ? goals.length === 1
                  ? "achieved goal"
                  : "achieved goals"
                : goals.length === 1
                  ? "active goal"
                  : "active goals"
            }}
            primaryAction={
              showAddButton
                ? { label: "Add goal", onClick: () => setAddDialogOpen(true) }
                : undefined
            }
          />
        </div>

        <div
          data-tour="goals-list"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const saved = parseFloat(goal.currentAmountSaved ?? "0")
            const target = parseFloat(goal.targetAmount)
            const pct =
              target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0
            const remaining = Math.max(0, target - saved)
            const color = brandColor(goal.goalName)
            const Icon = iconForGoal(goal.goalName)

            return (
              <Card
                key={goal.id}
                interactive
                className="flex cursor-pointer flex-col gap-3 p-5"
                onClick={() => setSelectedGoal(goal)}>
                {/* Header: icon tile + name/meta + RowActions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: color + "22", color }}>
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-base leading-tight font-semibold tracking-tight">
                        {goal.goalName}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Target {format(new Date(goal.targetDate), "MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <RowActions
                    onEdit={() => setEditingGoal(goal)}
                    onDelete={() => setGoalToDelete(goal)}
                  />
                </div>

                {/* Saved of target */}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
                    {formatBudgetCurrency(saved)}
                  </span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    of {formatBudgetCurrency(target)}
                  </span>
                </div>

                {/* Progress */}
                <ProgressBar value={pct} color={color} />

                {/* Footer */}
                <div className="border-border/40 flex items-center justify-between border-t pt-3 text-sm">
                  <span className="font-medium" style={{ color }}>
                    {pct}% funded
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatBudgetCurrency(remaining)} to go
                  </span>
                </div>

                {/* Mark-as-achieved affordance (active view only) — preserves existing action */}
                {!isAchievedView && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkAchieved(goal)
                    }}
                    className="border-border/60 text-muted-foreground flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors hover:bg-[rgba(0,196,170,0.10)] hover:text-[#007A68] dark:hover:text-[#33D4BC]">
                    <CheckCircle2 className="size-3.5" />
                    Mark as achieved
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add Goal Dialog */}
      <AddGoalDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          toast.success("Goal added")
          window.location.reload()
        }}
      />

      {/* Edit Goal Dialog */}
      <AddGoalDialog
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        goal={editingGoal}
        onSuccess={() => {
          toast.success("Goal updated")
          window.location.reload()
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={goalToDelete !== null}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
        title="Delete this goal?"
        description={
          <>
            &ldquo;{goalToDelete?.goalName}&rdquo; will be removed. This
            can&rsquo;t be undone.
            {goalToDelete?.linkedExpenseId ? (
              <span className="mt-2 block text-[#7A5A00] dark:text-[#D4A843]">
                This will also remove the linked monthly expense.
              </span>
            ) : null}
          </>
        }
        confirmLabel="Delete goal"
        onConfirm={handleDelete}
      />

      {/* Goal Details Modal */}
      <GoalDetailsModal
        open={!!selectedGoal}
        onOpenChange={(open) => !open && setSelectedGoal(null)}
        goal={selectedGoal}
      />
    </>
  )
}
