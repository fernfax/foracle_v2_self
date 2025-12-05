"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
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

  // Fetch expenses when modal opens
  useEffect(() => {
    if (isModalOpen && expenses.length === 0) {
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
    }
  }, [isModalOpen, expenses.length]);

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsModalOpen(true)}
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
          <div className="text-3xl font-semibold tabular-nums">
            ${totalExpenses.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center text-xs font-medium text-red-600 dark:text-red-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              +5.2%
            </span>
            <span className="text-xs text-muted-foreground">
              from last month
            </span>
          </div>
        </CardContent>
      </Card>

      <ExpenseBreakdownModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expenses={expenses}
        currentMonthTotal={totalExpenses}
      />
    </>
  );
}
