"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpenseBreakdownModal } from "@/components/expenses/expense-breakdown-modal";
import { getUserExpenses } from "@/lib/actions/user";

interface TotalExpensesCardProps {
  totalExpenses: number;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  startDate: string;
  endDate: string | null;
  description?: string | null;
  isActive: boolean | null;
}

export function TotalExpensesCard({ totalExpenses }: TotalExpensesCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Month navigation state (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Month navigation handlers
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate current month expenses based on selected month
  const currentMonthExpenses = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth() + 1;

    // For date comparisons, create start/end of selected month
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0);

    let totalMonthlyExpenses = 0;

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Check if expense is valid for selected month
      if (startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      let appliesThisMonth = false;
      const frequency = expense.frequency.toLowerCase();

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(selectedMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'one-time') {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        appliesThisMonth = expenseMonth === selectedMonthNum && expenseYear === selectedYear;
      }

      if (appliesThisMonth) {
        totalMonthlyExpenses += amount;
      }
    });

    return totalMonthlyExpenses;
  }, [expenses, selectedMonth]);

  // Fetch expenses on component mount to enable month navigation
  useEffect(() => {
    setIsLoading(true);
    getUserExpenses()
      .then((data) => {
        setExpenses(data as Expense[]);
      })
      .catch((error) => {
        console.error("Failed to fetch expenses:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Use calculated amount if expenses loaded, otherwise use prop
  const displayAmount = expenses.length > 0 ? currentMonthExpenses : totalExpenses;

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); goToPreviousMonth(); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-sm font-medium text-muted-foreground min-w-[140px] text-center">
              {formatMonthDisplay(selectedMonth)}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); goToNextMonth(); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">
            ${displayAmount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Expected expenses for {formatMonthDisplay(selectedMonth)}
          </p>
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
