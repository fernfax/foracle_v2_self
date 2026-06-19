"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getBudgetSummary,
  getBudgetVsActual
} from "@/actions/budget-calculator"
import type { BudgetVsActual } from "@/actions/budget-calculator"
import {
  getBudgetShiftsForMonth,
  type BudgetShift
} from "@/actions/budget-shifts"
import {
  getDailyExpensesForMonth,
  getDailySpendingByDay,
  getTodaySpending,
  type DailyExpense
} from "@/actions/daily-expenses"
import {
  getAllExpensesGroupedByCategory,
  getExpenseCategories,
  type ExpenseCategory,
  type ExpenseItem
} from "@/actions/expense-categories"
import {
  CalendarDays,
  Settings2,
  Target,
  TrendingUp,
  Wallet
} from "lucide-react"

import {
  formatBudgetCurrency,
  isCurrentMonth
} from "@/lib/finance/budget-utils"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import {
  AddExpenseModal,
  BudgetOverview,
  BudgetShiftHistory,
  CategoryGrid,
  DailySpendingGraphModal,
  ExpenseHistoryModal,
  ManageCategoriesModal,
  MonthNavigator,
  useAddExpense
} from "@/components/budget"
import { BudgetBreakdown } from "@/components/budget/budget-breakdown"
import { DailySpendingChart } from "@/components/budget/budget-daily-spending-chart"
import { RecentExpensesList } from "@/components/budget/budget-recent-expenses-list"
import { PageHeader } from "@/components/layout/layout-page-header"

interface BudgetClientProps {
  initialCategories: ExpenseCategory[]
  initialBudgetData: BudgetVsActual[]
  initialDailyExpenses: DailyExpense[]
  initialExpensesByCategory: Record<string, ExpenseItem[]>
  initialBudgetSummary: {
    totalBudget: number
    totalSpent: number
    remaining: number
    percentUsed: number
    dailyBudget: number
    expectedSpentByToday: number
    pacingStatus: "under" | "on-track" | "over"
    daysInMonth: number
    currentDay: number
  }
  initialTodaySpent: number
  initialBudgetShifts: BudgetShift[]
  initialYear: number
  initialMonth: number
}

