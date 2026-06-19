"use client"

import { useState } from "react"
import { deleteDailyExpense, type DailyExpense } from "@/actions/daily-expenses"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import * as LucideIcons from "lucide-react"

import {
  formatBudgetCurrency,
  getDefaultCategoryIcon
} from "@/lib/finance/budget-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface DailyExpenseHistoryProps {
  expenses: DailyExpense[]
  onEdit?: (expense: DailyExpense) => void
  onDelete?: () => void
}

// Helper to get Lucide icon component by name
function getIconComponent(categoryName: string) {
  const name = getDefaultCategoryIcon(categoryName)
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")

  const IconComponent = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }>
    >
  )[pascalCase]
  return IconComponent || LucideIcons.CircleDollarSign
}

function formatExpenseDate(dateString: string): string {
  const date = parseISO(dateString)
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "d MMM")
}

// Group expenses by date
function groupExpensesByDate(
  expenses: DailyExpense[]
): Record<string, DailyExpense[]> {
  return expenses.reduce(
    (groups, expense) => {
      const date = expense.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(expense)
      return groups
    },
    {} as Record<string, DailyExpense[]>
  )
}

export function DailyExpenseHistory({
  expenses,
  onEdit,
  onDelete
}: DailyExpenseHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      await deleteDailyExpense(deleteId)
      onDelete?.()
    } catch (error) {
      console.error("Error deleting expense:", error)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <p>No expenses recorded this month.</p>
        <p className="mt-1 text-sm">
          Tap the + button to add your first expense.
        </p>
      </div>
    )
  }

  const groupedExpenses = groupExpensesByDate(expenses)
  const sortedDates = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <>
      <div className="space-y-4">
        {sortedDates.map((date) => (
          <div key={date}>
            {/* Date Header */}
            <div className="text-muted-foreground mb-2 text-sm font-medium">
              {formatExpenseDate(date)}
            </div>

            {/* Expenses for this date */}
            <Card className="divide-y">
              {groupedExpenses[date].map((expense) => {
                const Icon = getIconComponent(expense.categoryName)
                return (
                  <div
                    key={expense.id}
                    className="hover:bg-muted/50 group flex items-center gap-3 p-3">
                    {/* Icon */}
                    <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                      <Icon className="text-muted-foreground h-5 w-5" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {expense.categoryName}
                      </div>
                      {expense.note && (
                        <div className="text-muted-foreground truncate text-sm">
                          {expense.note}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div className="font-semibold">
                        {formatBudgetCurrency(parseFloat(expense.amount))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit?.(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructiveGhost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
