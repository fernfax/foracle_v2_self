"use client"

import { useMemo, useState } from "react"
import { deleteDailyExpense, type DailyExpense } from "@/actions/daily-expenses"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { Clock, Pencil, Trash2 } from "lucide-react"
import * as LucideIcons from "lucide-react"

import {
  formatBudgetCurrency,
  getCategoryBgColor,
  getCategoryIconColor,
  getDefaultCategoryIcon
} from "@/lib/finance/budget-utils"
import { cn } from "@/lib/utils"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RecentExpensesListProps {
  expenses: DailyExpense[]
  onEdit?: (expense: DailyExpense) => void
  onDelete?: () => void
  onViewAll?: () => void
  maxItems?: number
  readOnly?: boolean
}

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

export function RecentExpensesList({
  expenses,
  onEdit,
  onDelete,
  onViewAll,
  maxItems = 10,
  readOnly = false
}: RecentExpensesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Take only the most recent N expenses
  const recentExpenses = useMemo(() => {
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return sorted.slice(0, maxItems)
  }, [expenses, maxItems])

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

  const groupedExpenses = groupExpensesByDate(recentExpenses)
  const sortedDates = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="text-primary h-4 w-4" />
          Recent Expenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No expenses recorded this month.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date Header */}
                <div className="text-muted-foreground mb-1.5 text-xs font-medium">
                  {formatExpenseDate(date)}
                </div>

                {/* Expenses for this date */}
                <div className="divide-y rounded-lg border">
                  {groupedExpenses[date].map((expense) => {
                    const Icon = getIconComponent(expense.categoryName)
                    const iconColor = getCategoryIconColor(expense.categoryName)
                    const bgColor = getCategoryBgColor(expense.categoryName)

                    return (
                      <div
                        key={expense.id}
                        className="hover:bg-muted/50 group flex items-center gap-2.5 px-3 py-2">
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                            bgColor
                          )}>
                          <Icon className={cn("h-4 w-4", iconColor)} />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {expense.categoryName}
                          </div>
                          {(expense.subcategoryName || expense.note) && (
                            <div className="text-muted-foreground truncate text-xs">
                              {expense.subcategoryName}
                              {expense.subcategoryName && expense.note && " - "}
                              {expense.note}
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-semibold">
                            {formatBudgetCurrency(parseFloat(expense.amount))}
                          </div>
                        </div>

                        {/* Actions (hover) — hidden in read-only mode */}
                        {!readOnly && (
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEdit?.(expense)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="destructiveGhost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteId(expense.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* View All button */}
            {expenses.length > maxItems && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onViewAll}>
                View All {expenses.length} Expenses
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation — not needed in read-only mode */}
      {!readOnly && (
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
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  )
}
