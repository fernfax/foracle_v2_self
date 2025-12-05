"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { getCategoryColor } from "@/lib/expense-calculator";

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

interface ExpenseBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
}

export function ExpenseBreakdownModal({
  open,
  onOpenChange,
  expenses,
}: ExpenseBreakdownModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Calculate breakdown details
  const breakdownDetails = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;

    const categoryBreakdown: Record<string, { amount: number; count: number; expenses: Expense[] }> = {};
    let totalMonthlyExpenses = 0;
    let activeExpensesCount = 0;

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      if (currentDate < startDate) return;
      if (endDate && currentDate > endDate) return;

      let appliesThisMonth = false;

      if (expense.frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (expense.frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(currentMonth);
        } catch {
          appliesThisMonth = false;
        }
      } else if (expense.frequency === 'one-time') {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        const currentYear = currentDate.getFullYear();
        appliesThisMonth = expenseMonth === currentMonth && expenseYear === currentYear;
      }

      if (appliesThisMonth) {
        totalMonthlyExpenses += amount;
        activeExpensesCount += 1;

        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = { amount: 0, count: 0, expenses: [] };
        }
        categoryBreakdown[expense.category].amount += amount;
        categoryBreakdown[expense.category].count += 1;
        categoryBreakdown[expense.category].expenses.push(expense);
      }
    });

    // Convert category breakdown to sorted array
    const categoriesArray = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalMonthlyExpenses > 0 ? (data.amount / totalMonthlyExpenses) * 100 : 0,
        avgPerExpense: data.count > 0 ? data.amount / data.count : 0,
        color: getCategoryColor(category),
        expenses: data.expenses,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = categoriesArray[0] || null;

    return {
      categories: categoriesArray,
      totalMonthlyExpenses,
      activeExpensesCount,
      topCategory,
    };
  }, [expenses]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (expandedCategories.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Expense Breakdown</DialogTitle>
          <DialogDescription>
            Detailed breakdown of your monthly expenses by category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total Monthly</p>
              <p className="text-2xl font-bold">${breakdownDetails.totalMonthlyExpenses.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Expenses</p>
              <p className="text-2xl font-bold">{breakdownDetails.activeExpensesCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{breakdownDetails.categories.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Category</p>
              <p className="text-xl font-bold">{breakdownDetails.topCategory?.category || 'N/A'}</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          {breakdownDetails.categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Enhanced Category List with Individual Expenses */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {breakdownDetails.categories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.category);

                  return (
                    <div key={cat.category} className="border rounded-lg overflow-hidden bg-background">
                      {/* Category Header - Clickable */}
                      <div
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(cat.category)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-semibold truncate">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-bold">${cat.amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                          <span>{cat.count} expense{cat.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Individual Expenses - Expandable */}
                      {isExpanded && cat.expenses.length > 0 && (
                        <div className="border-t bg-muted/20">
                          {cat.expenses.map((expense) => (
                            <div key={expense.id} className="px-3 py-2 border-b last:border-b-0 hover:bg-muted/30">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium truncate">{expense.name}</span>
                                <span className="text-xs font-semibold">${parseFloat(expense.amount).toLocaleString()}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {expense.frequency}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right: Larger Interactive Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={breakdownDetails.categories.map((cat) => ({
                        name: cat.category,
                        value: cat.amount,
                        color: cat.color,
                        percentage: cat.percentage,
                        count: cat.count,
                        avgPerExpense: cat.avgPerExpense,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (percent < 0.08) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-sm font-bold"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {breakdownDetails.categories.map((cat, index) => (
                        <Cell key={`cell-${index}`} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-bold mb-2">{data.name}</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="font-semibold">${data.value.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Percentage:</span>
                                  <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span className="font-semibold">{data.count}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Average:</span>
                                  <span className="font-semibold">${data.avgPerExpense.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expenses found for the current month.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
