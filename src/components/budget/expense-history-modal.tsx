"use client"

import { useState } from "react"
import { deleteDailyExpense, type DailyExpense } from "@/actions/daily-expenses"
import { format, parseISO } from "date-fns"
import { X } from "lucide-react"
import * as LucideIcons from "lucide-react"

import {
  formatBudgetCurrency,
  getCategoryBgColor,
  getCategoryIconColor,
  getDefaultCategoryIcon
} from "@/lib/budget-utils"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency-utils"
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
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { SwipeableExpenseRow } from "@/components/budget/swipeable-expense-row"

interface ExpenseHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

// Calculate total for a group of expenses
function calculateDayTotal(expenses: DailyExpense[]): number {
  return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
}

export function ExpenseHistoryModal({
  open,
  onOpenChange,
  expenses,
  onEdit,
  onDelete
}: ExpenseHistoryModalProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null)

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

  const totalAmount = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  )
  const groupedExpenses = groupExpensesByDate(expenses)
  const sortedDates = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          {/* Header */}
          <DrawerHeader>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="flex-1 text-center text-lg font-semibold">
              All Expenses
            </DrawerTitle>
            <div className="w-8" />
          </DrawerHeader>

          <DrawerBody>
            {/* Total Row */}
            <div className="flex items-center justify-between border-b px-2 py-3">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold text-[#8B0000]">
                {formatBudgetCurrency(totalAmount)}
              </span>
            </div>

            {/* Expense List */}
            {expenses.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                <p>No expenses recorded this month.</p>
                <p className="mt-1 text-sm">
                  Tap the + button to add your first expense.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedDates.map((date) => {
                  const dayExpenses = groupedExpenses[date]
                  const dayTotal = calculateDayTotal(dayExpenses)
                  const parsedDate = parseISO(date)

                  return (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="bg-muted/30 flex items-center justify-between px-2 py-3">
                        <span className="text-muted-foreground text-sm font-medium">
                          {format(parsedDate, "EEE, MMM d")}
                        </span>
                        <span className="text-sm font-medium text-[#8B0000]">
                          OUT {formatBudgetCurrency(dayTotal)}
                        </span>
                      </div>

                      {/* Expenses for this date */}
                      <div className="divide-y">
                        {dayExpenses.map((expense) => {
                          const Icon = getIconComponent(expense.categoryName)
                          const iconColor = getCategoryIconColor(
                            expense.categoryName
                          )
                          const bgColor = getCategoryBgColor(
                            expense.categoryName
                          )
                          const createdAt = new Date(expense.createdAt)

                          return (
                            <SwipeableExpenseRow
                              key={expense.id}
                              onDelete={() => setDeleteId(expense.id)}
                              isOpen={swipedRowId === expense.id}
                              onSwipeStart={() => setSwipedRowId(expense.id)}>
                              <div
                                className="flex items-center gap-3 px-2 py-3"
                                onClick={() => {
                                  onEdit?.(expense)
                                  onOpenChange(false)
                                }}>
                                {/* Icon */}
                                <div
                                  className={cn(
                                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                                    bgColor
                                  )}>
                                  <Icon className={cn("h-5 w-5", iconColor)} />
                                </div>

                                {/* Details */}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">
                                    {expense.categoryName}
                                    {expense.subcategoryName && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        / {expense.subcategoryName}
                                      </span>
                                    )}
                                    {expense.note && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        - {expense.note}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground text-sm">
                                    {createdAt
                                      .toLocaleTimeString("en-SG", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                        timeZone: "Asia/Singapore"
                                      })
                                      .toLowerCase()}
                                  </div>
                                </div>

                                {/* Amount - pushed to right */}
                                <div className="ml-auto flex-shrink-0 pr-2 text-right">
                                  {expense.originalCurrency &&
                                  expense.originalAmount ? (
                                    <>
                                      <div className="font-semibold text-[#8B0000]">
                                        -
                                        {formatBudgetCurrency(
                                          parseFloat(expense.amount)
                                        )}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        (
                                        {SUPPORTED_CURRENCIES[
                                          expense.originalCurrency as CurrencyCode
                                        ]?.symbol || ""}
                                        {parseFloat(
                                          expense.originalAmount
                                        ).toLocaleString("en-SG", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}{" "}
                                        {expense.originalCurrency})
                                      </div>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-[#8B0000]">
                                      -
                                      {formatBudgetCurrency(
                                        parseFloat(expense.amount)
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SwipeableExpenseRow>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

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
