"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Calendar, History } from "lucide-react";
import { ExpenseNumpad, calculateExpressionTotal } from "./expense-numpad";
import { CategorySelector } from "./category-selector";
import { ExpenseHistoryModal } from "./expense-history-modal";
import { addDailyExpense, updateDailyExpense, type DailyExpense } from "@/lib/actions/daily-expenses";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import type { ExpenseCategory } from "@/lib/actions/expense-categories";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  budgetData: BudgetVsActual[];
  dailyExpenses: DailyExpense[];
  onSuccess?: () => void;
  editingExpense?: DailyExpense | null;
  preselectedCategoryName?: string | null;
}

export function AddExpenseModal({
  open,
  onOpenChange,
  categories,
  budgetData,
  dailyExpenses,
  onSuccess,
  editingExpense,
  preselectedCategoryName,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("0");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Reset form when modal opens/closes or editing expense changes
  useEffect(() => {
    if (open) {
      if (editingExpense) {
        setAmount(editingExpense.amount);
        setNote(editingExpense.note || "");
        setDate(new Date(editingExpense.date));
        // Find the matching category
        const category = categories.find(
          (c) => c.id === editingExpense.categoryId || c.name === editingExpense.categoryName
        );
        setSelectedCategory(category || null);
      } else {
        setAmount("0");
        setNote("");
        setDate(new Date());
        // If a category is preselected, use it
        if (preselectedCategoryName) {
          const category = categories.find((c) => c.name === preselectedCategoryName);
          setSelectedCategory(category || null);
        } else {
          setSelectedCategory(null);
        }
      }
    }
  }, [open, editingExpense, categories, preselectedCategoryName]);

  // Get budget info for selected category
  const categoryBudget = selectedCategory
    ? budgetData.find((b) => b.categoryName === selectedCategory.name)
    : null;

  const handleSubmit = async () => {
    const total = calculateExpressionTotal(amount);
    if (!selectedCategory || total === 0) return;

    setIsSubmitting(true);
    try {
      const expenseData = {
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        amount: total,
        note: note || undefined,
        date: format(date, "yyyy-MM-dd"),
      };

      if (editingExpense) {
        await updateDailyExpense(editingExpense.id, expenseData);
      } else {
        await addDailyExpense(expenseData);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {/* Header */}
        <DrawerHeader>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
          <div className="flex-1 flex justify-center">
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setHistoryModalOpen(true)}
          >
            <History className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {/* Amount Display */}
        <div className="px-6 py-6 flex-1 flex flex-col">
          {/* Date Selector - Inline expandable for mobile compatibility */}
          <div className="flex flex-col items-end mb-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-primary touch-manipulation"
              onClick={() => setCalendarOpen(!calendarOpen)}
            >
              <Calendar className="h-4 w-4" />
              {isToday ? "Today" : format(date, "d MMM")}
            </Button>

            {/* Inline Calendar - expands below button */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                calendarOpen ? "max-h-[350px] mt-2" : "max-h-0"
              )}
            >
              <div className="border rounded-md bg-background shadow-md">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(d) => d > new Date()}
                />
              </div>
            </div>
          </div>

          {/* Amount - centered in available space */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Show expression breakdown when multiple numbers */}
            {amount.includes("+") && (
              <div className="text-sm text-muted-foreground mb-1">
                {amount.replace(/\+/g, " + ")}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl text-muted-foreground">S$</span>
              <span className="text-5xl font-bold tracking-tight">
                {calculateExpressionTotal(amount).toLocaleString("en-SG", {
                  minimumFractionDigits: amount.includes(".") ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Budget Progress for Category */}
          {categoryBudget && (
            <div className="mt-6 space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                {formatBudgetCurrency(categoryBudget.spent + calculateExpressionTotal(amount))} /{" "}
                {formatBudgetCurrency(categoryBudget.monthlyBudget)}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    categoryBudget.percentUsed > 90
                      ? "bg-destructive"
                      : categoryBudget.percentUsed > 75
                      ? "bg-yellow-500"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(
                      ((categoryBudget.spent + calculateExpressionTotal(amount)) /
                        categoryBudget.monthlyBudget) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {formatBudgetCurrency(
                  Math.max(
                    0,
                    categoryBudget.remaining - calculateExpressionTotal(amount)
                  )
                )}{" "}
                remaining (
                {Math.max(
                  0,
                  100 -
                    ((categoryBudget.spent + calculateExpressionTotal(amount)) /
                      categoryBudget.monthlyBudget) *
                      100
                ).toFixed(0)}
                %)
              </div>
            </div>
          )}
        </div>

        {/* Note Input */}
        <div className="px-6 pb-4">
          <Input
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-muted/50"
          />
        </div>

        {/* Numpad */}
        <div className="px-4 pb-10">
          <ExpenseNumpad
            value={amount}
            onChange={setAmount}
            onSubmit={handleSubmit}
            disabled={isSubmitting}
            submitDisabled={isSubmitting || !selectedCategory}
          />
        </div>
      </DrawerContent>

      {/* Expense History Modal - filtered by selected category */}
      <ExpenseHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        expenses={
          selectedCategory
            ? dailyExpenses.filter((e) => e.categoryName === selectedCategory.name)
            : dailyExpenses
        }
      />
    </Drawer>
  );
}
