"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpenseBreakdownModal } from "@/components/expenses/expense-breakdown-modal";
import { getUserExpenses } from "@/lib/actions/user";

type SlideDirection = "left" | "right" | null;

interface TotalExpensesCardProps {
  totalExpenses: number;
  selectedMonth: Date;
  slideDirection: SlideDirection;
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

export function TotalExpensesCard({ totalExpenses, selectedMonth, slideDirection }: TotalExpensesCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null;
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Skip check if no startDate - always valid
      if (startDate && startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      let appliesThisMonth = false;
      const frequency = expense.frequency.toLowerCase();

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(targetMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'one-time' && startDate) {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        appliesThisMonth = expenseMonth === targetMonthNum && expenseYear === targetYear;
      }

      if (appliesThisMonth) {
        totalMonthlyExpenses += amount;
      }
    });

    return totalMonthlyExpenses;
  }, [expenses]);

  // Calculate current and previous month expenses
  const currentMonthExpenses = useMemo(() => calculateExpensesForMonth(selectedMonth), [calculateExpensesForMonth, selectedMonth]);

  const previousMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1), [selectedMonth]);
  const previousMonthExpenses = useMemo(() => calculateExpensesForMonth(previousMonth), [calculateExpensesForMonth, previousMonth]);

  // Calculate change from previous month
  const monthChange = useMemo(() => {
    const change = currentMonthExpenses - previousMonthExpenses;
    const percentChange = previousMonthExpenses > 0 ? (change / previousMonthExpenses) * 100 : 0;
    return { amount: change, percent: percentChange };
  }, [currentMonthExpenses, previousMonthExpenses]);

  // Fetch expenses on component mount to enable month navigation
  useEffect(() => {
    getUserExpenses()
      .then((data) => {
        setExpenses(data as Expense[]);
      })
      .catch((error) => {
        console.error("Failed to fetch expenses:", error);
      });
  }, []);

  // Use calculated amount if expenses loaded, otherwise use prop
  const displayAmount = expenses.length > 0 ? currentMonthExpenses : totalExpenses;

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsModalOpen(true)}
        data-tour="expenses-card"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Expenses
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
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
          {expenses.length > 0 && monthChange.amount !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              monthChange.amount < 0 ? "text-emerald-600" : "text-red-500"
            }`}>
              {monthChange.amount < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
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

      <ExpenseBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expenses={expenses}
        currentMonthTotal={displayAmount}
        selectedMonth={selectedMonth}
      />
    </>
  );
}