export function BudgetClient({
  initialCategories,
  initialBudgetData,
  initialDailyExpenses,
  initialExpensesByCategory,
  initialBudgetSummary,
  initialTodaySpent,
  initialBudgetShifts,
  initialYear,
  initialMonth
}: BudgetClientProps) {
  // State
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [categories, setCategories] = useState(initialCategories)
  const [budgetData, setBudgetData] = useState(initialBudgetData)
  const [dailyExpenses, setDailyExpenses] = useState(initialDailyExpenses)
  const [expensesByCategory, setExpensesByCategory] = useState(
    initialExpensesByCategory
  )
  const [budgetSummary, setBudgetSummary] = useState(initialBudgetSummary)
  const [todaySpent, setTodaySpent] = useState(initialTodaySpent)
  const [budgetShifts, setBudgetShifts] = useState(initialBudgetShifts)
  const [_isLoading, setIsLoading] = useState(false)

  // Modal state
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(
    null
  )
  const [preselectedCategoryName, setPreselectedCategoryName] = useState<
    string | null
  >(null)

  // Daily spending graph modal state
  const [graphModalOpen, setGraphModalOpen] = useState(false)
  const [dailySpendingData, setDailySpendingData] = useState<
    { day: number; date: string; amount: number }[]
  >([])

  // Expense history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  // Manage categories modal state
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  // The add-expense FAB lives in budget/layout.tsx and signals intent through
  // the shared AddExpense context (rather than owning this page's rich modal
  // state). When it fires, open a fresh add modal here.
  const { isOpen: addFabOpen, closeModal: closeAddFab } = useAddExpense()
  useEffect(() => {
    if (addFabOpen) {
      setEditingExpense(null)
      setPreselectedCategoryName(null)
      setAddExpenseOpen(true)
    }
  }, [addFabOpen])

  // Auto-fetch daily spending data for inline chart
  useEffect(() => {
    if (dailySpendingData.length === 0) {
      getDailySpendingByDay(year, month).then(setDailySpendingData)
    }
  }, [year, month, dailySpendingData.length])

  // Fetch data for a specific month
  const fetchMonthData = useCallback(
    async (newYear: number, newMonth: number) => {
      setIsLoading(true)
      try {
        const [
          budgetResults,
          expensesResults,
          summaryResults,
          spendingResults,
          expensesByCategoryResults,
          shiftsResults
        ] = await Promise.all([
          getBudgetVsActual(newYear, newMonth),
          getDailyExpensesForMonth(newYear, newMonth),
          getBudgetSummary(newYear, newMonth),
          getDailySpendingByDay(newYear, newMonth),
          getAllExpensesGroupedByCategory(newYear, newMonth),
          getBudgetShiftsForMonth(newYear, newMonth)
        ])

        setBudgetData(budgetResults)
        setDailyExpenses(expensesResults)
        setBudgetSummary(summaryResults)
        setDailySpendingData(spendingResults)
        setExpensesByCategory(expensesByCategoryResults)
        setBudgetShifts(shiftsResults)

        // Only fetch today's spending if viewing current month
        if (isCurrentMonth(newYear, newMonth)) {
          const newTodaySpent = await getTodaySpending()
          setTodaySpent(newTodaySpent)
        } else {
          setTodaySpent(0)
        }
      } catch (error) {
        console.error("Error fetching month data:", error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Handle month change
  const handleMonthChange = useCallback(
    (newYear: number, newMonth: number) => {
      setYear(newYear)
      setMonth(newMonth)
      fetchMonthData(newYear, newMonth)
    },
    [fetchMonthData]
  )

  // Handle successful expense add/edit
  const handleExpenseSuccess = useCallback(() => {
    fetchMonthData(year, month)
    setEditingExpense(null)
  }, [fetchMonthData, year, month])

  // Handle edit
  const handleEdit = useCallback((expense: DailyExpense) => {
    setEditingExpense(expense)
    setAddExpenseOpen(true)
  }, [])

  // Handle delete refresh
  const handleDelete = useCallback(() => {
    fetchMonthData(year, month)
  }, [fetchMonthData, year, month])

  // Handle category card click - open modal with category preselected
  const handleCategoryClick = useCallback((categoryName: string) => {
    setEditingExpense(null)
    setPreselectedCategoryName(categoryName)
    setAddExpenseOpen(true)
  }, [])

  const handleAddCategory = useCallback(() => {
    setEditingExpense(null)
    setPreselectedCategoryName(null)
    setAddExpenseOpen(true)
  }, [])

  // Handle pacing card click - open daily spending graph modal
  const handlePacingClick = useCallback(async () => {
    const data = await getDailySpendingByDay(year, month)
    setDailySpendingData(data)
    setGraphModalOpen(true)
  }, [year, month])

  // Handle history icon click - open expense history modal
  const handleHistoryClick = useCallback(() => {
    setHistoryModalOpen(true)
  }, [])

  // Handle categories updated - refetch categories and budget data
  const handleCategoriesUpdated = useCallback(async () => {
    const [
      newCategories,
      newBudgetData,
      newBudgetSummary,
      newExpensesByCategory
    ] = await Promise.all([
      getExpenseCategories(),
      getBudgetVsActual(year, month),
      getBudgetSummary(year, month),
      getAllExpensesGroupedByCategory(year, month)
    ])
    setCategories(newCategories)
    setBudgetData(newBudgetData)
    setBudgetSummary(newBudgetSummary)
    setExpensesByCategory(newExpensesByCategory)
  }, [year, month])

  const isViewingCurrentMonth = isCurrentMonth(year, month)

  const pacingLabel =
    budgetSummary.pacingStatus === "under"
      ? "Under"
      : budgetSummary.pacingStatus === "over"
        ? "Overspending"
        : "On track"

  const pacingColor =
    budgetSummary.pacingStatus === "over"
      ? "text-alert"
      : budgetSummary.pacingStatus === "under"
        ? "text-on-success"
        : undefined

  // Memoized so AddExpenseModal receives a STABLE array reference. Passing a
  // fresh `.filter(...)` each render made the modal's open-init effect re-fire
  // on every parent re-render, resetting the amount field mid-typing.
  const modalCategories = useMemo(
    () =>
      categories.filter((c) =>
        budgetData.some((b) => b.categoryName === c.name)
      ),
    [categories, budgetData]
  )

  return (
    <div className="desktop:max-w-none desktop:px-0 desktop:pb-8 desktop:space-y-0 mx-auto max-w-lg space-y-4 pb-24">
      {/* ── MOBILE LAYOUT (unchanged) ── */}
      <div className="desktop:hidden space-y-4">
        <MonthNavigator
          year={year}
          month={month}
          onMonthChange={handleMonthChange}
        />

        {/* Budget vs actual card is desktop-only; intentionally omitted on mobile. */}

        {/* Row 1: Spending Overview + Daily Spending Chart */}
        <div data-tour="budget-overview" className="space-y-4">
          <BudgetOverview
            totalBudget={budgetSummary.totalBudget}
            totalSpent={budgetSummary.totalSpent}
            remaining={budgetSummary.remaining}
            percentUsed={budgetSummary.percentUsed}
            dailyBudget={budgetSummary.dailyBudget}
            todaySpent={isViewingCurrentMonth ? todaySpent : 0}
            expectedSpent={budgetSummary.expectedSpentByToday}
            pacingStatus={budgetSummary.pacingStatus}
            currentDay={budgetSummary.currentDay}
            month={month}
            showPacing={isViewingCurrentMonth}
            onPacingClick={
              isViewingCurrentMonth ? handlePacingClick : undefined
            }
            onHistoryClick={handleHistoryClick}
          />
        </div>

        {/* Row 2: Category Grid + Manage Categories + Budget Shift History */}
        <div className="space-y-4">
          <div data-tour="budget-categories" className="pt-2">
            <CategoryGrid
              budgetData={budgetData}
              onCategoryClick={handleCategoryClick}
            />
          </div>

          <div className="pt-4">
            <Button
              data-tour="budget-manage-categories-btn"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setManageCategoriesOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Manage Categories
            </Button>
          </div>

          <BudgetShiftHistory
            shifts={budgetShifts}
            onShiftDeleted={() => fetchMonthData(year, month)}
          />
        </div>

        {/* Add button lives in budget/layout.tsx (BudgetAddFab) and opens this
            modal via the shared AddExpense context — see the effect above. */}
      </div>

      {/* ── DESKTOP LAYOUT (read-only, data-rich) ── */}
      <div className="desktop:block hidden space-y-5">
        {/* Sticky page header with month navigator in actions */}
        <PageHeader
          title="Budget"
          actions={
            <MonthNavigator
              year={year}
              month={month}
              onMonthChange={handleMonthChange}
            />
          }
        />

        {/* 4-up stat band */}
        <div
          data-tour="budget-stat-band"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Spent This Month"
            value={formatBudgetCurrency(budgetSummary.totalSpent)}
            icon={Target}
            accent="brand"
            delta={`${budgetSummary.percentUsed.toFixed(0)}% of ${formatBudgetCurrency(budgetSummary.totalBudget)} budget`}
            deltaDirection={
              budgetSummary.percentUsed > 100
                ? "down"
                : budgetSummary.percentUsed > 85
                  ? "flat"
                  : "up"
            }
          />
          <StatCard
            label="Remaining"
            value={formatBudgetCurrency(Math.max(0, budgetSummary.remaining))}
            icon={Wallet}
            accent="teal"
            delta={`${Math.max(0, 100 - budgetSummary.percentUsed).toFixed(0)}% left · ${budgetSummary.daysInMonth - budgetSummary.currentDay} days to go`}
            deltaDirection={budgetSummary.remaining >= 0 ? "up" : "down"}
          />
          <StatCard
            label="Daily Pacing"
            value={<span className={pacingColor}>{pacingLabel}</span>}
            icon={TrendingUp}
            accent="jungle"
            delta={
              isViewingCurrentMonth
                ? `${formatBudgetCurrency(budgetSummary.totalSpent)} vs ${formatBudgetCurrency(budgetSummary.expectedSpentByToday)} expected`
                : undefined
            }
            deltaDirection="flat"
          />
          <StatCard
            label="Spent Today"
            value={formatBudgetCurrency(isViewingCurrentMonth ? todaySpent : 0)}
            icon={CalendarDays}
            accent="gold"
            delta={`of ${formatBudgetCurrency(budgetSummary.dailyBudget)} daily budget`}
            deltaDirection={
              isViewingCurrentMonth && todaySpent > budgetSummary.dailyBudget
                ? "down"
                : "up"
            }
          />
        </div>

        {/* 2-column main layout */}
        <div className="grid grid-cols-[1fr_380px] items-start gap-6">
          {/* Left: Budget vs Actual + Daily Spending Trend */}
          <div data-tour="budget-breakdown" className="space-y-4">
            <BudgetBreakdown
              budgetData={budgetData}
              year={year}
              month={month}
              onAdjustLimits={() => setManageCategoriesOpen(true)}
              onAddCategory={handleAddCategory}
              readOnly
            />
            <DailySpendingChart
              dailySpendingData={dailySpendingData}
              dailyBudget={budgetSummary.dailyBudget}
              month={month}
              year={year}
              gradientId="spendingGradient-desktop"
            />
          </div>

          {/* Right: Recent Expenses + Budget Adjustments */}
          <div data-tour="budget-recent" className="space-y-4">
            <RecentExpensesList
              expenses={dailyExpenses}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewAll={() => setHistoryModalOpen(true)}
              maxItems={10}
              readOnly
            />
            <BudgetShiftHistory
              shifts={budgetShifts}
              readOnly
              defaultExpanded
            />
          </div>
        </div>
      </div>

      {/* Modals — shared state, triggered from mobile layout */}
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={(open) => {
          setAddExpenseOpen(open)
          // Reset the context when the modal closes so the layout FAB can
          // re-open it (the open-on-true effect only fires on a fresh flip).
          if (!open) closeAddFab()
        }}
        categories={modalCategories}
        budgetData={budgetData}
        dailyExpenses={dailyExpenses}
        onSuccess={handleExpenseSuccess}
        editingExpense={editingExpense}
        preselectedCategoryName={preselectedCategoryName}
        year={year}
        month={month}
      />

      <DailySpendingGraphModal
        open={graphModalOpen}
        onOpenChange={setGraphModalOpen}
        dailySpendingData={dailySpendingData}
        dailyBudget={budgetSummary.dailyBudget}
        month={month}
        year={year}
      />

      <ExpenseHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        expenses={dailyExpenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ManageCategoriesModal
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        categories={categories}
        expensesByCategory={expensesByCategory}
        onSuccess={handleCategoriesUpdated}
      />
    </div>
  )
}
