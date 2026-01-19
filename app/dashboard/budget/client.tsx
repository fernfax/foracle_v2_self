"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MonthNavigator,
  BudgetOverview,
  CategoryGrid,
  AddExpenseModal,
  DailySpendingGraphModal,
  ExpenseHistoryModal,
  ManageCategoriesModal,
} from "@/components/budget";
import { getBudgetVsActual, getBudgetSummary } from "@/lib/actions/budget-calculator";
import { getDailyExpensesForMonth, getTodaySpending, getDailySpendingByDay, type DailyExpense } from "@/lib/actions/daily-expenses";
import { isCurrentMonth } from "@/lib/budget-utils";
import { getExpenseCategories, getAllExpensesGroupedByCategory, type ExpenseCategory, type ExpenseItem } from "@/lib/actions/expense-categories";
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
  initialYear,
  initialMonth,
}: BudgetClientProps) {
  const router = useRouter();

  // State
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [categories, setCategories] = useState(initialCategories);
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [dailyExpenses, setDailyExpenses] = useState(initialDailyExpenses);
  const [expensesByCategory, setExpensesByCategory] = useState(initialExpensesByCategory);
  const [budgetSummary, setBudgetSummary] = useState(initialBudgetSummary);
  const [todaySpent, setTodaySpent] = useState(initialTodaySpent);
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

  // Fetch data for a specific month
  const fetchMonthData = useCallback(async (newYear: number, newMonth: number) => {
    setIsLoading(true);
    try {
      const [newBudgetData, newDailyExpenses, newBudgetSummary] = await Promise.all([
        getBudgetVsActual(newYear, newMonth),
        getDailyExpensesForMonth(newYear, newMonth),
        getBudgetSummary(newYear, newMonth),
      ]);

      setBudgetData(newBudgetData);
      setDailyExpenses(newDailyExpenses);
      setBudgetSummary(newBudgetSummary);

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
      getAllExpensesGroupedByCategory(),
    ]);
    setCategories(newCategories);
    setBudgetData(newBudgetData);
    setBudgetSummary(newBudgetSummary);
    setExpensesByCategory(newExpensesByCategory);
  }, [year, month]);

  const isViewingCurrentMonth = isCurrentMonth(year, month);

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-4">
      {/* Month Navigator */}
      <MonthNavigator
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
      />

      {/* Budget Overview with Pacing */}
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

      {/* Category Grid */}
      <div className="pt-2">
        <CategoryGrid budgetData={budgetData} onCategoryClick={handleCategoryClick} />
      </div>

      {/* Manage Categories Button */}
      <div className="pt-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setManageCategoriesOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          Manage Categories
        </Button>
      </div>

      {/* Floating Add Button - Centered relative to content */}
      <div className="fixed bottom-28 md:bottom-8 left-0 md:left-[72px] right-0 z-40 pointer-events-none">
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
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        categories={categories}
        budgetData={budgetData}
        dailyExpenses={dailyExpenses}
        onSuccess={handleExpenseSuccess}
        editingExpense={editingExpense}
        preselectedCategoryName={preselectedCategoryName}
      />

      {/* Daily Spending Graph Modal */}
      <DailySpendingGraphModal
        open={graphModalOpen}
        onOpenChange={setGraphModalOpen}
        dailySpendingData={dailySpendingData}
        dailyBudget={budgetSummary.dailyBudget}
        month={month}
        year={year}
      />

      {/* Expense History Modal */}
      <ExpenseHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        expenses={dailyExpenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Manage Categories Modal */}
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
