"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Calendar, History, X } from "lucide-react"

import type { BudgetVsActual } from "@/lib/actions/budget-calculator"
import { getExchangeRates } from "@/lib/actions/currency"
import {
  addDailyExpense,
  updateDailyExpense,
  type DailyExpense
} from "@/lib/actions/daily-expenses"
import type { ExpenseCategory } from "@/lib/actions/expense-categories"
import {
  addSubcategory,
  deleteSubcategory,
  getSubcategoriesByCategory,
  updateSubcategory,
  type ExpenseSubcategory
} from "@/lib/actions/expense-subcategories"
import { formatBudgetCurrency } from "@/lib/budget-utils"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

import { AdjustBudgetModal } from "./adjust-budget-modal"
import { CategorySelector } from "./category-selector"
import { CurrencySelector } from "./currency-selector"
import { ExpenseHistoryModal } from "./expense-history-modal"
import { calculateExpressionTotal, ExpenseNumpad } from "./expense-numpad"
import { SubcategoryManageModal } from "./subcategory-manage-modal"
import { SubcategorySelector } from "./subcategory-selector"

// Local storage key for persisting currency preference
const CURRENCY_PREFERENCE_KEY = "foracle_preferred_currency"

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ExpenseCategory[]
  budgetData: BudgetVsActual[]
  dailyExpenses: DailyExpense[]
  onSuccess?: () => void
  editingExpense?: DailyExpense | null
  preselectedCategoryName?: string | null
  year?: number
  month?: number
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
  month = new Date().getMonth() + 1
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("0")
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null)
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<ExpenseSubcategory | null>(null)
  const [note, setNote] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false)
  const [adjustBudgetModalOpen, setAdjustBudgetModalOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("SGD")
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [customRate, setCustomRate] = useState<number | undefined>(undefined)

  // Initialize the form ONLY on the open transition (false→true). This used to
  // re-run on every change of its deps — and `categories` arrives as a fresh
  // `.filter(...)` array on each parent render, so any re-render while the user
  // was typing re-ran this and reset `amount` back to "0" (the "my number
  // disappears when I type fast" bug). Gating on the transition makes prop churn
  // harmless; the values read here are already settled when the drawer opens.
  const prevOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open
    if (!justOpened) return
    if (open) {
      if (editingExpense) {
        // If editing, use the original currency if it exists
        if (editingExpense.originalCurrency) {
          setSelectedCurrency(editingExpense.originalCurrency as CurrencyCode)
          setAmount(editingExpense.originalAmount || editingExpense.amount)
          setExchangeRate(parseFloat(editingExpense.exchangeRate || "1"))
        } else {
          setAmount(editingExpense.amount)
          setSelectedCurrency("SGD")
          setExchangeRate(1)
        }
        setNote(editingExpense.note || "")
        setDate(new Date(editingExpense.date))
        setCustomRate(undefined)
        // Find the matching category
        const category = categories.find(
          (c) =>
            c.id === editingExpense.categoryId ||
            c.name === editingExpense.categoryName
        )
        setSelectedCategory(category || null)
        // Reset subcategory - will be set after fetching
        setSelectedSubcategory(null)
      } else {
        setAmount("0")
        setNote("")
        setDate(new Date())
        setCustomRate(undefined)
        setSelectedSubcategory(null)
        setSubcategories([])
        // Load saved currency preference from localStorage
        const savedCurrency = localStorage.getItem(CURRENCY_PREFERENCE_KEY)
        if (savedCurrency && savedCurrency in SUPPORTED_CURRENCIES) {
          const currency = savedCurrency as CurrencyCode
          setSelectedCurrency(currency)
          // Fetch actual exchange rate for non-SGD currencies
          if (currency !== "SGD") {
            getExchangeRates().then((rates) => {
              if (rates && rates.rates[currency]) {
                setExchangeRate(rates.rates[currency])
              } else {
                setExchangeRate(1) // Fallback
              }
            })
          } else {
            setExchangeRate(1)
          }
        } else {
          setSelectedCurrency("SGD")
          setExchangeRate(1)
        }
        // If a category is preselected, use it
        if (preselectedCategoryName) {
          const category = categories.find(
            (c) => c.name === preselectedCategoryName
          )
          setSelectedCategory(category || null)
        } else {
          setSelectedCategory(null)
        }
      }
    }
  }, [open, editingExpense, categories, preselectedCategoryName])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      getSubcategoriesByCategory(selectedCategory.id).then((subs) => {
        setSubcategories(subs)
        // If editing and expense has a subcategory, select it
        if (editingExpense?.subcategoryId) {
          const matchingSub = subs.find(
            (s) => s.id === editingExpense.subcategoryId
          )
          setSelectedSubcategory(matchingSub || null)
        }
      })
    } else {
      setSubcategories([])
      setSelectedSubcategory(null)
    }
  }, [selectedCategory, editingExpense?.subcategoryId])

  // Get budget info for selected category
  const categoryBudget = selectedCategory
    ? budgetData.find((b) => b.categoryName === selectedCategory.name)
    : null

  // Handle currency change
  const handleCurrencyChange = (currency: CurrencyCode, rate: number) => {
    setSelectedCurrency(currency)
    setExchangeRate(rate)
    // Save preference to localStorage
    localStorage.setItem(CURRENCY_PREFERENCE_KEY, currency)
  }

  // Calculate SGD amount based on current currency
  const enteredAmount = calculateExpressionTotal(amount)
  const sgdAmount =
    selectedCurrency === "SGD" ? enteredAmount : enteredAmount * exchangeRate

  // Handle adding a new subcategory
  const handleAddSubcategory = async (
    name: string
  ): Promise<ExpenseSubcategory> => {
    if (!selectedCategory) {
      throw new Error("No category selected")
    }
    const newSub = await addSubcategory(selectedCategory.id, name)
    setSubcategories((prev) =>
      [...prev, newSub].sort((a, b) => a.name.localeCompare(b.name))
    )
    return newSub
  }

  // Handle editing a subcategory
  const handleEditSubcategory = async (
    id: string,
    name: string
  ): Promise<void> => {
    await updateSubcategory(id, name)
    setSubcategories((prev) =>
      prev
        .map((sub) => (sub.id === id ? { ...sub, name } : sub))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    // Update selected subcategory if it was the one being edited
    if (selectedSubcategory?.id === id) {
      setSelectedSubcategory((prev) => (prev ? { ...prev, name } : null))
    }
  }

  // Handle deleting a subcategory
  const handleDeleteSubcategory = async (id: string): Promise<void> => {
    await deleteSubcategory(id)
    setSubcategories((prev) => prev.filter((sub) => sub.id !== id))
    // Clear selection if deleted subcategory was selected
    if (selectedSubcategory?.id === id) {
      setSelectedSubcategory(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedCategory || enteredAmount === 0) return

    setIsSubmitting(true)
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
          exchangeRate: exchangeRate
        })
      }

      if (editingExpense) {
        await updateDailyExpense(editingExpense.id, expenseData)
      } else {
        await addDailyExpense(expenseData)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error saving expense:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isToday =
    format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {/* Header */}
        <DrawerHeader>
          <DrawerTitle className="sr-only">
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
          <div className="flex flex-1 justify-center">
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
            onClick={() => setHistoryModalOpen(true)}>
            <History className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {/* Amount Display */}
        <div className="flex flex-1 flex-col px-6 py-6">
          {/* Currency and Date selectors row */}
          <div className="mb-4 flex items-start justify-between">
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
                className="text-primary touch-manipulation gap-2"
                onClick={() => setCalendarOpen(!calendarOpen)}>
                <Calendar className="h-4 w-4" />
                {isToday ? "Today" : format(date, "d MMM")}
              </Button>

              {/* Inline Calendar - expands below button */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  calendarOpen ? "mt-2 max-h-[350px]" : "max-h-0"
                )}>
                <div className="bg-background rounded-md border shadow-md">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d)
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={(d) => d > new Date()}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Amount - centered in available space */}
          <div className="flex flex-1 flex-col items-center justify-center">
            {/* Show expression breakdown when multiple numbers */}
            {amount.includes("+") && (
              <div className="text-muted-foreground mb-1 text-sm">
                {amount.replace(/\+/g, " + ")}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground text-2xl">
                {SUPPORTED_CURRENCIES[selectedCurrency].symbol}
              </span>
              <span className="text-5xl font-bold tracking-tight">
                {enteredAmount.toLocaleString("en-SG", {
                  minimumFractionDigits: amount.includes(".") ? 2 : 0,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            {/* Show SGD equivalent if foreign currency */}
            {selectedCurrency !== "SGD" && enteredAmount > 0 && (
              <div className="text-muted-foreground mt-1 text-sm">
                = S$
                {sgdAmount.toLocaleString("en-SG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
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
              <div className="text-muted-foreground text-center text-sm">
                {formatBudgetCurrency(categoryBudget.spent + sgdAmount)} /{" "}
                {formatBudgetCurrency(categoryBudget.monthlyBudget)}
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className={`h-full transition-all ${
                    categoryBudget.percentUsed > 90
                      ? "bg-destructive"
                      : categoryBudget.percentUsed > 75
                        ? "bg-[#D4A843]"
                        : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(
                      ((categoryBudget.spent + sgdAmount) /
                        categoryBudget.monthlyBudget) *
                        100,
                      100
                    )}%`
                  }}
                />
              </div>
              <div className="text-muted-foreground text-center text-xs">
                {formatBudgetCurrency(
                  Math.max(0, categoryBudget.remaining - sgdAmount)
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
              <div className="pt-1 text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
                  onClick={() => setAdjustBudgetModalOpen(true)}>
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
            ? dailyExpenses.filter(
                (e) => e.categoryName === selectedCategory.name
              )
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
  )
}
