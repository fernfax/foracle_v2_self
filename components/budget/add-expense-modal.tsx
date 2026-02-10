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
import { CurrencySelector } from "./currency-selector";
import { SubcategorySelector } from "./subcategory-selector";
import { ExpenseHistoryModal } from "./expense-history-modal";
import { addDailyExpense, updateDailyExpense, type DailyExpense } from "@/lib/actions/daily-expenses";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import type { ExpenseCategory } from "@/lib/actions/expense-categories";
import { getSubcategoriesByCategory, addSubcategory, updateSubcategory, deleteSubcategory, type ExpenseSubcategory } from "@/lib/actions/expense-subcategories";
import { SubcategoryManageModal } from "./subcategory-manage-modal";
import { AdjustBudgetModal } from "./adjust-budget-modal";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency-utils";
import { getExchangeRates } from "@/lib/actions/currency";

// Local storage key for persisting currency preference
const CURRENCY_PREFERENCE_KEY = "foracle_preferred_currency";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  budgetData: BudgetVsActual[];
  dailyExpenses: DailyExpense[];
  onSuccess?: () => void;
  editingExpense?: DailyExpense | null;
  preselectedCategoryName?: string | null;
  year?: number;
  month?: number;
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
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("0");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ExpenseSubcategory | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [adjustBudgetModalOpen, setAdjustBudgetModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("SGD");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [customRate, setCustomRate] = useState<number | undefined>(undefined);

  // Reset form when modal opens/closes or editing expense changes
  useEffect(() => {
    if (open) {
      if (editingExpense) {
        // If editing, use the original currency if it exists
        if (editingExpense.originalCurrency) {
          setSelectedCurrency(editingExpense.originalCurrency as CurrencyCode);
          setAmount(editingExpense.originalAmount || editingExpense.amount);
          setExchangeRate(parseFloat(editingExpense.exchangeRate || "1"));
        } else {
          setAmount(editingExpense.amount);
          setSelectedCurrency("SGD");
          setExchangeRate(1);
        }
        setNote(editingExpense.note || "");
        setDate(new Date(editingExpense.date));
        setCustomRate(undefined);
        // Find the matching category
        const category = categories.find(
          (c) => c.id === editingExpense.categoryId || c.name === editingExpense.categoryName
        );
        setSelectedCategory(category || null);
        // Reset subcategory - will be set after fetching
        setSelectedSubcategory(null);
      } else {
        setAmount("0");
        setNote("");
        setDate(new Date());
        setCustomRate(undefined);
        setSelectedSubcategory(null);
        setSubcategories([]);
        // Load saved currency preference from localStorage
        const savedCurrency = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
        if (savedCurrency && savedCurrency in SUPPORTED_CURRENCIES) {
          const currency = savedCurrency as CurrencyCode;
          setSelectedCurrency(currency);
          // Fetch actual exchange rate for non-SGD currencies
          if (currency !== "SGD") {
            getExchangeRates().then((rates) => {
              if (rates && rates.rates[currency]) {
                setExchangeRate(rates.rates[currency]);
              } else {
                setExchangeRate(1); // Fallback
              }
            });
          } else {
            setExchangeRate(1);
          }
        } else {
          setSelectedCurrency("SGD");
          setExchangeRate(1);
        }
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

  // Fetch subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      getSubcategoriesByCategory(selectedCategory.id).then((subs) => {
        setSubcategories(subs);
        // If editing and expense has a subcategory, select it
        if (editingExpense?.subcategoryId) {
          const matchingSub = subs.find((s) => s.id === editingExpense.subcategoryId);
          setSelectedSubcategory(matchingSub || null);
        }
      });
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  }, [selectedCategory, editingExpense?.subcategoryId]);

  // Get budget info for selected category
  const categoryBudget = selectedCategory
    ? budgetData.find((b) => b.categoryName === selectedCategory.name)
    : null;

  // Handle currency change
  const handleCurrencyChange = (currency: CurrencyCode, rate: number) => {
    setSelectedCurrency(currency);
    setExchangeRate(rate);
    // Save preference to localStorage
    localStorage.setItem(CURRENCY_PREFERENCE_KEY, currency);
  };

  // Calculate SGD amount based on current currency
  const enteredAmount = calculateExpressionTotal(amount);
  const sgdAmount = selectedCurrency === "SGD" ? enteredAmount : enteredAmount * exchangeRate;

  // Handle adding a new subcategory
  const handleAddSubcategory = async (name: string): Promise<ExpenseSubcategory> => {
    if (!selectedCategory) {
      throw new Error("No category selected");
    }
    const newSub = await addSubcategory(selectedCategory.id, name);
    setSubcategories((prev) => [...prev, newSub].sort((a, b) => a.name.localeCompare(b.name)));
    return newSub;
  };

  // Handle editing a subcategory
  const handleEditSubcategory = async (id: string, name: string): Promise<void> => {
    await updateSubcategory(id, name);
    setSubcategories((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, name } : sub)).sort((a, b) => a.name.localeCompare(b.name))
    );
    // Update selected subcategory if it was the one being edited
    if (selectedSubcategory?.id === id) {
      setSelectedSubcategory((prev) => (prev ? { ...prev, name } : null));
    }
  };

  // Handle deleting a subcategory
  const handleDeleteSubcategory = async (id: string): Promise<void> => {
    await deleteSubcategory(id);
    setSubcategories((prev) => prev.filter((sub) => sub.id !== id));
    // Clear selection if deleted subcategory was selected
    if (selectedSubcategory?.id === id) {
      setSelectedSubcategory(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || enteredAmount === 0) return;

    setIsSubmitting(true);
    try {
      const expenseData = {
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        subcategoryId: selectedSubcategory?.id,
        subcategoryName: selectedSubcategory?.name,
        amount: sgdAmount, // Always store SGD amount
        note: note || undefined,
        date: format(date, "yyyy-MM-dd"),
        // Only include currency info if not SGD
        ...(selectedCurrency !== "SGD" && {
          originalCurrency: selectedCurrency,
          originalAmount: enteredAmount,
          exchangeRate: exchangeRate,
        }),
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
          <DrawerTitle className="sr-only">
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </DrawerTitle>
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
          {/* Currency and Date selectors row */}
          <div className="flex justify-between items-start mb-4">
            {/* Currency Selector - Left side */}
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={handleCurrencyChange}
              customRate={customRate}
              onCustomRateChange={setCustomRate}
            />

            {/* Date Selector - Right side */}
            <div className="flex flex-col items-end">
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
              <span className="text-2xl text-muted-foreground">
                {SUPPORTED_CURRENCIES[selectedCurrency].symbol}
              </span>
              <span className="text-5xl font-bold tracking-tight">
                {enteredAmount.toLocaleString("en-SG", {
                  minimumFractionDigits: amount.includes(".") ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {/* Show SGD equivalent if foreign currency */}
            {selectedCurrency !== "SGD" && enteredAmount > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                = S${sgdAmount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Subcategory Selector - only show when category is selected */}
          {selectedCategory && (
            <div className="mt-4">
              <SubcategorySelector
                subcategories={subcategories}
                selectedSubcategory={selectedSubcategory}
                onSelect={setSelectedSubcategory}
                onManageClick={() => setSubcategoryModalOpen(true)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Budget Progress for Category */}
          {categoryBudget && (
            <div className="mt-6 space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                {formatBudgetCurrency(categoryBudget.spent + sgdAmount)} /{" "}
                {formatBudgetCurrency(categoryBudget.monthlyBudget)}
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    categoryBudget.percentUsed > 90
                      ? "bg-red-500"
                      : categoryBudget.percentUsed > 75
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      ((categoryBudget.spent + sgdAmount) /
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
                    categoryBudget.remaining - sgdAmount
                  )
                )}{" "}
                remaining (
                {Math.max(
                  0,
                  100 -
                    ((categoryBudget.spent + sgdAmount) /
                      categoryBudget.monthlyBudget) *
                      100
                ).toFixed(0)}
                %)
              </div>
              {/* Adjust Budget Button */}
              <div className="text-center pt-1">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary h-auto p-0"
                  onClick={() => setAdjustBudgetModalOpen(true)}
                >
                  + Adjust Budget
                </Button>
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

      {/* Subcategory Manage Modal */}
      {selectedCategory && (
        <SubcategoryManageModal
          open={subcategoryModalOpen}
          onOpenChange={setSubcategoryModalOpen}
          categoryName={selectedCategory.name}
          subcategories={subcategories}
          selectedSubcategory={selectedSubcategory}
          onSelect={setSelectedSubcategory}
          onAdd={handleAddSubcategory}
          onEdit={handleEditSubcategory}
          onDelete={handleDeleteSubcategory}
        />
      )}

      {/* Adjust Budget Modal */}
      {selectedCategory && (
        <AdjustBudgetModal
          open={adjustBudgetModalOpen}
          onOpenChange={setAdjustBudgetModalOpen}
          targetCategory={selectedCategory.name}
          budgetData={budgetData}
          year={year}
          month={month}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}
