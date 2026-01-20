"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerBody,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
import { X } from "lucide-react";
import { formatBudgetCurrency, getDefaultCategoryIcon, getCategoryIconColor, getCategoryBgColor } from "@/lib/budget-utils";
import { deleteDailyExpense, type DailyExpense } from "@/lib/actions/daily-expenses";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency-utils";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { SwipeableExpenseRow } from "./swipeable-expense-row";

interface ExpenseHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: DailyExpense[];
  onEdit?: (expense: DailyExpense) => void;
  onDelete?: () => void;
}

// Helper to get Lucide icon component by name
function getIconComponent(categoryName: string) {
  const name = getDefaultCategoryIcon(categoryName);
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalCase];
  return IconComponent || LucideIcons.CircleDollarSign;
}

// Group expenses by date
function groupExpensesByDate(expenses: DailyExpense[]): Record<string, DailyExpense[]> {
  return expenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, DailyExpense[]>);
}

// Calculate total for a group of expenses
function calculateDayTotal(expenses: DailyExpense[]): number {
  return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
}

export function ExpenseHistoryModal({
  open,
  onOpenChange,
  expenses,
  onEdit,
  onDelete,
}: ExpenseHistoryModalProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await deleteDailyExpense(deleteId);
      onDelete?.();
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const groupedExpenses = groupExpensesByDate(expenses);
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

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
            <div className="flex items-center justify-between py-3 px-2 border-b">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold text-red-500">
                {formatBudgetCurrency(totalAmount)}
              </span>
            </div>

            {/* Expense List */}
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No expenses recorded this month.</p>
                <p className="text-sm mt-1">
                  Tap the + button to add your first expense.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedDates.map((date) => {
                  const dayExpenses = groupedExpenses[date];
                  const dayTotal = calculateDayTotal(dayExpenses);
                  const parsedDate = parseISO(date);

                  return (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="flex items-center justify-between py-3 px-2 bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">
                          {format(parsedDate, "EEE, MMM d")}
                        </span>
                        <span className="text-sm font-medium text-red-500">
                          OUT {formatBudgetCurrency(dayTotal)}
                        </span>
                      </div>

                      {/* Expenses for this date */}
                      <div className="divide-y">
                        {dayExpenses.map((expense) => {
                          const Icon = getIconComponent(expense.categoryName);
                          const iconColor = getCategoryIconColor(expense.categoryName);
                          const bgColor = getCategoryBgColor(expense.categoryName);
                          const createdAt = new Date(expense.createdAt);

                          return (
                            <SwipeableExpenseRow
                              key={expense.id}
                              onDelete={() => setDeleteId(expense.id)}
                              isOpen={swipedRowId === expense.id}
                              onSwipeStart={() => setSwipedRowId(expense.id)}
                            >
                              <div
                                className="flex items-center gap-3 py-3 px-2"
                                onClick={() => {
                                  onEdit?.(expense);
                                  onOpenChange(false);
                                }}
                              >
                                {/* Icon */}
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", bgColor)}>
                                  <Icon className={cn("h-5 w-5", iconColor)} />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">
                                    {expense.categoryName}
                                    {expense.subcategoryName && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}/ {expense.subcategoryName}
                                      </span>
                                    )}
                                    {expense.note && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}- {expense.note}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {createdAt.toLocaleTimeString("en-SG", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                      timeZone: "Asia/Singapore",
                                    }).toLowerCase()}
                                  </div>
                                </div>

                                {/* Amount - pushed to right */}
                                <div className="ml-auto text-right flex-shrink-0 pr-2">
                                  {expense.originalCurrency && expense.originalAmount ? (
                                    <>
                                      <div className="font-semibold text-red-500">
                                        -{formatBudgetCurrency(parseFloat(expense.amount))}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        ({SUPPORTED_CURRENCIES[expense.originalCurrency as CurrencyCode]?.symbol || ""}
                                        {parseFloat(expense.originalAmount).toLocaleString("en-SG", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} {expense.originalCurrency})
                                      </div>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-red-500">
                                      -{formatBudgetCurrency(parseFloat(expense.amount))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SwipeableExpenseRow>
                          );
                        })}
                      </div>
                    </div>
                  );
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
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
