"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Settings2, Target, Wallet, TrendingUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  MonthNavigator,
  BudgetOverview,
  CategoryGrid,
  AddExpenseModal,
  DailySpendingGraphModal,
  ExpenseHistoryModal,
  ManageCategoriesModal,
  BudgetShiftHistory,
} from "@/components/budget";
import { DailySpendingChart } from "@/components/budget/daily-spending-chart";
import { RecentExpensesList } from "@/components/budget/recent-expenses-list";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import { getBudgetVsActual, getBudgetSummary } from "@/lib/actions/budget-calculator";
import { getDailyExpensesForMonth, getTodaySpending, getDailySpendingByDay, type DailyExpense } from "@/lib/actions/daily-expenses";
import { isCurrentMonth, formatBudgetCurrency } from "@/lib/budget-utils";
import { getExpenseCategories, getAllExpensesGroupedByCategory, type ExpenseCategory, type ExpenseItem } from "@/lib/actions/expense-categories";
import { getBudgetShiftsForMonth, type BudgetShift } from "@/lib/actions/budget-shifts";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";

interface BudgetClientProps {
  initialCategories: ExpenseCategory[];
  initialBudgetData: BudgetVsActual[];
  initialDailyExpenses: DailyExpense[];
  initialExpensesByCategory: Record<string, ExpenseItem[]>;
  initialBudgetSummary: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    percentUsed: number;
    dailyBudget: number;
    expectedSpentByToday: number;
    pacingStatus: "under" | "on-track" | "over";
    daysInMonth: number;
    currentDay: number;
  };
  initialTodaySpent: number;
  initialBudgetShifts: BudgetShift[];
  initialYear: number;
  initialMonth: number;
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
  initialMonth,
}: BudgetClientProps) {
  // State
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [categories, setCategories] = useState(initialCategories);
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [dailyExpenses, setDailyExpenses] = useState(initialDailyExpenses);
  const [expensesByCategory, setExpensesByCategory] = useState(initialExpensesByCategory);
  const [budgetSummary, setBudgetSummary] = useState(initialBudgetSummary);
  const [todaySpent, setTodaySpent] = useState(initialTodaySpent);
  const [budgetShifts, setBudgetShifts] = useState(initialBudgetShifts);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [preselectedCategoryName, setPreselectedCategoryName] = useState<string | null>(null);

  // Daily spending graph modal state
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [dailySpendingData, setDailySpendingData] = useState<{ day: number; date: string; amount: number }[]>([]);

  // Expense history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Manage categories modal state
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  // Track when the component is mounted on the client so we can portal the
  // floating "+" button to <body>. The button must escape an ancestor with
  // `contain: layout paint` (in DashboardShell) — that property creates a
  // containing block and would otherwise pin `position: fixed` to it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Auto-fetch daily spending data for inline chart
  useEffect(() => {
    if (dailySpendingData.length === 0) {
      getDailySpendingByDay(year, month).then(setDailySpendingData);
    }
  }, [year, month, dailySpendingData.length]);

  // Fetch data for a specific month
  const fetchMonthData = useCallback(async (newYear: number, newMonth: number) => {
    setIsLoading(true);
    try {
      const [budgetResults, expensesResults, summaryResults, spendingResults, expensesByCategoryResults, shiftsResults] = await Promise.all([
        getBudgetVsActual(newYear, newMonth),
        getDailyExpensesForMonth(newYear, newMonth),
        getBudgetSummary(newYear, newMonth),
        getDailySpendingByDay(newYear, newMonth),
        getAllExpensesGroupedByCategory(newYear, newMonth),
        getBudgetShiftsForMonth(newYear, newMonth),
      ]);

      setBudgetData(budgetResults);
      setDailyExpenses(expensesResults);
      setBudgetSummary(summaryResults);
      setDailySpendingData(spendingResults);
      setExpensesByCategory(expensesByCategoryResults);
      setBudgetShifts(shiftsResults);

      // Only fetch today's spending if viewing current month
      if (isCurrentMonth(newYear, newMonth)) {
        const newTodaySpent = await getTodaySpending();
        setTodaySpent(newTodaySpent);
      } else {
        setTodaySpent(0);
      }
    } catch (error) {
      console.error("Error fetching month data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle month change
  const handleMonthChange = useCallback(
    (newYear: number, newMonth: number) => {
      setYear(newYear);
      setMonth(newMonth);
      fetchMonthData(newYear, newMonth);
    },
    [fetchMonthData]
  );

  // Handle successful expense add/edit
  const handleExpenseSuccess = useCallback(() => {
    fetchMonthData(year, month);
    setEditingExpense(null);
  }, [fetchMonthData, year, month]);

  // Handle edit
  const handleEdit = useCallback((expense: DailyExpense) => {
    setEditingExpense(expense);
    setAddExpenseOpen(true);
  }, []);

  // Handle delete refresh
  const handleDelete = useCallback(() => {
    fetchMonthData(year, month);
  }, [fetchMonthData, year, month]);

  // Handle category card click - open modal with category preselected
  const handleCategoryClick = useCallback((categoryName: string) => {
    setEditingExpense(null);
    setPreselectedCategoryName(categoryName);
    setAddExpenseOpen(true);
  }, []);

  const handleAddCategory = useCallback(() => {
    setEditingExpense(null);
    setPreselectedCategoryName(null);
    setAddExpenseOpen(true);
  }, []);

  // Handle pacing card click - open daily spending graph modal
  const handlePacingClick = useCallback(async () => {
    const data = await getDailySpendingByDay(year, month);
    setDailySpendingData(data);
    setGraphModalOpen(true);
  }, [year, month]);

  // Handle history icon click - open expense history modal
  const handleHistoryClick = useCallback(() => {
    setHistoryModalOpen(true);
  }, []);

  // Handle categories updated - refetch categories and budget data
  const handleCategoriesUpdated = useCallback(async () => {
    const [newCategories, newBudgetData, newBudgetSummary, newExpensesByCategory] = await Promise.all([
      getExpenseCategories(),
      getBudgetVsActual(year, month),
      getBudgetSummary(year, month),
      getAllExpensesGroupedByCategory(year, month),
    ]);
    setCategories(newCategories);
    setBudgetData(newBudgetData);
    setBudgetSummary(newBudgetSummary);
    setExpensesByCategory(newExpensesByCategory);
  }, [year, month]);

  const isViewingCurrentMonth = isCurrentMonth(year, month);

  const pacingLabel =
    budgetSummary.pacingStatus === "under"
      ? "Under"
      : budgetSummary.pacingStatus === "over"
      ? "Overspending"
      : "On track";

  const pacingColor =
    budgetSummary.pacingStatus === "over"
      ? "text-[#E05555]"
      : budgetSummary.pacingStatus === "under"
      ? "text-[#007A68]"
      : undefined;

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-4 desktop:max-w-none desktop:px-0 desktop:pb-8 desktop:space-y-0">

      {/* ── MOBILE LAYOUT (unchanged) ── */}
      <div className="desktop:hidden space-y-4">
        <MonthNavigator year={year} month={month} onMonthChange={handleMonthChange} />

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
            onPacingClick={isViewingCurrentMonth ? handlePacingClick : undefined}
            onHistoryClick={handleHistoryClick}
          />
        </div>

        {/* Row 2: Category Grid + Manage Categories + Budget Shift History */}
        <div className="space-y-4">
          <div data-tour="budget-categories" className="pt-2">
            <CategoryGrid budgetData={budgetData} onCategoryClick={handleCategoryClick} />
          </div>

          <div className="pt-4">
            <Button
              data-tour="budget-manage-categories-btn"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setManageCategoriesOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              Manage Categories
            </Button>
          </div>

          <BudgetShiftHistory
            shifts={budgetShifts}
            onShiftDeleted={() => fetchMonthData(year, month)}
          />
        </div>

        {/* Floating Add Button — mobile only, portaled to <body> */}
        {mounted &&
          createPortal(
            <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 pointer-events-none">
              <div className="max-w-lg mx-auto flex justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full w-14 h-14 shadow-lg pointer-events-auto bg-background/95 backdrop-blur-sm hover:bg-accent transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-4"
                  onClick={() => {
                    setEditingExpense(null);
                    setPreselectedCategoryName(null);
                    setAddExpenseOpen(true);
                  }}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* ── DESKTOP LAYOUT (read-only, data-rich) ── */}
      <div className="hidden desktop:block space-y-5">
        {/* Sticky page header with month navigator in actions */}
        <PageHeader
          title="Budget"
          actions={
            <MonthNavigator year={year} month={month} onMonthChange={handleMonthChange} />
          }
        />

        {/* 4-up stat band */}
        <div data-tour="budget-stat-band" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              isViewingCurrentMonth && todaySpent > budgetSummary.dailyBudget ? "down" : "up"
            }
          />
        </div>

        {/* 2-column main layout */}
        <div className="grid grid-cols-[1fr_380px] gap-6 items-start">

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
        onOpenChange={setAddExpenseOpen}
        categories={categories.filter(c =>
          budgetData.some(b => b.categoryName === c.name)
        )}
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
  );
}
