"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserIncomes, getUserExpenses } from "@/lib/actions/user";

type SlideDirection = "left" | "right" | null;

interface NetSavingsCardProps {
  netSavings: number;
  selectedMonth: Date;
  slideDirection: SlideDirection;
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
  familyMember?: {
    id: string;
    name: string;
  } | null;
  startDate: string;
  endDate?: string | null;
  futureMilestones?: string | null;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  isActive: boolean | null;
  startDate: string | null;
  endDate?: string | null;
}

export function NetSavingsCard({ netSavings, selectedMonth, slideDirection }: NetSavingsCardProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Helper to parse date strings as local dates (not UTC)
  const parseLocalDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Calculate income for a given month
  const calculateIncomeForMonth = useCallback((targetMonth: Date) => {
    const targetYear = targetMonth.getFullYear();
    const targetMonthNum = targetMonth.getMonth() + 1;
    const monthStart = new Date(targetYear, targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetYear, targetMonth.getMonth() + 1, 0);

    let totalMonthlyIncome = 0;

    incomes.forEach((income) => {
      if (!income.isActive) return;

      const startDate = parseLocalDate(income.startDate);
      const endDate = income.endDate ? parseLocalDate(income.endDate) : null;

      let effectiveAmount = parseFloat(income.amount);

      // Check for future milestones
      if (income.futureMilestones) {
        try {
          const milestones = JSON.parse(income.futureMilestones);
          const targetPeriod = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;

          // Find the most recent milestone that applies
          const applicableMilestones = milestones
            .filter((m: { targetMonth: string }) => m.targetMonth <= targetPeriod)
            .sort((a: { targetMonth: string }, b: { targetMonth: string }) => b.targetMonth.localeCompare(a.targetMonth));

          if (applicableMilestones.length > 0) {
            effectiveAmount = applicableMilestones[0].amount;
          }
        } catch {
          // Fall through to current amount
        }
      }

      if (startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      const frequency = income.frequency.toLowerCase();
      let appliesThisMonth = false;

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && income.customMonths) {
        try {
          const customMonths = JSON.parse(income.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'yearly') {
        appliesThisMonth = true;
      } else if (frequency === 'weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'bi-weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'one-time') {
        const incomeMonth = startDate.getMonth() + 1;
        const incomeYear = startDate.getFullYear();
        appliesThisMonth = incomeMonth === targetMonthNum && incomeYear === targetYear;
      }

      if (appliesThisMonth) {
        let monthlyAmount = effectiveAmount;
        if (frequency === 'yearly') {
          monthlyAmount = effectiveAmount / 12;
        } else if (frequency === 'weekly') {
          monthlyAmount = (effectiveAmount * 52) / 12;
        } else if (frequency === 'bi-weekly') {
          monthlyAmount = (effectiveAmount * 26) / 12;
        }
        totalMonthlyIncome += monthlyAmount;
      }
    });

    return totalMonthlyIncome;
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

      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? parseLocalDate(expense.startDate) : null;
      const endDate = expense.endDate ? parseLocalDate(expense.endDate) : null;

      // Skip check if no startDate - always valid
      if (startDate && startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      const frequency = expense.frequency.toLowerCase();
      let appliesThisMonth = false;

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'yearly') {
        appliesThisMonth = true;
      } else if (frequency === 'weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'bi-weekly') {
        appliesThisMonth = true;
      } else if (frequency === 'one-time' && startDate) {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        appliesThisMonth = expenseMonth === targetMonthNum && expenseYear === targetYear;
      }

      if (appliesThisMonth) {
        const amount = parseFloat(expense.amount);
        let monthlyAmount = amount;
        if (frequency === 'yearly') {
          monthlyAmount = amount / 12;
        } else if (frequency === 'weekly') {
          monthlyAmount = (amount * 52) / 12;
        } else if (frequency === 'bi-weekly') {
          monthlyAmount = (amount * 26) / 12;
        }
        totalMonthlyExpenses += monthlyAmount;
      }
    });

    return totalMonthlyExpenses;
  }, [expenses, parseLocalDate]);

  // Calculate current month values
  const currentMonthIncome = useMemo(() => calculateIncomeForMonth(selectedMonth), [calculateIncomeForMonth, selectedMonth]);
  const currentMonthExpenses = useMemo(() => calculateExpensesForMonth(selectedMonth), [calculateExpensesForMonth, selectedMonth]);

  // Calculate previous month values
  const previousMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1), [selectedMonth]);
  const previousMonthIncome = useMemo(() => calculateIncomeForMonth(previousMonth), [calculateIncomeForMonth, previousMonth]);
  const previousMonthExpenses = useMemo(() => calculateExpensesForMonth(previousMonth), [calculateExpensesForMonth, previousMonth]);

  // Calculate net savings change from previous month
  const monthChange = useMemo(() => {
    const currentNetSavings = currentMonthIncome - currentMonthExpenses;
    const previousNetSavings = previousMonthIncome - previousMonthExpenses;
    const change = currentNetSavings - previousNetSavings;
    const percentChange = previousNetSavings !== 0 ? (change / Math.abs(previousNetSavings)) * 100 : 0;
    return { amount: change, percent: percentChange };
  }, [currentMonthIncome, currentMonthExpenses, previousMonthIncome, previousMonthExpenses]);

  // Fetch data on component mount
  useEffect(() => {
    Promise.all([getUserIncomes(), getUserExpenses()])
      .then(([incomesData, expensesData]) => {
        setIncomes(incomesData as Income[]);
        setExpenses(expensesData as Expense[]);
      })
      .catch((error) => {
        console.error("Failed to fetch data:", error);
      });
  }, []);

  // Calculate net savings
  const displayAmount = incomes.length > 0 || expenses.length > 0
    ? currentMonthIncome - currentMonthExpenses
    : netSavings;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Net Savings
        </CardTitle>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
          <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <div
            key={selectedMonth.toISOString()}
            className={`text-3xl font-semibold tabular-nums transition-all duration-300 ${
              slideDirection === "left"
                ? "animate-slide-left"
                : slideDirection === "right"
                ? "animate-slide-right"
                : ""
            }`}
          >
            ${displayAmount.toLocaleString()}
          </div>
        </div>
        {(incomes.length > 0 || expenses.length > 0) && monthChange.amount !== 0 && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${
            monthChange.amount > 0 ? "text-emerald-600" : "text-red-500"
          }`}>
            {monthChange.amount > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {monthChange.amount > 0 ? "+" : ""}${Math.abs(monthChange.amount).toLocaleString()}
              {monthChange.percent !== 0 && ` (${monthChange.percent > 0 ? "+" : ""}${monthChange.percent.toFixed(1)}%)`}
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
