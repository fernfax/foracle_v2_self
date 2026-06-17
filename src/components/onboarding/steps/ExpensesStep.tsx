"use client"

import { useEffect, useState } from "react"
import { getIncomes } from "@/actions/income"
import { createOnboardingExpenses } from "@/actions/onboarding"
import { Lightbulb } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WizardNavigation } from "@/components/onboarding/WizardNavigation"
import type {
  ExpenseSetupData,
  IncomeData
} from "@/app/onboarding/OnboardingWizard"

// Default expense categories with display info
const DEFAULT_CATEGORIES = [
  { name: "Housing", description: "Rent, mortgage, property tax" },
  { name: "Food", description: "Groceries, dining out" },
  { name: "Transportation", description: "Car, public transit, fuel" },
  { name: "Utilities", description: "Electricity, water, internet" },
  { name: "Healthcare", description: "Medical, dental, pharmacy" },
  { name: "Children", description: "Childcare, school fees, activities" },
  { name: "Entertainment", description: "Subscriptions, hobbies" },
  { name: "Allowances", description: "Parents, spouse, personal" },
  { name: "Vehicle", description: "Car loan, maintenance, fuel" },
  { name: "Shopping", description: "Clothing, electronics, household" }
]

// Weighted distribution for expense categories
const CATEGORY_WEIGHTS: Record<string, number> = {
  Housing: 30,
  Food: 20,
  Transportation: 15,
  Utilities: 10,
  Healthcare: 5,
  Children: 5,
  Entertainment: 5,
  Allowances: 5,
  Vehicle: 5,
  Shopping: 5
}

// Income frequency to monthly conversion
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  weekly: 4.33,
  "bi-weekly": 2.17,
  yearly: 1 / 12
}

interface ExpensesStepProps {
  income: IncomeData | null
  data: ExpenseSetupData | null
  onSave: (data: ExpenseSetupData) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function ExpensesStep({
  income,
  data,
  onSave,
  onNext,
  onBack,
  onSkip
}: ExpensesStepProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    data?.categories || []
  )
  const [percentageOfIncome, setPercentageOfIncome] = useState<string>(
    data?.percentageOfIncome?.toString() || "60"
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0)
  const [categoryAmounts, setCategoryAmounts] = useState<
    Record<string, string>
  >({})

  // Fetch income from database on mount
  useEffect(() => {
    async function fetchIncome() {
      try {
        const incomes = await getIncomes()
        if (incomes && incomes.length > 0) {
          // Calculate total monthly income from recurring income sources only (exclude one-time and bonuses)
          // For onboarding, only count income for the "Self" family member
          let total = 0
          for (const inc of incomes) {
            // Skip one-time income
            if (inc.frequency === "one-time") continue

            // Only include income for "Self" family member during onboarding
            if (inc.familyMember?.relationship !== "Self") continue

            // Only use base amount (not bonus)
            const amount = parseFloat(inc.amount) || 0
            const multiplier = FREQUENCY_MULTIPLIERS[inc.frequency] || 1
            total += amount * multiplier
          }
          setMonthlyIncome(total)
        }
      } catch (error) {
        console.error("Failed to fetch incomes:", error)
      }
    }
    fetchIncome()
  }, [])

  // Update form when data changes (e.g., navigating back)
  useEffect(() => {
    if (data) {
      setSelectedCategories(data.categories)
      setPercentageOfIncome(data.percentageOfIncome.toString())
    }
  }, [data])

  // Calculate distributed amounts when percentage or income changes
  const calculateDistributedAmounts = (
    categories: string[],
    totalExpense: number
  ) => {
    if (categories.length === 0 || totalExpense === 0) return {}

    const totalWeight = categories.reduce(
      (sum, cat) => sum + (CATEGORY_WEIGHTS[cat] || 5),
      0
    )
    const amounts: Record<string, string> = {}

    for (const cat of categories) {
      const weight = CATEGORY_WEIGHTS[cat] || 5
      const proportion = weight / totalWeight
      // Round to nearest 10
      const amount = Math.round((totalExpense * proportion) / 10) * 10
      amounts[cat] = amount.toString()
    }

    return amounts
  }

