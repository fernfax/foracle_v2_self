"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserIncomes, getUserExpenses } from "@/lib/actions/user";
import { IncomeBreakdownModal } from "@/components/income/income-breakdown-modal";
import { ExpenseBreakdownModal } from "@/components/expenses/expense-breakdown-modal";

export type SlideDirection = "left" | "right" | null;

interface DashboardHeaderProps {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  subjectToCpf: boolean | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember?: { id: string; name: string } | null;
  startDate: string;
  endDate?: string | null;
  pastIncomeHistory?: string | null;
  futureMilestones?: string | null;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  startDate: string | null;
  endDate: string | null;
  description?: string | null;
  isActive: boolean | null;
}

interface PastIncomeEntry {
  period: string;
  granularity: "yearly" | "monthly";
  amount: number;
  notes?: string;
}

interface FutureMilestone {
  id: string;
  targetMonth: string;
  amount: number;
  reason?: string;
  notes?: string;
}

export function DashboardHeader({ totalIncome, totalExpenses, netSavings }: DashboardHeaderProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    getUserIncomes().then((data) => setIncomes(data as Income[])).catch(console.error);
    getUserExpenses().then((data) => setExpenses(data as Expense[])).catch(console.error);
  }, []);

  // Helper to parse date strings as local dates
  const parseLocalDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Check if selected month is current month
  const isCurrentMonth = useCallback(() => {
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();
  }, [selectedMonth]);

  // Handle month change with animation
  const handleMonthChange = useCallback((newMonth: Date, direction: SlideDirection) => {
    setSlideDirection(direction);
    setSelectedMonth(newMonth);
    setTimeout(() => setSlideDirection(null), 360);
  }, []);

  const goToPreviousMonth = () => {
    handleMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1), "right");
  };

  const goToNextMonth = () => {
    handleMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1), "left");
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const direction = selectedMonth < currentMonth ? "left" : "right";
    handleMonthChange(currentMonth, direction);
  };

  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate income for a given month
  const calculateIncomeForMonth = useCallback((targetMonth: Date) => {
    const targetYear = targetMonth.getFullYear();
    const targetMonthNum = targetMonth.getMonth() + 1;
    const monthStart = new Date(targetYear, targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetYear, targetMonth.getMonth() + 1, 0);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isHistoricalMonth = monthStart < currentMonthStart;
    const isFutureMonth = monthStart > currentMonthStart;
    const targetPeriodMonthly = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
    const targetPeriodYearly = `${targetYear}`;

    let totalMonthlyIncome = 0;
    let totalCpfDeduction = 0;

    incomes.forEach((income) => {
      if (!income.isActive) return;

      let usedHistoricalData = false;
      let usedMilestoneData = false;

      if (isHistoricalMonth && income.pastIncomeHistory) {
        try {
          const history: PastIncomeEntry[] = JSON.parse(income.pastIncomeHistory);
          const monthlyEntry = history.find(h => h.granularity === 'monthly' && h.period === targetPeriodMonthly);
          if (monthlyEntry) {
            totalMonthlyIncome += monthlyEntry.amount;
            if (income.subjectToCpf && income.employeeCpfContribution) {
              const baseAmount = parseFloat(income.amount);
              const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
              totalCpfDeduction += monthlyEntry.amount * cpfRate;
            }
            usedHistoricalData = true;
          } else {
            const yearlyEntry = history.find(h => h.granularity === 'yearly' && h.period === targetPeriodYearly);
            if (yearlyEntry) {
              totalMonthlyIncome += yearlyEntry.amount / 12;
              if (income.subjectToCpf && income.employeeCpfContribution) {
                const baseAmount = parseFloat(income.amount);
                const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
                totalCpfDeduction += (yearlyEntry.amount / 12) * cpfRate;
              }
              usedHistoricalData = true;
            }
          }
        } catch { /* Fall through */ }
      }

      let hasFutureMilestones = false;
      let parsedMilestones: FutureMilestone[] = [];
      if (income.futureMilestones) {
        try {
          parsedMilestones = JSON.parse(income.futureMilestones);
          hasFutureMilestones = parsedMilestones.length > 0;
        } catch { /* ignore */ }
      }

      if (isFutureMonth && !usedHistoricalData && hasFutureMilestones) {
        const applicableMilestones = parsedMilestones
          .filter(m => m.targetMonth <= targetPeriodMonthly)
          .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));
        if (applicableMilestones.length > 0) {
          totalMonthlyIncome += applicableMilestones[0].amount;
          if (income.subjectToCpf && income.employeeCpfContribution) {
            const baseAmount = parseFloat(income.amount);
            const cpfRate = baseAmount > 0 ? parseFloat(income.employeeCpfContribution) / baseAmount : 0;
            totalCpfDeduction += applicableMilestones[0].amount * cpfRate;
          }
          usedMilestoneData = true;
        }
      }

      if (usedHistoricalData || usedMilestoneData) return;

      const startDate = parseLocalDate(income.startDate);
      const endDate = (income.endDate && !hasFutureMilestones) ? parseLocalDate(income.endDate) : null;
      const effectiveAmount = parseFloat(income.amount);

      if (startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      const frequency = income.frequency.toLowerCase();
      let appliesThisMonth = false;

      if (frequency === 'monthly') appliesThisMonth = true;
      else if (frequency === 'custom' && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch { appliesThisMonth = false; }
      }
      else if (frequency === 'yearly') appliesThisMonth = true;
      else if (frequency === 'weekly') appliesThisMonth = true;
      else if (frequency === 'bi-weekly') appliesThisMonth = true;
      else if (frequency === 'one-time') {
        const incomeMonth = startDate.getMonth() + 1;
        const incomeYear = startDate.getFullYear();
        appliesThisMonth = incomeMonth === targetMonthNum && incomeYear === targetYear;
      }

      if (appliesThisMonth) {
        let monthlyAmount = effectiveAmount;
        if (frequency === 'yearly') monthlyAmount = effectiveAmount / 12;
        else if (frequency === 'weekly') monthlyAmount = (effectiveAmount * 52) / 12;
        else if (frequency === 'bi-weekly') monthlyAmount = (effectiveAmount * 26) / 12;
        totalMonthlyIncome += monthlyAmount;

        if (income.subjectToCpf && income.employeeCpfContribution) {
          totalCpfDeduction += parseFloat(income.employeeCpfContribution);
        }
      }
    });

    return { gross: totalMonthlyIncome, cpfDeduction: totalCpfDeduction, net: totalMonthlyIncome - totalCpfDeduction };
  }, [incomes, parseLocalDate]);

  // Calculate expenses for a given month
  const calculateExpensesForMonth = useCallback((targetMonth: Date) => {
    const targetYear = targetMonth.getFullYear();
    const targetMonthNum = targetMonth.getMonth() + 1;
    const monthStart = new Date(targetYear, targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetYear, targetMonth.getMonth() + 1, 0);

    let totalMonthlyExpenses = 0;

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = expense.startDate ? new Date(expense.startDate) : null;
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      if (startDate && startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      let appliesThisMonth = false;
      const frequency = expense.frequency.toLowerCase();

      if (frequency === 'monthly') appliesThisMonth = true;
      else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch { appliesThisMonth = false; }
      }
      else if (frequency === 'one-time' && startDate) {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        appliesThisMonth = expenseMonth === targetMonthNum && expenseYear === targetYear;
      }

      if (appliesThisMonth) totalMonthlyExpenses += amount;
    });

    return totalMonthlyExpenses;
  }, [expenses]);

  // Calculate values for current and previous month
  const currentIncomeData = useMemo(() => calculateIncomeForMonth(selectedMonth), [calculateIncomeForMonth, selectedMonth]);
  const currentExpenses = useMemo(() => calculateExpensesForMonth(selectedMonth), [calculateExpensesForMonth, selectedMonth]);
  const currentSavings = currentIncomeData.net - currentExpenses;

  const previousMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1), [selectedMonth]);
  const prevIncomeData = useMemo(() => calculateIncomeForMonth(previousMonth), [calculateIncomeForMonth, previousMonth]);
  const prevExpenses = useMemo(() => calculateExpensesForMonth(previousMonth), [calculateExpensesForMonth, previousMonth]);
  const prevSavings = prevIncomeData.net - prevExpenses;

  // Calculate changes
  const incomeChange = currentIncomeData.net - prevIncomeData.net;
  const incomeChangePercent = prevIncomeData.net > 0 ? (incomeChange / prevIncomeData.net) * 100 : 0;
  const expenseChange = currentExpenses - prevExpenses;
  const expenseChangePercent = prevExpenses > 0 ? (expenseChange / prevExpenses) * 100 : 0;
  const savingsChange = currentSavings - prevSavings;
  const savingsChangePercent = prevSavings !== 0 ? (savingsChange / Math.abs(prevSavings)) * 100 : 0;

  // Use calculated values if data loaded, otherwise use props
  const displayIncome = incomes.length > 0 ? currentIncomeData.net : totalIncome;
  const displayGrossIncome = incomes.length > 0 ? currentIncomeData.gross : totalIncome;
  const displayExpenses = expenses.length > 0 ? currentExpenses : totalExpenses;
  const displaySavings = (incomes.length > 0 && expenses.length > 0) ? currentSavings : netSavings;
  const hasCpfDeductions = incomes.length > 0 && currentIncomeData.cpfDeduction > 0;
  const hasData = incomes.length > 0 && expenses.length > 0;

  const animationClass = slideDirection === "left" ? "animate-slide-left" : slideDirection === "right" ? "animate-slide-right" : "";

  return (
    <>
      <Card className="w-full" data-tour="primary-metrics">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-black">Monthly Overview</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Your income, expenses, and savings for the selected month
              </CardDescription>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-1" data-tour="month-nav">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPreviousMonth} disabled={isCurrentMonth()}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border min-w-[130px] sm:min-w-[150px] justify-center">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">{formatMonthDisplay(selectedMonth)}</span>
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Fixed height container for Current Month button */}
              <div className="h-6 flex items-center">
                {!isCurrentMonth() && (
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={goToCurrentMonth}>
                    Current Month
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Total Nett Income */}
            <div
              className="py-3 sm:py-0 sm:px-4 first:pt-0 last:pb-0 sm:first:pl-0 sm:last:pr-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg h-[90px]"
              onClick={() => setIsIncomeModalOpen(true)}
              data-tour="income-card"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Nett Income</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p key={selectedMonth.toISOString() + '-income'} className={`text-xl sm:text-2xl font-semibold tabular-nums transition-all duration-300 ${animationClass}`}>
                  ${displayIncome.toLocaleString()}
                </p>
              </div>
              <p className={`text-xs text-muted-foreground mt-1 ${hasCpfDeductions ? 'visible' : 'invisible'}`}>
                Gross: ${displayGrossIncome.toLocaleString()}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${hasData && incomeChange !== 0 ? 'visible' : 'invisible'} ${incomeChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {incomeChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{incomeChange > 0 ? "+" : ""}${Math.abs(incomeChange).toLocaleString()}</span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div
              className="py-3 sm:py-0 sm:px-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg h-[90px]"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Expenses</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-100">
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p key={selectedMonth.toISOString() + '-expenses'} className={`text-xl sm:text-2xl font-semibold tabular-nums transition-all duration-300 ${animationClass}`}>
                  ${displayExpenses.toLocaleString()}
                </p>
              </div>
              {/* Placeholder to match income column height */}
              <p className="text-xs text-muted-foreground mt-1 invisible">&nbsp;</p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${hasData && expenseChange !== 0 ? 'visible' : 'invisible'} ${expenseChange < 0 ? "text-emerald-600" : "text-red-500"}`}>
                {expenseChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>{expenseChange > 0 ? "+" : ""}${Math.abs(expenseChange).toLocaleString()}</span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>

            {/* Net Savings */}
            <div className="py-3 sm:py-0 sm:px-4 last:pb-0 sm:last:pr-0 h-[90px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Net Savings</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100">
                  <Wallet className="h-3.5 w-3.5 text-blue-600" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p key={selectedMonth.toISOString() + '-savings'} className={`text-xl sm:text-2xl font-semibold tabular-nums transition-all duration-300 ${displaySavings >= 0 ? "text-emerald-600" : "text-red-600"} ${animationClass}`}>
                  ${displaySavings.toLocaleString()}
                </p>
              </div>
              {/* Placeholder to match income column height */}
              <p className="text-xs text-muted-foreground mt-1 invisible">&nbsp;</p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${hasData && savingsChange !== 0 ? 'visible' : 'invisible'} ${savingsChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {savingsChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{savingsChange > 0 ? "+" : ""}${Math.abs(savingsChange).toLocaleString()}</span>
                {savingsChangePercent !== 0 && <span>({savingsChangePercent > 0 ? "+" : ""}{savingsChangePercent.toFixed(1)}%)</span>}
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <IncomeBreakdownModal
        open={isIncomeModalOpen}
        onOpenChange={setIsIncomeModalOpen}
        incomes={incomes}
        selectedMonth={selectedMonth}
      />
      <ExpenseBreakdownModal
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
        expenses={expenses}
        currentMonthTotal={displayExpenses}
        selectedMonth={selectedMonth}
      />
    </>
  );
}