  // Recalculate ALL category amounts when percentage, income, or selections change
  // This ensures total always equals the budget
  useEffect(() => {
    const totalExpense =
      (monthlyIncome * (parseFloat(percentageOfIncome) || 0)) / 100
    const newAmounts = calculateDistributedAmounts(
      selectedCategories,
      totalExpense
    )
    setCategoryAmounts(newAmounts)
  }, [selectedCategories, percentageOfIncome, monthlyIncome])

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    )
  }

  const updateCategoryAmount = (categoryName: string, amount: string) => {
    setCategoryAmounts((prev) => ({
      ...prev,
      [categoryName]: amount
    }))
  }

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      // If no categories selected, just skip
      onSkip()
      return
    }

    setIsSubmitting(true)
    try {
      const percentage = parseFloat(percentageOfIncome) || 60

      // Save expenses to database with custom amounts
      await createOnboardingExpenses({
        categories: selectedCategories,
        percentageOfIncome: percentage,
        monthlyIncome,
        categoryAmounts
      })

      // Save to wizard state
      onSave({
        categories: selectedCategories,
        percentageOfIncome: percentage
      })

      onNext()
    } catch (error) {
      console.error("Failed to save expenses:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed =
    selectedCategories.length > 0 && parseFloat(percentageOfIncome) > 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6">
        {/* Monthly Spending Percentage */}
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">Monthly Spending</h3>
            <p className="text-muted-foreground text-sm">
              What percentage of your monthly income typically goes towards
              these expenses?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">
              Percentage of Income for Expenses{" "}
              <span className="text-[#8B0000]">*</span>
            </Label>
            <div className="relative">
              <Input
                id="percentage"
                type="number"
                placeholder="60"
                value={percentageOfIncome}
                onChange={(e) => setPercentageOfIncome(e.target.value)}
                className="bg-background pr-8"
                min="0"
                max="100"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                %
              </span>
            </div>
            <p className="text-foreground mt-2 text-sm font-medium">
              $
              {(
                (monthlyIncome * (parseFloat(percentageOfIncome) || 0)) /
                100
              ).toLocaleString("en-SG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              <span className="text-muted-foreground font-normal">
                {" "}
                / $
                {monthlyIncome.toLocaleString("en-SG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </p>
            <p className="text-muted-foreground text-xs">
              We&apos;ll use this to estimate your monthly expenses across the
              selected categories
            </p>
          </div>
        </div>

        {/* Expenditure Categories */}
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">Expense Categories</h3>
            <p className="text-muted-foreground text-sm">
              Select all categories that apply to your monthly spending.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.name)
              return (
                <div
                  key={category.name}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border"
                  }`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCategory(category.name)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {category.description}
                      </p>
                    </div>
                  </label>
                  {isSelected && (
                    <div className="relative w-32 shrink-0">
                      <span className="text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <Input
                        type="text"
                        value={categoryAmounts[category.name] || ""}
                        readOnly
                        disabled
                        className="text-foreground/400 bg-background h-8 cursor-default pl-6 text-sm disabled:opacity-100"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Customize Later Info Box */}
        <div className="flex gap-3 rounded-xl border border-[rgba(184,98,42,0.25)] bg-[rgba(184,98,42,0.06)] p-4 dark:border-[rgba(184,98,42,0.25)]/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(184,98,42,0.10)] dark:bg-[#B8622A]/40">
            <Lightbulb className="h-4 w-4 text-[#7A5A00]" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Customize Later
            </p>
            <p className="text-muted-foreground text-sm">
              Don&apos;t worry about getting the amounts perfect right now. You
              can add, delete, or change expenditure amounts after the initial
              setup.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={onBack}
        onNext={handleSubmit}
        isOptional
        onSkip={onSkip}
        canProceed={canProceed}
        isSubmitting={isSubmitting}
        nextLabel="Continue"
      />
    </div>
  )
}
